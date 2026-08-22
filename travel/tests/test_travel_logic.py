"""
Tests for the GlobeTrotter travel logic.
Author: Margish

Run with:  python manage.py test travel

These cover the parts that are easy to get quietly wrong - stop ordering under
the (trip, order) unique constraint, date validation, the budget arithmetic and
the JSON API contract the front-end depends on.
"""

import json
from datetime import date, time, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import Client, TestCase
from django.urls import reverse

from travel.models import Activity, ActivityType, City, Expense, Trip, TripActivity, TripStop
from travel.services import (
    ActivityService, BudgetService, CityService, ItineraryError, ItineraryService,
)


def make_city(name, country='Testland', **kwargs):
    defaults = {
        'cost_index': 3,
        'popularity': 50,
        'avg_hotel_cost': Decimal('100.00'),
        'avg_meal_cost': Decimal('10.00'),
        'avg_transport_cost': Decimal('5.00'),
    }
    defaults.update(kwargs)
    return City.objects.create(name=name, country=country, **defaults)


class TravelTestBase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('margish', password='test12345')
        self.other = User.objects.create_user('someone-else', password='test12345')

        self.sightseeing = ActivityType.objects.create(name='sightseeing', icon='fa-camera')
        self.food = ActivityType.objects.create(name='food', icon='fa-utensils')

        self.goa = make_city('Goa', 'India', cost_index=2, popularity=87,
                             avg_meal_cost=Decimal('9.00'))
        self.mumbai = make_city('Mumbai', 'India', cost_index=2, popularity=79,
                                avg_meal_cost=Decimal('8.00'))
        self.paris = make_city('Paris', 'France', cost_index=4, popularity=98,
                               avg_meal_cost=Decimal('25.00'))

        self.beach = Activity.objects.create(
            name='Beach Day', city=self.goa, activity_type=self.sightseeing,
            cost=Decimal('0.00'), duration_hours=Decimal('4.0'), rating=Decimal('4.4'),
            popularity=90,
        )
        self.cruise = Activity.objects.create(
            name='Sunset Cruise', city=self.goa, activity_type=self.sightseeing,
            cost=Decimal('12.00'), duration_hours=Decimal('1.5'), rating=Decimal('4.3'),
            popularity=82,
        )
        self.food_tour = Activity.objects.create(
            name='Street Food Tour', city=self.mumbai, activity_type=self.food,
            cost=Decimal('25.00'), duration_hours=Decimal('3.0'), rating=Decimal('4.8'),
            popularity=95,
        )

        self.start = date(2026, 10, 20)
        self.trip = ItineraryService.create_trip(
            user=self.user, name='Goa Adventure',
            start_date=self.start, end_date=self.start + timedelta(days=8),
            budget=Decimal('2500.00'), travelers=2,
        )


# ---------------------------------------------------------------------------
# City + activity search
# ---------------------------------------------------------------------------

class CitySearchTests(TravelTestBase):
    def test_search_matches_name_and_country(self):
        self.assertEqual([c.name for c in CityService.search_cities(query='goa')], ['Goa'])
        names = {c.name for c in CityService.search_cities(query='india')}
        self.assertEqual(names, {'Goa', 'Mumbai'})

    def test_country_filter_is_case_insensitive(self):
        self.assertEqual(CityService.search_cities(country='INDIA').count(), 2)

    def test_cost_index_bounds(self):
        cheap = CityService.search_cities(max_cost=2)
        self.assertNotIn('Paris', [c.name for c in cheap])

    def test_default_order_is_popularity_desc(self):
        self.assertEqual(CityService.search_cities()[0].name, 'Paris')

    def test_order_by_cost_low(self):
        self.assertLessEqual(
            CityService.search_cities(order_by='cost_low')[0].cost_index, 2
        )

    def test_countries_are_distinct_and_sorted(self):
        self.assertEqual(CityService.get_countries(), ['France', 'India'])

    def test_daily_budget_estimate(self):
        # hotel 100 + (meal 9 x 3) + transport 5
        self.assertEqual(self.goa.get_daily_budget_estimate(), Decimal('132.00'))


