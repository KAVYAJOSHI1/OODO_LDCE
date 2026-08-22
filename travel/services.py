"""
Travel Services - Business Logic for GlobeTrotter
Author: Margish

Contains:
- City search and filter logic          (CityService)
- Activity search and filter logic      (ActivityService)
- Itinerary management logic            (ItineraryService)
- Budget calculation logic              (BudgetService)

Everything in here is plain Python on top of the Django ORM. No view, no
template and no request object is imported, so these services can be called
from views, management commands, the shell or tests interchangeably.
"""

from django.db import transaction
from django.db.models import Q, Max, F, Count
from decimal import Decimal
from datetime import timedelta

import secrets

# A stop order can never legitimately reach this. Used to park rows out of the
# way while reshuffling, so the (trip, order) unique constraint never trips.
_ORDER_PARK_OFFSET = 100000


class ItineraryError(ValueError):
    """Raised when an itinerary operation would produce invalid data.

    Views can catch this and turn the message straight into a user-facing
    error without having to know anything about the internals.
    """


class CityService:
    """Service class for city-related operations"""

    @staticmethod
    def search_cities(query=None, country=None, min_cost=None, max_cost=None,
                      min_popularity=None, order_by=None, limit=20):
        """
        Search and filter cities

        Args:
            query: Search term for city name / country / description
            country: Filter by country (exact, case-insensitive)
            min_cost: Minimum cost index (1-5)
            max_cost: Maximum cost index (1-5)
            min_popularity: Minimum popularity score
            order_by: 'popularity' (default), 'name', 'cost_low' or 'cost_high'
            limit: Maximum results to return (None for no limit)

        Returns:
            QuerySet of City objects
        """
        from travel.models import City

        cities = City.objects.all()

        if query:
            cities = cities.filter(
                Q(name__icontains=query) |
                Q(country__icontains=query) |
                Q(description__icontains=query)
            )

        if country:
            cities = cities.filter(country__iexact=country)

        if min_cost is not None:
            cities = cities.filter(cost_index__gte=min_cost)

        if max_cost is not None:
            cities = cities.filter(cost_index__lte=max_cost)

        if min_popularity is not None:
            cities = cities.filter(popularity__gte=min_popularity)

        orderings = {
            'popularity': ['-popularity', 'name'],
            'name': ['name'],
            'cost_low': ['cost_index', '-popularity'],
            'cost_high': ['-cost_index', '-popularity'],
        }
        cities = cities.order_by(*orderings.get(order_by, orderings['popularity']))

        if limit:
            cities = cities[:limit]
        return cities

    @staticmethod
    def get_popular_cities(limit=10):
        """Get most popular cities"""
        from travel.models import City
        return City.objects.order_by('-popularity')[:limit]

    @staticmethod
    def get_budget_cities(max_cost_index=2, limit=10):
        """Get budget-friendly cities"""
        from travel.models import City
        return City.objects.filter(
            cost_index__lte=max_cost_index
        ).order_by('cost_index', '-popularity')[:limit]

    @staticmethod
    def get_cities_by_country():
        """Get cities grouped by country -> {country: [City, ...]}"""
        from travel.models import City

        grouped = {}
        for city in City.objects.all().order_by('country', 'name'):
            grouped.setdefault(city.country, []).append(city)
        return grouped

    @staticmethod
    def get_countries():
        """Distinct country list, for populating a filter dropdown"""
        from travel.models import City
        return list(
            City.objects.values_list('country', flat=True).distinct().order_by('country')
        )

    @staticmethod
    def get_city_with_activities(city_id):
        """Get city with all its activities prefetched"""
        from travel.models import City
        return City.objects.prefetch_related('activities__activity_type').get(id=city_id)