class ActivitySearchTests(TravelTestBase):
    def test_filter_by_city(self):
        results = ActivityService.search_activities(city_id=self.goa.id)
        self.assertEqual({a.name for a in results}, {'Beach Day', 'Sunset Cruise'})

    def test_filter_by_type(self):
        results = ActivityService.search_activities(activity_type='food')
        self.assertEqual([a.name for a in results], ['Street Food Tour'])

    def test_filter_by_max_cost_and_duration(self):
        self.assertEqual(
            [a.name for a in ActivityService.search_activities(max_cost=0)], ['Beach Day']
        )
        self.assertEqual(
            [a.name for a in ActivityService.search_activities(max_duration=2)],
            ['Sunset Cruise'],
        )

    def test_query_matches_city_name(self):
        results = ActivityService.search_activities(query='mumbai')
        self.assertEqual([a.name for a in results], ['Street Food Tour'])

    def test_free_activities(self):
        self.assertEqual([a.name for a in ActivityService.get_free_activities()], ['Beach Day'])

    def test_type_counts(self):
        counts = {t.name: t.total for t in ActivityService.get_activity_type_counts()}
        self.assertEqual(counts, {'sightseeing': 2, 'food': 1})


# ---------------------------------------------------------------------------
# Itinerary: stops
# ---------------------------------------------------------------------------

class StopManagementTests(TravelTestBase):
    def add(self, city, arrival_offset, nights, **kwargs):
        arrival = self.start + timedelta(days=arrival_offset)
        return ItineraryService.add_stop_to_trip(
            self.trip, city_id=city.id, arrival_date=arrival,
            departure_date=arrival + timedelta(days=nights), **kwargs
        )

    def test_stops_auto_append_in_order(self):
        a = self.add(self.mumbai, 0, 2)
        b = self.add(self.goa, 2, 3)
        self.assertEqual([a.order, b.order], [1, 2])

    def test_inserting_at_a_position_shifts_the_rest(self):
        first = self.add(self.mumbai, 0, 2)
        last = self.add(self.paris, 4, 2)
        middle = ItineraryService.add_stop_to_trip(
            self.trip, city_id=self.goa.id, order=2,
            arrival_date=self.start + timedelta(days=2),
            departure_date=self.start + timedelta(days=4),
        )
        orders = dict(TripStop.objects.filter(trip=self.trip).values_list('city__name', 'order'))
        self.assertEqual(orders, {'Mumbai': 1, 'Goa': 2, 'Paris': 3})
        self.assertEqual(middle.order, 2)
        first.refresh_from_db(); last.refresh_from_db()
        self.assertEqual((first.order, last.order), (1, 3))

    def test_reorder_survives_the_unique_constraint(self):
        """Swapping two stops used to violate unique_together(trip, order)."""
        a = self.add(self.mumbai, 0, 2)
        b = self.add(self.goa, 2, 3)
        ItineraryService.reorder_stops(self.trip, [b.id, a.id])
        a.refresh_from_db(); b.refresh_from_db()
        self.assertEqual((b.order, a.order), (1, 2))

    def test_reorder_accepts_id_order_pairs(self):
        a = self.add(self.mumbai, 0, 2)
        b = self.add(self.goa, 2, 3)
        ItineraryService.reorder_stops(self.trip, [(a.id, 2), (b.id, 1)])
        a.refresh_from_db(); b.refresh_from_db()
        self.assertEqual((a.order, b.order), (2, 1))

    def test_move_stop_up_and_down(self):
        a = self.add(self.mumbai, 0, 2)
        b = self.add(self.goa, 2, 3)
        self.assertTrue(ItineraryService.move_stop(b.id, 'up'))
        b.refresh_from_db()
        self.assertEqual(b.order, 1)
        self.assertFalse(ItineraryService.move_stop(b.id, 'up'))
        a.refresh_from_db()
        self.assertEqual(a.order, 2)

    def test_move_stop_rejects_bad_direction(self):
        stop = self.add(self.goa, 0, 2)
        with self.assertRaises(ItineraryError):
            ItineraryService.move_stop(stop.id, 'sideways')

    def test_removing_a_stop_closes_the_gap(self):
        a = self.add(self.mumbai, 0, 1)
        b = self.add(self.goa, 1, 2)
        c = self.add(self.paris, 3, 2)
        ItineraryService.remove_stop(b.id)
        a.refresh_from_db(); c.refresh_from_db()
        self.assertEqual([a.order, c.order], [1, 2])

    def test_departure_before_arrival_is_rejected(self):
        with self.assertRaises(ItineraryError):
            ItineraryService.add_stop_to_trip(
                self.trip, city_id=self.goa.id,
                arrival_date=self.start + timedelta(days=3),
                departure_date=self.start + timedelta(days=1),
            )

    def test_stop_outside_the_trip_window_is_rejected(self):
        with self.assertRaises(ItineraryError):
            ItineraryService.add_stop_to_trip(
                self.trip, city_id=self.goa.id,
                arrival_date=self.start - timedelta(days=2),
                departure_date=self.start,
            )
        with self.assertRaises(ItineraryError):
            ItineraryService.add_stop_to_trip(
                self.trip, city_id=self.goa.id,
                arrival_date=self.start,
                departure_date=self.trip.end_date + timedelta(days=1),
            )

    def test_trip_end_before_start_is_rejected(self):
        with self.assertRaises(ItineraryError):
            ItineraryService.create_trip(
                self.user, 'Bad Trip', start_date=self.start,
                end_date=self.start - timedelta(days=1),
            )

    def test_auto_assign_spreads_dates_across_stops(self):
        for city in (self.mumbai, self.goa, self.paris):
            ItineraryService.add_stop_to_trip(self.trip, city_id=city.id)

        stops = ItineraryService.auto_assign_stop_dates(self.trip)

        self.assertEqual(stops[0].arrival_date, self.start)
        # Each stop begins where the previous one ended - no gaps, no overlaps.
        for earlier, later in zip(stops, stops[1:]):
            self.assertEqual(later.arrival_date, earlier.departure_date)
        self.assertLessEqual(stops[-1].departure_date, self.trip.end_date)
        # 8 nights over 3 stops -> 3 + 3 + 2
        self.assertEqual([s.get_nights() for s in stops], [3, 3, 2])

    def test_auto_assign_needs_a_start_date(self):
        trip = ItineraryService.create_trip(self.user, 'Undated')
        ItineraryService.add_stop_to_trip(trip, city_id=self.goa.id)
        with self.assertRaises(ItineraryError):
            ItineraryService.auto_assign_stop_dates(trip)


# ---------------------------------------------------------------------------
# Itinerary: activities
# ---------------------------------------------------------------------------

class TripActivityTests(TravelTestBase):
    def setUp(self):
        super().setUp()
        self.stop = ItineraryService.add_stop_to_trip(
            self.trip, city_id=self.goa.id,
            arrival_date=self.start, departure_date=self.start + timedelta(days=3),
        )

    def test_activity_defaults_to_the_stop_arrival_date(self):
        ta = ItineraryService.add_activity_to_stop(self.stop.id, self.beach.id)
        self.assertEqual(ta.scheduled_date, self.start)
        self.assertEqual(ta.day_order, 1)

    def test_day_order_increments_within_a_day(self):
        ItineraryService.add_activity_to_stop(self.stop.id, self.beach.id)
        second = ItineraryService.add_activity_to_stop(self.stop.id, self.cruise.id)
        self.assertEqual(second.day_order, 2)

    def test_activity_outside_the_stop_window_is_rejected(self):
        with self.assertRaises(ItineraryError):
            ItineraryService.add_activity_to_stop(
                self.stop.id, self.beach.id,
                scheduled_date=self.start + timedelta(days=5),
            )

    def test_reschedule_validates_the_new_date(self):
        ta = ItineraryService.add_activity_to_stop(self.stop.id, self.beach.id)
        ItineraryService.update_activity_schedule(
            ta.id, scheduled_date=self.start + timedelta(days=2), scheduled_time=time(9, 30)
        )
        ta.refresh_from_db()
        self.assertEqual(ta.scheduled_date, self.start + timedelta(days=2))
        self.assertEqual(ta.scheduled_time, time(9, 30))

        with self.assertRaises(ItineraryError):
            ItineraryService.update_activity_schedule(
                ta.id, scheduled_date=self.start + timedelta(days=9)
            )

    def test_end_time_uses_the_activity_duration(self):
        ta = ItineraryService.add_activity_to_stop(
            self.stop.id, self.cruise.id, scheduled_time=time(17, 30)
        )
        self.assertEqual(ta.get_end_time(), time(19, 0))

    def test_remove_activity(self):
        ta = ItineraryService.add_activity_to_stop(self.stop.id, self.beach.id)
        self.assertTrue(ItineraryService.remove_activity(ta.id))
        self.assertFalse(ItineraryService.remove_activity(ta.id))
        self.assertEqual(TripActivity.objects.count(), 0)

    def test_unscheduled_activities_are_listed(self):
        undated = ItineraryService.add_stop_to_trip(self.trip, city_id=self.mumbai.id)
        ItineraryService.add_activity_to_stop(undated.id, self.food_tour.id)
        unscheduled = ItineraryService.get_unscheduled_activities(self.trip.id)
        self.assertEqual([ta.activity.name for ta in unscheduled], ['Street Food Tour'])