class ActivityService:
    """Service class for activity-related operations"""

    @staticmethod
    def search_activities(query=None, city_id=None, activity_type=None,
                          min_cost=None, max_cost=None, max_duration=None,
                          min_rating=None, order_by=None, limit=50):
        """
        Search and filter activities

        Args:
            query: Search term for activity name/description
            city_id: Filter by city
            activity_type: Filter by activity type name (e.g. 'food')
            min_cost: Minimum activity cost
            max_cost: Maximum activity cost
            max_duration: Maximum duration in hours
            min_rating: Minimum rating (0-5)
            order_by: 'popularity' (default), 'name', 'rating',
                      'cost_low', 'cost_high' or 'duration'
            limit: Maximum results to return (None for no limit)

        Returns:
            QuerySet of Activity objects
        """
        from travel.models import Activity

        activities = Activity.objects.select_related('city', 'activity_type')

        if query:
            activities = activities.filter(
                Q(name__icontains=query) |
                Q(description__icontains=query) |
                Q(city__name__icontains=query)
            )

        if city_id:
            activities = activities.filter(city_id=city_id)

        if activity_type:
            activities = activities.filter(activity_type__name=activity_type)

        if min_cost is not None:
            activities = activities.filter(cost__gte=min_cost)

        if max_cost is not None:
            activities = activities.filter(cost__lte=max_cost)

        if max_duration is not None:
            activities = activities.filter(duration_hours__lte=max_duration)

        if min_rating is not None:
            activities = activities.filter(rating__gte=min_rating)

        orderings = {
            'popularity': ['-popularity', '-rating', 'name'],
            'name': ['name'],
            'rating': ['-rating', '-popularity'],
            'cost_low': ['cost', '-rating'],
            'cost_high': ['-cost', '-rating'],
            'duration': ['duration_hours', '-rating'],
        }
        activities = activities.order_by(*orderings.get(order_by, orderings['popularity']))

        if limit:
            activities = activities[:limit]
        return activities

    @staticmethod
    def get_activities_for_city(city_id, activity_type=None):
        """Get all activities for a specific city"""
        from travel.models import Activity

        activities = Activity.objects.filter(city_id=city_id).select_related('activity_type')

        if activity_type:
            activities = activities.filter(activity_type__name=activity_type)

        return activities.order_by('-popularity', '-rating')

    @staticmethod
    def get_free_activities(city_id=None, limit=20):
        """Get free activities"""
        from travel.models import Activity

        activities = Activity.objects.filter(cost=0).select_related('city')

        if city_id:
            activities = activities.filter(city_id=city_id)

        return activities.order_by('-rating')[:limit]

    @staticmethod
    def get_top_rated_activities(city_id=None, limit=10):
        """Get highest rated activities"""
        from travel.models import Activity

        activities = Activity.objects.select_related('city')

        if city_id:
            activities = activities.filter(city_id=city_id)

        return activities.order_by('-rating', '-popularity')[:limit]

    @staticmethod
    def get_activity_types():
        """Get all activity types"""
        from travel.models import ActivityType
        return ActivityType.objects.all()

    @staticmethod
    def get_activity_type_counts(city_id=None):
        """Activity types with how many activities each has.

        Handy for rendering category filter chips with a count badge.
        """
        from travel.models import ActivityType

        types = ActivityType.objects.all()
        if city_id:
            types = types.annotate(
                total=Count('activities', filter=Q(activities__city_id=city_id))
            )
        else:
            types = types.annotate(total=Count('activities'))
        return types.order_by('-total')