# ---------------------------------------------------------------------------
# Itinerary: reading + duration
# ---------------------------------------------------------------------------

class ItineraryReadTests(TravelTestBase):
    def setUp(self):
        super().setUp()
        self.stop_a = ItineraryService.add_stop_to_trip(
            self.trip, city_id=self.mumbai.id,
            arrival_date=self.start, departure_date=self.start + timedelta(days=2),
        )
        self.stop_b = ItineraryService.add_stop_to_trip(
            self.trip, city_id=self.goa.id,
            arrival_date=self.start + timedelta(days=2),
            departure_date=self.start + timedelta(days=8),
        )
        ItineraryService.add_activity_to_stop(
            self.stop_a.id, self.food_tour.id, scheduled_time=time(19, 0)
        )
        ItineraryService.add_activity_to_stop(
            self.stop_b.id, self.cruise.id,
            scheduled_date=self.start + timedelta(days=3), scheduled_time=time(17, 30),
        )

    def test_calendar_covers_every_day_of_the_trip(self):
        days = ItineraryService.get_itinerary_by_day(self.trip.id)
        self.assertEqual(len(days), self.trip.get_duration_days())
        self.assertEqual(days[0]['day_number'], 1)
        self.assertEqual(days[0]['city'].name, 'Mumbai')

    def test_handover_day_belongs_to_the_arriving_stop(self):
        """Day 3 is Mumbai's departure and Goa's arrival - Goa should win."""
        days = ItineraryService.get_itinerary_by_day(self.trip.id)
        handover = days[2]
        self.assertEqual(handover['date'], self.start + timedelta(days=2))
        self.assertEqual(handover['city'].name, 'Goa')

    def test_last_day_is_still_covered(self):
        days = ItineraryService.get_itinerary_by_day(self.trip.id)
        self.assertEqual(days[-1]['date'], self.trip.end_date)
        self.assertIsNotNone(days[-1]['city'])

    def test_activities_land_on_their_day(self):
        days = ItineraryService.get_itinerary_by_day(self.trip.id)
        day_four = days[3]
        self.assertEqual(
            [ta.activity.name for ta in day_four['activities']], ['Sunset Cruise']
        )

    def test_calendar_is_empty_without_trip_dates(self):
        trip = ItineraryService.create_trip(self.user, 'No dates')
        self.assertEqual(ItineraryService.get_itinerary_by_day(trip.id), [])

    def test_itinerary_groups_activities_by_date(self):
        data = ItineraryService.get_trip_itinerary(self.trip.id)
        self.assertEqual(len(data['stops']), 2)
        goa = data['stops'][1]
        self.assertEqual(list(goa['activities_by_date']), [self.start + timedelta(days=3)])

    def test_duration_summary(self):
        summary = ItineraryService.get_itinerary_duration(self.trip.id)
        self.assertEqual(summary['trip_days'], 9)
        self.assertEqual(summary['stop_nights'], 8)
        self.assertEqual(summary['stop_days'], 9)
        self.assertEqual(summary['stop_count'], 2)
        self.assertTrue(summary['matches'])

    def test_validation_flags_a_stop_with_no_activities(self):
        bare = ItineraryService.add_stop_to_trip(self.trip, city_id=self.paris.id)
        issues = ItineraryService.validate_itinerary(self.trip.id)
        messages = [i['message'] for i in issues]
        self.assertIn('Paris has no dates set.', messages)
        self.assertIn('No activities planned in Paris.', messages)
        self.assertEqual(bare.get_days(), 1)

    def test_validation_is_quiet_on_a_healthy_trip(self):
        issues = ItineraryService.validate_itinerary(self.trip.id)
        self.assertEqual([i for i in issues if i['level'] == 'danger'], [])


# ---------------------------------------------------------------------------
# Budget
# ---------------------------------------------------------------------------

class BudgetTests(TravelTestBase):
    def setUp(self):
        super().setUp()
        # 2 travellers, Goa: 4 nights (5 days), hotel 55/night, flight 180.
        self.stop = ItineraryService.add_stop_to_trip(
            self.trip, city_id=self.goa.id,
            arrival_date=self.start, departure_date=self.start + timedelta(days=4),
            accommodation_name='Anjuna Beach House', accommodation_cost=Decimal('55.00'),
            transport_mode='Flight', transport_cost=Decimal('180.00'),
        )
        ItineraryService.add_activity_to_stop(self.stop.id, self.cruise.id)

    def test_nights_and_days_differ_by_one(self):
        self.assertEqual(self.stop.get_nights(), 4)
        self.assertEqual(self.stop.get_days(), 5)

    def test_accommodation_is_per_night_not_per_person(self):
        self.assertEqual(self.stop.get_accommodation_total(), Decimal('220.00'))

    def test_activities_scale_with_travellers(self):
        # cruise 12.00 x 2 travellers
        self.assertEqual(self.stop.get_activities_cost(), Decimal('24.00'))

    def test_meals_are_estimated_from_the_city(self):
        # 9.00 per meal x 3 meals x 5 days x 2 travellers
        self.assertEqual(self.stop.get_meals_estimate(), Decimal('270.00'))

    def test_stop_cost_is_the_sum_of_its_parts(self):
        self.assertEqual(self.stop.get_stop_cost(), Decimal('694.00'))

    def test_budget_breakdown_categories(self):
        budget = BudgetService.calculate_trip_budget(self.trip.id)
        self.assertEqual(budget['transport'], Decimal('180.00'))
        self.assertEqual(budget['accommodation'], Decimal('220.00'))
        self.assertEqual(budget['activities'], Decimal('24.00'))
        self.assertEqual(budget['food'], Decimal('270.00'))
        self.assertEqual(budget['total_cost'], Decimal('694.00'))

    def test_meals_can_be_excluded(self):
        budget = BudgetService.calculate_trip_budget(
            self.trip.id, include_estimated_meals=False
        )
        self.assertEqual(budget['food'], Decimal('0.00'))
        self.assertEqual(budget['total_cost'], Decimal('424.00'))

    def test_category_percentages_sum_to_a_hundred(self):
        budget = BudgetService.calculate_trip_budget(self.trip.id)
        total = sum(row['percentage'] for row in budget['categories'])
        self.assertAlmostEqual(total, 100.0, places=4)

    def test_daily_average_and_per_person(self):
        budget = BudgetService.calculate_trip_budget(self.trip.id)
        # 694.00 over a 9-day trip
        self.assertEqual(budget['daily_average'], Decimal('77.11'))
        self.assertEqual(budget['per_person'], Decimal('347.00'))

    def test_expenses_land_in_the_right_bucket(self):
        BudgetService.add_expense(self.trip.id, 'transport', 'Airport taxi', Decimal('30.00'))
        BudgetService.add_expense(self.trip.id, 'food', 'Beach shack dinner', Decimal('45.00'))
        BudgetService.add_expense(self.trip.id, 'insurance', 'Travel cover', Decimal('90.00'))

        budget = BudgetService.calculate_trip_budget(self.trip.id)
        self.assertEqual(budget['transport'], Decimal('210.00'))
        self.assertEqual(budget['food'], Decimal('315.00'))
        # 'insurance' has no bucket of its own, so it rolls into Other.
        self.assertEqual(budget['other'], Decimal('90.00'))
        self.assertEqual(budget['total_cost'], Decimal('859.00'))

    def test_expense_must_be_positive(self):
        with self.assertRaises(ItineraryError):
            BudgetService.add_expense(self.trip.id, 'other', 'Freebie', Decimal('0.00'))

    def test_delete_expense(self):
        expense = BudgetService.add_expense(
            self.trip.id, 'other', 'Mistake', Decimal('10.00')
        )
        self.assertTrue(BudgetService.delete_expense(expense.id))
        self.assertEqual(Expense.objects.count(), 0)

    def test_within_budget(self):
        warning = BudgetService.get_budget_warning(self.trip.id)
        self.assertFalse(warning['has_warning'])
        self.assertEqual(warning['severity'], 'success')

    def test_approaching_budget_warns(self):
        self.trip.budget = Decimal('800.00')
        self.trip.save()
        warning = BudgetService.get_budget_warning(self.trip.id)
        self.assertTrue(warning['has_warning'])
        self.assertEqual(warning['severity'], 'warning')

    def test_over_budget_is_flagged(self):
        self.trip.budget = Decimal('500.00')
        self.trip.save()
        warning = BudgetService.get_budget_warning(self.trip.id)
        self.assertEqual(warning['severity'], 'danger')

        budget = BudgetService.calculate_trip_budget(self.trip.id)
        self.assertTrue(budget['is_over_budget'])
        self.assertEqual(budget['over_by'], Decimal('194.00'))
        self.assertTrue(self.trip.is_over_budget())

    def test_no_budget_set_is_not_a_warning(self):
        self.trip.budget = Decimal('0.00')
        self.trip.save()
        warning = BudgetService.get_budget_warning(self.trip.id)
        self.assertFalse(warning['has_warning'])
        self.assertEqual(warning['message'], 'No budget set')

    def test_summary_matches_the_full_breakdown(self):
        summary = BudgetService.get_budget_summary(self.trip.id)
        self.assertEqual(summary['total'], Decimal('694.00'))
        self.assertEqual(summary['categories']['Food'], Decimal('270.00'))

    def test_estimator_scales_with_style_and_party_size(self):
        moderate = BudgetService.estimate_trip_cost([self.goa.id], days_per_city=3)
        luxury = BudgetService.estimate_trip_cost(
            [self.goa.id], days_per_city=3, travel_style='luxury'
        )
        pair = BudgetService.estimate_trip_cost(
            [self.goa.id], days_per_city=3, travelers=2
        )
        self.assertGreater(luxury['grand_total'], moderate['grand_total'])
        self.assertGreater(pair['grand_total'], moderate['grand_total'])
        self.assertEqual(moderate['total_days'], 3)

    def test_estimator_adds_an_inter_city_hop(self):
        one = BudgetService.estimate_trip_cost([self.goa.id])
        two = BudgetService.estimate_trip_cost([self.goa.id, self.mumbai.id])
        self.assertGreater(two['total_transport'], one['total_transport'])