class ItineraryService:
    """Service class for itinerary management"""

    # ------------------------------------------------------------------
    # Trips
    # ------------------------------------------------------------------

    @staticmethod
    @transaction.atomic
    def create_trip(user, name, description=None, start_date=None, end_date=None,
                    budget=0, currency='USD', travelers=1):
        """Create a new trip"""
        from travel.models import Trip

        if start_date and end_date and end_date < start_date:
            raise ItineraryError("Trip end date cannot be before the start date.")

        return Trip.objects.create(
            user=user,
            name=name,
            description=description,
            start_date=start_date,
            end_date=end_date,
            budget=budget or 0,
            currency=currency,
            travelers=max(1, int(travelers or 1)),
            share_token=secrets.token_urlsafe(32),
        )

    # ------------------------------------------------------------------
    # Stops
    # ------------------------------------------------------------------

    @staticmethod
    @transaction.atomic
    def add_stop_to_trip(trip, city_id, order=None, arrival_date=None,
                         departure_date=None, accommodation_name=None,
                         accommodation_cost=0, transport_mode=None, transport_cost=0,
                         notes=None):
        """
        Add a city/stop to a trip itinerary.

        Args:
            trip: Trip object or trip_id
            city_id: ID of the city to add
            order: Position in itinerary (appended to the end if None)
            arrival_date: Date arriving at this stop
            departure_date: Date leaving this stop
            accommodation_name: Name of hotel/accommodation
            accommodation_cost: Cost per night
            transport_mode: How the traveller reaches this stop
            transport_cost: Cost of transport to this stop
            notes: Free-text notes

        Returns:
            TripStop object

        Raises:
            ItineraryError if the dates are inconsistent or fall outside the trip.
        """
        from travel.models import Trip, TripStop, City

        if isinstance(trip, int):
            trip = Trip.objects.get(id=trip)

        city = City.objects.get(id=city_id)

        ItineraryService._validate_stop_dates(trip, arrival_date, departure_date)

        if order is None:
            max_order = trip.stops.aggregate(m=Max('order'))['m']
            order = (max_order or 0) + 1
        else:
            # Make room at the requested position instead of colliding with it.
            ItineraryService._shift_orders_from(trip, order)

        return TripStop.objects.create(
            trip=trip,
            city=city,
            order=order,
            arrival_date=arrival_date,
            departure_date=departure_date,
            accommodation_name=accommodation_name,
            accommodation_cost_per_night=accommodation_cost or 0,
            transport_mode=transport_mode,
            transport_cost=transport_cost or 0,
            notes=notes,
        )

    @staticmethod
    @transaction.atomic
    def update_stop(stop_id, **fields):
        """Update editable fields on a stop.

        Only whitelisted fields are accepted so a view can hand user input
        straight through without risking an unexpected column being written.
        """
        from travel.models import TripStop

        allowed = {
            'arrival_date', 'departure_date', 'accommodation_name',
            'accommodation_cost_per_night', 'transport_mode', 'transport_cost',
            'notes',
        }
        stop = TripStop.objects.select_related('trip').get(id=stop_id)

        for key, value in fields.items():
            if key in allowed:
                setattr(stop, key, value)

        ItineraryService._validate_stop_dates(stop.trip, stop.arrival_date, stop.departure_date)
        stop.save()
        return stop

    @staticmethod
    @transaction.atomic
    def reorder_stops(trip, stop_order_list):
        """
        Reorder stops in a trip.

        Args:
            trip: Trip object or trip_id
            stop_order_list: iterable of (stop_id, new_order) pairs, or a plain
                list of stop_ids in their new order.

        The rows are parked at a high offset first, because (trip, order) is
        unique - writing the new orders directly would collide as soon as two
        stops swap places.
        """
        from travel.models import Trip, TripStop

        if isinstance(trip, int):
            trip = Trip.objects.get(id=trip)

        pairs = list(stop_order_list)
        if pairs and not isinstance(pairs[0], (tuple, list)):
            # Plain list of ids - position in the list is the new order.
            pairs = [(stop_id, index + 1) for index, stop_id in enumerate(pairs)]

        ids = [int(stop_id) for stop_id, _ in pairs]

        # Phase 1: park every affected row out of the unique range.
        TripStop.objects.filter(trip=trip, id__in=ids).update(
            order=F('order') + _ORDER_PARK_OFFSET
        )

        # Phase 2: write the real orders one row at a time.
        for stop_id, new_order in pairs:
            TripStop.objects.filter(id=stop_id, trip=trip).update(order=new_order)

        return ItineraryService._normalise_order(trip)

    @staticmethod
    @transaction.atomic
    def move_stop(stop_id, direction):
        """Move a single stop one position up or down.

        Args:
            stop_id: TripStop id
            direction: 'up' or 'down'

        Returns:
            True if the stop moved, False if it was already at the end.
        """
        from travel.models import TripStop

        stop = TripStop.objects.select_related('trip').get(id=stop_id)
        trip = stop.trip

        if direction == 'up':
            neighbour = trip.stops.filter(order__lt=stop.order).order_by('-order').first()
        elif direction == 'down':
            neighbour = trip.stops.filter(order__gt=stop.order).order_by('order').first()
        else:
            raise ItineraryError("Direction must be 'up' or 'down'.")

        if neighbour is None:
            return False

        ItineraryService.reorder_stops(
            trip, [(stop.id, neighbour.order), (neighbour.id, stop.order)]
        )
        return True

    @staticmethod
    @transaction.atomic
    def remove_stop(stop_id):
        """Remove a stop from a trip and close the gap in the ordering"""
        from travel.models import TripStop

        stop = TripStop.objects.select_related('trip').get(id=stop_id)
        trip = stop.trip
        stop.delete()
        return ItineraryService._normalise_order(trip)

    @staticmethod
    @transaction.atomic
    def auto_assign_stop_dates(trip, nights_per_stop=None):
        """Spread the trip's date range evenly across its stops.

        Saves the user from typing arrival/departure dates for every city. Any
        stop that already has both dates is left alone unless nights_per_stop
        is given, in which case every stop is recalculated.

        Args:
            trip: Trip object or trip_id
            nights_per_stop: force this many nights at each stop; when None the
                trip duration is divided evenly between the stops.

        Returns:
            List of updated TripStop objects.
        """
        from travel.models import Trip

        if isinstance(trip, int):
            trip = Trip.objects.get(id=trip)

        stops = list(trip.stops.order_by('order'))
        if not stops:
            return []
        if not trip.start_date:
            raise ItineraryError("Set the trip start date before auto-assigning stop dates.")

        if nights_per_stop is None:
            if not trip.end_date:
                raise ItineraryError("Set the trip end date before auto-assigning stop dates.")
            total_nights = max(len(stops), (trip.end_date - trip.start_date).days)
            base, extra = divmod(total_nights, len(stops))
            allocation = [base + (1 if i < extra else 0) for i in range(len(stops))]
        else:
            allocation = [int(nights_per_stop)] * len(stops)

        cursor = trip.start_date
        for stop, nights in zip(stops, allocation):
            stop.arrival_date = cursor
            stop.departure_date = cursor + timedelta(days=max(1, nights))
            stop.save(update_fields=['arrival_date', 'departure_date'])
            cursor = stop.departure_date

        # Stretch the trip end date if the allocation overran it.
        if trip.end_date is None or cursor > trip.end_date:
            trip.end_date = cursor
            trip.save(update_fields=['end_date'])

        return stops

    # ------------------------------------------------------------------
    # Activities inside the itinerary
    # ------------------------------------------------------------------

    @staticmethod
    @transaction.atomic
    def add_activity_to_stop(trip_stop_id, activity_id, scheduled_date=None,
                             scheduled_time=None, day_order=None, notes=None):
        """
        Add an activity to a trip stop.

        Args:
            trip_stop_id: ID of the TripStop
            activity_id: ID of the Activity to add
            scheduled_date: Date for this activity (defaults to the stop arrival)
            scheduled_time: Time for this activity
            day_order: Order within the day (appended if None)
            notes: Optional notes

        Returns:
            TripActivity object

        Raises:
            ItineraryError if the date falls outside the stop's window.
        """
        from travel.models import TripStop, Activity, TripActivity

        trip_stop = TripStop.objects.select_related('trip', 'city').get(id=trip_stop_id)
        activity = Activity.objects.get(id=activity_id)

        if scheduled_date is None:
            scheduled_date = trip_stop.arrival_date

        if scheduled_date and trip_stop.arrival_date and trip_stop.departure_date:
            if not (trip_stop.arrival_date <= scheduled_date <= trip_stop.departure_date):
                raise ItineraryError(
                    f"{scheduled_date} is outside the {trip_stop.city.name} stop "
                    f"({trip_stop.arrival_date} to {trip_stop.departure_date})."
                )

        if day_order is None:
            max_order = trip_stop.trip_activities.filter(
                scheduled_date=scheduled_date
            ).aggregate(m=Max('day_order'))['m']
            day_order = (max_order or 0) + 1

        return TripActivity.objects.create(
            trip_stop=trip_stop,
            activity=activity,
            scheduled_date=scheduled_date,
            scheduled_time=scheduled_time,
            day_order=day_order,
            notes=notes,
        )

    @staticmethod
    @transaction.atomic
    def update_activity_schedule(trip_activity_id, scheduled_date=None,
                                 scheduled_time=None, day_order=None, notes=None):
        """Reschedule an already-added activity. Only the given fields change."""
        from travel.models import TripActivity

        ta = TripActivity.objects.select_related('trip_stop__city').get(id=trip_activity_id)
        stop = ta.trip_stop

        if scheduled_date is not None:
            if stop.arrival_date and stop.departure_date:
                if not (stop.arrival_date <= scheduled_date <= stop.departure_date):
                    raise ItineraryError(
                        f"{scheduled_date} is outside the {stop.city.name} stop "
                        f"({stop.arrival_date} to {stop.departure_date})."
                    )
            ta.scheduled_date = scheduled_date
        if scheduled_time is not None:
            ta.scheduled_time = scheduled_time
        if day_order is not None:
            ta.day_order = day_order
        if notes is not None:
            ta.notes = notes

        ta.save()
        return ta

    @staticmethod
    @transaction.atomic
    def remove_activity(trip_activity_id):
        """Remove an activity from a trip stop. Returns True if a row was deleted."""
        from travel.models import TripActivity
        deleted, _ = TripActivity.objects.filter(id=trip_activity_id).delete()
        return bool(deleted)

    # ------------------------------------------------------------------
    # Reading the itinerary
    # ------------------------------------------------------------------

    @staticmethod
    def get_trip_itinerary(trip_id):
        """
        Get complete trip itinerary with all stops and activities.

        Returns:
            Dict with trip details, stops, and activities organised by day.
        """
        from travel.models import Trip

        trip = Trip.objects.prefetch_related(
            'stops__city',
            'stops__trip_activities__activity__activity_type',
            'expenses',
        ).get(id=trip_id)

        itinerary = {
            'trip': trip,
            'stops': [],
            'total_days': trip.get_duration_days(),
            'total_cost': trip.get_total_cost(),
            'is_over_budget': trip.is_over_budget(),
        }

        for stop in trip.stops.all():
            activities = list(stop.trip_activities.all())

            by_date = {}
            for ta in activities:
                by_date.setdefault(ta.scheduled_date or 'unscheduled', []).append(ta)

            itinerary['stops'].append({
                'stop': stop,
                'city': stop.city,
                'nights': stop.get_nights(),
                'days': stop.get_days(),
                'activities': activities,
                'activities_by_date': by_date,
                'stop_cost': stop.get_stop_cost(),
            })

        return itinerary

    @staticmethod
    def get_itinerary_by_day(trip_id):
        """
        Get the itinerary organised by day, for the calendar/timeline view.

        Returns:
            List of dicts, one per day of the trip.
        """
        from travel.models import Trip, TripActivity

        trip = Trip.objects.prefetch_related('stops__city').get(id=trip_id)

        if not trip.start_date or not trip.end_date:
            return []

        stops = list(trip.stops.order_by('order'))

        days = []
        current_date = trip.start_date
        while current_date <= trip.end_date:
            current_stop = None
            for stop in stops:
                if not (stop.arrival_date and stop.departure_date):
                    continue
                # The departure day still belongs to this stop - the traveller
                # is there for part of it. The next stop's arrival wins when
                # both match, which is why the loop breaks on first hit.
                if stop.arrival_date <= current_date <= stop.departure_date:
                    if current_stop is None or stop.arrival_date == current_date:
                        current_stop = stop
                    if stop.arrival_date == current_date:
                        break

            day_activities = TripActivity.objects.filter(
                trip_stop__trip=trip,
                scheduled_date=current_date,
            ).select_related(
                'activity__activity_type', 'trip_stop__city'
            ).order_by('scheduled_time', 'day_order')

            days.append({
                'date': current_date,
                'day_number': (current_date - trip.start_date).days + 1,
                'stop': current_stop,
                'city': current_stop.city if current_stop else None,
                'activities': list(day_activities),
            })

            current_date += timedelta(days=1)

        return days

    @staticmethod
    def get_unscheduled_activities(trip_id):
        """Activities added to the trip but not yet given a date."""
        from travel.models import TripActivity
        return TripActivity.objects.filter(
            trip_stop__trip_id=trip_id, scheduled_date__isnull=True
        ).select_related('activity', 'trip_stop__city')

    @staticmethod
    def calculate_trip_duration(stops):
        """Total nights covered by a collection of stops"""
        min_date = max_date = None

        for stop in stops:
            if stop.arrival_date and (min_date is None or stop.arrival_date < min_date):
                min_date = stop.arrival_date
            if stop.departure_date and (max_date is None or stop.departure_date > max_date):
                max_date = stop.departure_date

        if min_date and max_date:
            return (max_date - min_date).days
        return 0

    @staticmethod
    def get_itinerary_duration(trip_id):
        """Duration summary for a trip, covering both the declared trip dates
        and what the stops actually add up to.

        Returns a dict the UI can render directly, including a `matches` flag
        so the builder can warn when the stops do not fill the trip.
        """
        from travel.models import Trip

        trip = Trip.objects.prefetch_related('stops').get(id=trip_id)
        stops = list(trip.stops.all())

        trip_days = trip.get_duration_days()
        stop_nights = ItineraryService.calculate_trip_duration(stops)
        stop_days = stop_nights + 1 if stop_nights else 0

        return {
            'trip_days': trip_days,
            'trip_nights': max(0, trip_days - 1),
            'stop_days': stop_days,
            'stop_nights': stop_nights,
            'stop_count': len(stops),
            'unscheduled_stops': sum(
                1 for s in stops if not (s.arrival_date and s.departure_date)
            ),
            'matches': trip_days == stop_days,
        }

    @staticmethod
    def validate_itinerary(trip_id):
        """Sanity-check a trip and return a list of human-readable issues.

        Nothing here blocks the user - it drives the warning banner on the
        itinerary builder so problems are visible before the demo.
        """
        from travel.models import Trip

        trip = Trip.objects.prefetch_related('stops__city', 'stops__trip_activities').get(id=trip_id)
        issues = []

        if not trip.start_date or not trip.end_date:
            issues.append({'level': 'warning', 'message': 'Trip has no start/end date set.'})
        elif trip.end_date < trip.start_date:
            issues.append({'level': 'danger', 'message': 'Trip end date is before the start date.'})

        stops = list(trip.stops.order_by('order'))
        if not stops:
            issues.append({'level': 'warning', 'message': 'No cities added to this trip yet.'})

        previous = None
        for stop in stops:
            label = stop.city.name

            if not stop.arrival_date or not stop.departure_date:
                issues.append({'level': 'warning', 'message': f'{label} has no dates set.'})
            else:
                if stop.departure_date < stop.arrival_date:
                    issues.append({
                        'level': 'danger',
                        'message': f'{label} departs before it arrives.',
                    })
                if trip.start_date and stop.arrival_date < trip.start_date:
                    issues.append({
                        'level': 'danger',
                        'message': f'{label} starts before the trip begins.',
                    })
                if trip.end_date and stop.departure_date > trip.end_date:
                    issues.append({
                        'level': 'danger',
                        'message': f'{label} ends after the trip finishes.',
                    })
                if previous and previous.departure_date and stop.arrival_date < previous.departure_date:
                    issues.append({
                        'level': 'danger',
                        'message': f'{label} overlaps with {previous.city.name}.',
                    })

            if not stop.trip_activities.exists():
                issues.append({'level': 'info', 'message': f'No activities planned in {label}.'})

            if stop.arrival_date and stop.departure_date:
                previous = stop

        return issues

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _validate_stop_dates(trip, arrival_date, departure_date):
        if arrival_date and departure_date and departure_date < arrival_date:
            raise ItineraryError("Departure date cannot be before the arrival date.")
        if trip.start_date and arrival_date and arrival_date < trip.start_date:
            raise ItineraryError(
                f"Arrival {arrival_date} is before the trip starts ({trip.start_date})."
            )
        if trip.end_date and departure_date and departure_date > trip.end_date:
            raise ItineraryError(
                f"Departure {departure_date} is after the trip ends ({trip.end_date})."
            )

    @staticmethod
    def _shift_orders_from(trip, order):
        """Push every stop at or after `order` one position back."""
        from travel.models import TripStop

        affected = list(
            trip.stops.filter(order__gte=order).order_by('-order').values_list('id', flat=True)
        )
        if not affected:
            return
        TripStop.objects.filter(id__in=affected).update(order=F('order') + _ORDER_PARK_OFFSET)
        for stop_id in affected:
            TripStop.objects.filter(id=stop_id).update(order=F('order') - _ORDER_PARK_OFFSET + 1)

    @staticmethod
    def _normalise_order(trip):
        """Renumber the stops 1..N with no gaps, preserving current sequence."""
        from travel.models import TripStop

        stops = list(trip.stops.order_by('order', 'arrival_date', 'id'))
        if not stops:
            return []

        ids = [s.id for s in stops]
        TripStop.objects.filter(id__in=ids).update(order=F('order') + _ORDER_PARK_OFFSET)
        for index, stop in enumerate(stops, start=1):
            TripStop.objects.filter(id=stop.id).update(order=index)
            stop.order = index
        return stops