# ---------------------------------------------------------------------------
# JSON API
# ---------------------------------------------------------------------------

class ApiTests(TravelTestBase):
    def setUp(self):
        super().setUp()
        self.client = Client()
        self.client.force_login(self.user)
        self.stop = ItineraryService.add_stop_to_trip(
            self.trip, city_id=self.goa.id,
            arrival_date=self.start, departure_date=self.start + timedelta(days=4),
            accommodation_cost=Decimal('55.00'), transport_cost=Decimal('180.00'),
        )

    def get(self, name, **kwargs):
        response = self.client.get(reverse(f'travel_api:{name}', kwargs=kwargs))
        return response, json.loads(response.content)

    def post(self, name, payload=None, **kwargs):
        response = self.client.post(
            reverse(f'travel_api:{name}', kwargs=kwargs),
            data=json.dumps(payload or {}), content_type='application/json',
        )
        return response, json.loads(response.content)

    def test_city_search_endpoint(self):
        response = self.client.get(reverse('travel_api:city-search'), {'q': 'goa'})
        data = json.loads(response.content)
        self.assertTrue(data['ok'])
        self.assertEqual(data['results'][0]['name'], 'Goa')
        self.assertEqual(data['results'][0]['cost_label'], 'Budget')

    def test_city_detail_includes_activities(self):
        _, data = self.get('city-detail', city_id=self.goa.id)
        self.assertEqual(data['city']['activity_count'], 2)
        self.assertEqual(len(data['activities']), 2)

    def test_activity_search_endpoint(self):
        response = self.client.get(
            reverse('travel_api:activity-search'), {'city': self.goa.id, 'max_cost': '0'}
        )
        data = json.loads(response.content)
        self.assertEqual([a['name'] for a in data['results']], ['Beach Day'])
        self.assertTrue(data['results'][0]['is_free'])

    def test_add_stop_endpoint(self):
        _, data = self.post('stop-add', {
            'city_id': self.mumbai.id,
            'arrival_date': (self.start + timedelta(days=4)).isoformat(),
            'departure_date': (self.start + timedelta(days=6)).isoformat(),
            'transport_mode': 'Train', 'transport_cost': '25.00',
        }, trip_id=self.trip.id)
        self.assertTrue(data['ok'])
        self.assertEqual(data['stop']['order'], 2)
        self.assertEqual(data['stop']['city']['name'], 'Mumbai')

    def test_add_stop_rejects_a_bad_date(self):
        response, data = self.post('stop-add', {
            'city_id': self.mumbai.id, 'arrival_date': 'not-a-date',
        }, trip_id=self.trip.id)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(data['ok'])

    def test_add_stop_rejects_a_date_outside_the_trip(self):
        response, data = self.post('stop-add', {
            'city_id': self.mumbai.id,
            'arrival_date': (self.start - timedelta(days=3)).isoformat(),
            'departure_date': self.start.isoformat(),
        }, trip_id=self.trip.id)
        self.assertEqual(response.status_code, 400)
        self.assertIn('before the trip starts', data['error'])

    def test_reorder_endpoint(self):
        second = ItineraryService.add_stop_to_trip(
            self.trip, city_id=self.mumbai.id,
            arrival_date=self.start + timedelta(days=4),
            departure_date=self.start + timedelta(days=6),
        )
        _, data = self.post(
            'stop-reorder', {'order': [second.id, self.stop.id]}, trip_id=self.trip.id
        )
        self.assertEqual([s['city']['name'] for s in data['stops']], ['Mumbai', 'Goa'])

    def test_reorder_rejects_foreign_stop_ids(self):
        foreign_trip = ItineraryService.create_trip(self.other, 'Not mine')
        foreign_stop = ItineraryService.add_stop_to_trip(
            foreign_trip, city_id=self.paris.id
        )
        response, data = self.post(
            'stop-reorder', {'order': [foreign_stop.id]}, trip_id=self.trip.id
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(data['ok'])

    def test_add_and_remove_an_activity(self):
        _, data = self.post(
            'trip-activity-add',
            {'activity_id': self.cruise.id, 'scheduled_time': '17:30'},
            stop_id=self.stop.id,
        )
        self.assertTrue(data['ok'])
        self.assertEqual(data['activity']['end_time'], '19:00')
        self.assertEqual(data['activity']['cost'], '24.00')

        ta_id = data['activity']['id']
        _, data = self.post('trip-activity-delete', trip_activity_id=ta_id)
        self.assertTrue(data['ok'])
        self.assertEqual(TripActivity.objects.count(), 0)

    def test_budget_endpoint_shape(self):
        _, data = self.get('trip-budget', trip_id=self.trip.id)
        budget = data['budget']
        self.assertEqual(budget['total_cost'], '670.00')
        labels = [row['label'] for row in budget['categories']]
        self.assertEqual(labels, ['Transport', 'Stay', 'Activities', 'Meals', 'Other'])
        self.assertEqual(data['warning']['severity'], 'success')

    def test_expense_endpoint_returns_a_refreshed_summary(self):
        _, data = self.post('expense-add', {
            'category': 'shopping', 'description': 'Souvenirs', 'amount': '60.00',
        }, trip_id=self.trip.id)
        self.assertEqual(data['summary']['total_cost'], '730.00')

        _, data = self.post('expense-delete', expense_id=data['expense']['id'])
        self.assertEqual(data['summary']['total_cost'], '670.00')

    def test_calendar_endpoint(self):
        ItineraryService.add_activity_to_stop(
            self.stop.id, self.cruise.id, scheduled_time=time(17, 30)
        )
        _, data = self.get('trip-calendar', trip_id=self.trip.id)
        self.assertEqual(len(data['days']), 9)
        self.assertEqual(data['days'][0]['activities'][0]['scheduled_time'], '17:30')
        self.assertEqual(data['days'][0]['day_cost'], '24.00')

    def test_estimate_endpoint_is_public(self):
        anon = Client()
        response = anon.get(
            reverse('travel_api:cost-estimate'),
            {'cities': f'{self.goa.id},{self.mumbai.id}', 'days': 3, 'travelers': 2},
        )
        data = json.loads(response.content)
        self.assertTrue(data['ok'])
        self.assertEqual(data['estimate']['total_days'], 6)
        self.assertEqual(len(data['estimate']['cities']), 2)

    def test_another_users_trip_is_not_reachable(self):
        foreign = ItineraryService.create_trip(self.other, 'Private')
        response = self.client.get(
            reverse('travel_api:trip-budget', kwargs={'trip_id': foreign.id})
        )
        self.assertEqual(response.status_code, 404)

    def test_anonymous_users_are_redirected_to_login(self):
        anon = Client()
        response = anon.get(
            reverse('travel_api:trip-itinerary', kwargs={'trip_id': self.trip.id})
        )
        self.assertIn(response.status_code, (302, 401, 403))

    def test_get_only_endpoints_reject_post(self):
        response = self.client.post(reverse('travel_api:city-search'))
        self.assertEqual(response.status_code, 405)


# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------

class SeedDataTests(TestCase):
    def test_seeder_is_idempotent_and_builds_the_demo_trip(self):
        from travel.seed_data import seed_data, seed_demo_trip

        first = seed_data()
        second = seed_data()
        self.assertEqual(first, second)
        self.assertGreaterEqual(first['cities'], 25)
        self.assertGreaterEqual(first['activities'], 130)

        # Every seeded city should be usable in the demo - none left empty.
        empty = City.objects.filter(activities__isnull=True)
        self.assertEqual(list(empty), [])

        trip = seed_demo_trip()
        self.assertEqual(trip.stops.count(), 3)
        self.assertEqual(
            [s.city.name for s in trip.stops.order_by('order')],
            ['Mumbai', 'Lonavala', 'Goa'],
        )
        self.assertEqual(TripActivity.objects.filter(trip_stop__trip=trip).count(), 8)
        self.assertGreater(trip.get_total_cost(), 0)

        # Re-running replaces the trip rather than duplicating it.
        seed_demo_trip()
        self.assertEqual(Trip.objects.filter(name='Goa Adventure').count(), 1)

    def test_demo_trip_has_no_validation_errors(self):
        from travel.seed_data import seed_data, seed_demo_trip

        seed_data()
        trip = seed_demo_trip()
        issues = ItineraryService.validate_itinerary(trip.id)
        self.assertEqual([i for i in issues if i['level'] == 'danger'], [])