class BudgetService:
    """Service class for budget calculations"""

    # Which budget bucket each Expense.category rolls up into.
    _EXPENSE_BUCKETS = {
        'transport': 'transport',
        'accommodation': 'accommodation',
        'food': 'food',
        'activities': 'activities',
    }

    @staticmethod
    def calculate_trip_budget(trip_id, include_estimated_meals=True):
        """
        Calculate the complete trip budget breakdown.

        Costs come from three places:
          * stops           - transport + accommodation
          * trip activities - the activity's own cost x travellers
          * meals           - estimated from the city's average meal cost
          * expenses        - anything the user logged by hand

        Args:
            trip_id: Trip ID
            include_estimated_meals: set False to count only logged food spend

        Returns:
            Dict with the full breakdown, ready for the budget page.
        """
        from travel.models import Trip

        trip = Trip.objects.prefetch_related(
            'stops__city',
            'stops__trip_activities__activity',
            'expenses',
        ).get(id=trip_id)

        budget = {
            'trip_id': trip_id,
            'trip': trip,
            'currency': trip.currency,
            'travelers': trip.travelers,
            'set_budget': trip.budget,

            # Category totals
            'transport': Decimal('0.00'),
            'accommodation': Decimal('0.00'),
            'activities': Decimal('0.00'),
            'food': Decimal('0.00'),
            'other': Decimal('0.00'),

            # Detailed breakdowns
            'transport_details': [],
            'accommodation_details': [],
            'activities_details': [],
            'meal_details': [],
            'expense_details': [],

            # Summary
            'total_cost': Decimal('0.00'),
            'daily_average': Decimal('0.00'),
            'per_person': Decimal('0.00'),
            'remaining': Decimal('0.00'),
            'is_over_budget': False,
            'over_by': Decimal('0.00'),
            'percentage_used': 0.0,
        }

        for stop in trip.stops.all():
            if stop.transport_cost > 0:
                budget['transport'] += stop.transport_cost
                budget['transport_details'].append({
                    'description': f'{stop.transport_mode or "Transport"} to {stop.city.name}',
                    'amount': stop.transport_cost,
                })

            acc_total = stop.get_accommodation_total()
            if acc_total > 0:
                budget['accommodation'] += acc_total
                budget['accommodation_details'].append({
                    'city': stop.city.name,
                    'name': stop.accommodation_name or 'Accommodation',
                    'nights': stop.get_nights(),
                    'per_night': stop.accommodation_cost_per_night,
                    'total': acc_total,
                })

            for ta in stop.trip_activities.all():
                cost = ta.get_cost()
                if cost > 0:
                    budget['activities'] += cost
                    budget['activities_details'].append({
                        'name': ta.activity.name,
                        'city': stop.city.name,
                        'date': ta.scheduled_date,
                        'amount': cost,
                    })

            if include_estimated_meals:
                meals = stop.get_meals_estimate()
                if meals > 0:
                    budget['food'] += meals
                    budget['meal_details'].append({
                        'city': stop.city.name,
                        'days': stop.get_days(),
                        'per_meal': stop.city.avg_meal_cost,
                        'travelers': trip.travelers,
                        'total': meals,
                        'estimated': True,
                    })

        for expense in trip.expenses.all():
            budget['expense_details'].append({
                'id': expense.id,
                'category': expense.category,
                'category_display': expense.get_category_display(),
                'description': expense.description,
                'date': expense.date,
                'amount': expense.amount,
            })
            bucket = BudgetService._EXPENSE_BUCKETS.get(expense.category, 'other')
            budget[bucket] += expense.amount

        budget['total_cost'] = (
            budget['transport'] +
            budget['accommodation'] +
            budget['activities'] +
            budget['food'] +
            budget['other']
        )

        days = trip.get_duration_days()
        if days > 0:
            budget['daily_average'] = (budget['total_cost'] / days).quantize(Decimal('0.01'))

        if trip.travelers > 0:
            budget['per_person'] = (
                budget['total_cost'] / trip.travelers
            ).quantize(Decimal('0.01'))

        if trip.budget and trip.budget > 0:
            budget['remaining'] = trip.budget - budget['total_cost']
            budget['is_over_budget'] = budget['remaining'] < 0
            budget['percentage_used'] = float((budget['total_cost'] / trip.budget) * 100)
            if budget['is_over_budget']:
                budget['over_by'] = abs(budget['remaining'])

        budget['categories'] = BudgetService._category_rows(budget)
        return budget

    @staticmethod
    def _category_rows(budget):
        """Turn the category totals into rows with a percentage, so the UI can
        render a breakdown bar without doing arithmetic in the template."""
        total = budget['total_cost']
        rows = []
        for key, label in (
            ('transport', 'Transport'),
            ('accommodation', 'Stay'),
            ('activities', 'Activities'),
            ('food', 'Meals'),
            ('other', 'Other'),
        ):
            amount = budget[key]
            rows.append({
                'key': key,
                'label': label,
                'amount': amount,
                'percentage': float(amount / total * 100) if total > 0 else 0.0,
            })
        return rows

    @staticmethod
    def estimate_trip_cost(city_ids, days_per_city=3, travel_style='moderate', travelers=1):
        """
        Estimate a trip cost before anything is planned.

        Args:
            city_ids: List of city IDs to visit
            days_per_city: Average days per city
            travel_style: 'budget', 'moderate' or 'luxury'
            travelers: Number of people

        Returns:
            Dict with the cost estimate.
        """
        from travel.models import City

        multipliers = {'budget': 0.7, 'moderate': 1.0, 'luxury': 1.8}
        multiplier = Decimal(str(multipliers.get(travel_style, 1.0)))
        travelers = max(1, int(travelers or 1))
        days_per_city = max(1, int(days_per_city or 1))

        cities = City.objects.filter(id__in=city_ids)

        estimate = {
            'cities': [],
            'travel_style': travel_style,
            'travelers': travelers,
            'total_days': 0,
            'total_accommodation': Decimal('0.00'),
            'total_food': Decimal('0.00'),
            'total_transport': Decimal('0.00'),
            'total_activities': Decimal('0.00'),
            'grand_total': Decimal('0.00'),
            'daily_average': Decimal('0.00'),
        }

        for city in cities:
            days = days_per_city
            daily_cost = city.get_daily_budget_estimate() * multiplier
            estimate['cities'].append({
                'city': city.name,
                'country': city.country,
                'days': days,
                'daily_estimate': daily_cost.quantize(Decimal('0.01')),
                'total_estimate': (daily_cost * days).quantize(Decimal('0.01')),
            })

            estimate['total_days'] += days
            estimate['total_accommodation'] += city.avg_hotel_cost * days * multiplier
            estimate['total_food'] += city.avg_meal_cost * 3 * days * multiplier * travelers
            estimate['total_transport'] += city.avg_transport_cost * days * multiplier * travelers

        # Rough inter-city hop cost.
        hops = max(0, len(estimate['cities']) - 1)
        estimate['total_transport'] += Decimal('100.00') * hops * travelers

        # Rough activity spend: two activities a day at ~30 each, per person.
        estimate['total_activities'] = (
            Decimal('60.00') * estimate['total_days'] * multiplier * travelers
        )

        estimate['grand_total'] = (
            estimate['total_accommodation'] +
            estimate['total_food'] +
            estimate['total_transport'] +
            estimate['total_activities']
        ).quantize(Decimal('0.01'))

        if estimate['total_days'] > 0:
            estimate['daily_average'] = (
                estimate['grand_total'] / estimate['total_days']
            ).quantize(Decimal('0.01'))

        for key in ('total_accommodation', 'total_food', 'total_transport', 'total_activities'):
            estimate[key] = estimate[key].quantize(Decimal('0.01'))

        return estimate

    @staticmethod
    @transaction.atomic
    def add_expense(trip_id, category, description, amount, date=None):
        """Add an expense to a trip"""
        from travel.models import Trip, Expense

        amount = Decimal(str(amount))
        if amount <= 0:
            raise ItineraryError("Expense amount must be greater than zero.")

        trip = Trip.objects.get(id=trip_id)
        return Expense.objects.create(
            trip=trip,
            category=category,
            description=description,
            amount=amount,
            date=date,
        )

    @staticmethod
    @transaction.atomic
    def delete_expense(expense_id):
        """Delete an expense. Returns True if a row was removed."""
        from travel.models import Expense
        deleted, _ = Expense.objects.filter(id=expense_id).delete()
        return bool(deleted)

    @staticmethod
    def get_budget_summary(trip_id):
        """Compact budget summary for the dashboard and trip cards"""
        budget = BudgetService.calculate_trip_budget(trip_id)

        return {
            'total': budget['total_cost'],
            'budget': budget['set_budget'],
            'remaining': budget['remaining'],
            'is_over': budget['is_over_budget'],
            'percentage': budget['percentage_used'],
            'daily_average': budget['daily_average'],
            'currency': budget['currency'],
            'categories': {
                'Transport': budget['transport'],
                'Accommodation': budget['accommodation'],
                'Activities': budget['activities'],
                'Food': budget['food'],
                'Other': budget['other'],
            },
        }

    @staticmethod
    def get_budget_warning(trip_id, threshold=0.8):
        """
        Check whether a trip is approaching or over budget.

        Args:
            trip_id: Trip ID
            threshold: Warning threshold as a fraction (default 80%)

        Returns:
            Dict with warning status, severity and a ready-to-show message.
        """
        from travel.models import Trip

        trip = Trip.objects.get(id=trip_id)

        if not trip.budget or trip.budget <= 0:
            return {
                'has_warning': False,
                'severity': 'info',
                'message': 'No budget set',
                'percentage': 0.0,
            }

        total = trip.get_total_cost()
        percentage = float((total / trip.budget) * 100)

        if total > trip.budget:
            return {
                'has_warning': True,
                'severity': 'danger',
                'message': f'Over budget by {trip.currency} {total - trip.budget:.2f}',
                'percentage': percentage,
            }

        if percentage >= threshold * 100:
            return {
                'has_warning': True,
                'severity': 'warning',
                'message': (
                    f'Budget {percentage:.0f}% used. '
                    f'{trip.currency} {trip.budget - total:.2f} remaining'
                ),
                'percentage': percentage,
            }

        return {
            'has_warning': False,
            'severity': 'success',
            'message': f'Within budget. {trip.currency} {trip.budget - total:.2f} remaining',
            'percentage': percentage,
        }
