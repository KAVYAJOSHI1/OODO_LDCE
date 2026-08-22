"""
Plain-dict serializers for GlobeTrotter travel data.
Author: Margish

No DRF - these are hand-written functions that turn model instances into
JSON-safe dicts. They are used by travel/api_views.py, but they are equally
useful for passing pre-shaped data into a Django template context.
"""

from decimal import Decimal


def _money(value):
    """Decimals are not JSON serialisable - render as a 2dp string."""
    if value is None:
        return None
    return str(Decimal(value).quantize(Decimal('0.01')))


def _date(value):
    return value.isoformat() if value else None


def _time(value):
    return value.strftime('%H:%M') if value else None


def city_to_dict(city, include_activity_count=False):
    """Serialize a City for search results and city cards."""
    data = {
        'id': city.id,
        'name': city.name,
        'country': city.country,
        'description': city.description or '',
        'cost_index': city.cost_index,
        'cost_label': COST_LABELS.get(city.cost_index, 'Moderate'),
        'popularity': city.popularity,
        'avg_hotel_cost': _money(city.avg_hotel_cost),
        'avg_meal_cost': _money(city.avg_meal_cost),
        'avg_transport_cost': _money(city.avg_transport_cost),
        'daily_estimate': _money(city.get_daily_budget_estimate()),
        'latitude': float(city.latitude) if city.latitude is not None else None,
        'longitude': float(city.longitude) if city.longitude is not None else None,
        'image_url': city.image_url or '',
    }
    if include_activity_count:
        data['activity_count'] = city.activities.count()
    return data


COST_LABELS = {
    1: 'Very cheap',
    2: 'Budget',
    3: 'Moderate',
    4: 'Expensive',
    5: 'Luxury',
}


def activity_to_dict(activity, include_city=True):
    """Serialize an Activity for the activity search / quick-add list."""
    data = {
        'id': activity.id,
        'name': activity.name,
        'description': activity.description or '',
        'type': activity.activity_type.name if activity.activity_type else None,
        'type_display': (
            activity.activity_type.get_name_display() if activity.activity_type else 'Other'
        ),
        'icon': activity.activity_type.icon if activity.activity_type else '',
        'cost': _money(activity.cost),
        'is_free': activity.cost == 0,
        'duration_hours': float(activity.duration_hours),
        'rating': float(activity.rating),
        'popularity': activity.popularity,
        'best_time': activity.best_time or '',
        'address': activity.address or '',
        'image_url': activity.image_url or '',
    }
    if include_city:
        data['city_id'] = activity.city_id
        data['city_name'] = activity.city.name
        data['country'] = activity.city.country
    return data


def trip_activity_to_dict(trip_activity):
    """Serialize a scheduled activity inside an itinerary."""
    end_time = trip_activity.get_end_time()
    return {
        'id': trip_activity.id,
        'trip_stop_id': trip_activity.trip_stop_id,
        'activity': activity_to_dict(trip_activity.activity, include_city=False),
        'scheduled_date': _date(trip_activity.scheduled_date),
        'scheduled_time': _time(trip_activity.scheduled_time),
        'end_time': end_time.strftime('%H:%M') if end_time else None,
        'day_order': trip_activity.day_order,
        'notes': trip_activity.notes or '',
        'is_completed': trip_activity.is_completed,
        'cost': _money(trip_activity.get_cost()),
    }


def stop_to_dict(stop, include_activities=True):
    """Serialize a TripStop for the itinerary builder."""
    data = {
        'id': stop.id,
        'trip_id': stop.trip_id,
        'order': stop.order,
        'city': city_to_dict(stop.city),
        'arrival_date': _date(stop.arrival_date),
        'departure_date': _date(stop.departure_date),
        'nights': stop.get_nights(),
        'days': stop.get_days(),
        'accommodation_name': stop.accommodation_name or '',
        'accommodation_cost_per_night': _money(stop.accommodation_cost_per_night),
        'accommodation_total': _money(stop.get_accommodation_total()),
        'transport_mode': stop.transport_mode or '',
        'transport_cost': _money(stop.transport_cost),
        'activities_cost': _money(stop.get_activities_cost()),
        'meals_estimate': _money(stop.get_meals_estimate()),
        'stop_cost': _money(stop.get_stop_cost()),
        'notes': stop.notes or '',
    }
    if include_activities:
        data['activities'] = [
            trip_activity_to_dict(ta) for ta in stop.trip_activities.all()
        ]
    return data


def trip_to_dict(trip, include_stops=False):
    """Serialize a Trip. Stops are opt-in because they are the expensive part."""
    data = {
        'id': trip.id,
        'name': trip.name,
        'description': trip.description or '',
        'start_date': _date(trip.start_date),
        'end_date': _date(trip.end_date),
        'duration_days': trip.get_duration_days(),
        'status': trip.status,
        'status_display': trip.get_status_display(),
        'budget': _money(trip.budget),
        'currency': trip.currency,
        'travelers': trip.travelers,
        'total_cost': _money(trip.get_total_cost()),
        'average_cost_per_day': _money(trip.get_average_cost_per_day()),
        'is_over_budget': trip.is_over_budget(),
        'budget_percentage': round(trip.get_budget_percentage(), 1),
        'is_public': trip.is_public,
        'share_token': trip.share_token or '',
        'cover_image_url': trip.cover_image_url or '',
    }
    if include_stops:
        data['stops'] = [stop_to_dict(stop) for stop in trip.stops.all()]
    return data


def itinerary_day_to_dict(day):
    """Serialize one entry from ItineraryService.get_itinerary_by_day()."""
    return {
        'date': _date(day['date']),
        'day_number': day['day_number'],
        'stop_id': day['stop'].id if day['stop'] else None,
        'city': day['city'].name if day['city'] else None,
        'country': day['city'].country if day['city'] else None,
        'activities': [trip_activity_to_dict(ta) for ta in day['activities']],
        'day_cost': _money(
            sum((ta.get_cost() for ta in day['activities']), Decimal('0.00'))
        ),
    }


def budget_to_dict(budget):
    """Serialize the dict returned by BudgetService.calculate_trip_budget()."""
    return {
        'trip_id': budget['trip_id'],
        'currency': budget['currency'],
        'travelers': budget['travelers'],
        'set_budget': _money(budget['set_budget']),
        'total_cost': _money(budget['total_cost']),
        'daily_average': _money(budget['daily_average']),
        'per_person': _money(budget['per_person']),
        'remaining': _money(budget['remaining']),
        'is_over_budget': budget['is_over_budget'],
        'over_by': _money(budget['over_by']),
        'percentage_used': round(budget['percentage_used'], 1),
        'categories': [
            {
                'key': row['key'],
                'label': row['label'],
                'amount': _money(row['amount']),
                'percentage': round(row['percentage'], 1),
            }
            for row in budget['categories']
        ],
        'transport_details': [
            {'description': d['description'], 'amount': _money(d['amount'])}
            for d in budget['transport_details']
        ],
        'accommodation_details': [
            {
                'city': d['city'],
                'name': d['name'],
                'nights': d['nights'],
                'per_night': _money(d['per_night']),
                'total': _money(d['total']),
            }
            for d in budget['accommodation_details']
        ],
        'activities_details': [
            {
                'name': d['name'],
                'city': d['city'],
                'date': _date(d['date']),
                'amount': _money(d['amount']),
            }
            for d in budget['activities_details']
        ],
        'meal_details': [
            {
                'city': d['city'],
                'days': d['days'],
                'per_meal': _money(d['per_meal']),
                'travelers': d['travelers'],
                'total': _money(d['total']),
                'estimated': d['estimated'],
            }
            for d in budget['meal_details']
        ],
        'expense_details': [
            {
                'id': d['id'],
                'category': d['category'],
                'category_display': d['category_display'],
                'description': d['description'],
                'date': _date(d['date']),
                'amount': _money(d['amount']),
            }
            for d in budget['expense_details']
        ],
    }


def estimate_to_dict(estimate):
    """Serialize BudgetService.estimate_trip_cost()."""
    return {
        'travel_style': estimate['travel_style'],
        'travelers': estimate['travelers'],
        'total_days': estimate['total_days'],
        'total_accommodation': _money(estimate['total_accommodation']),
        'total_food': _money(estimate['total_food']),
        'total_transport': _money(estimate['total_transport']),
        'total_activities': _money(estimate['total_activities']),
        'grand_total': _money(estimate['grand_total']),
        'daily_average': _money(estimate['daily_average']),
        'cities': [
            {
                'city': c['city'],
                'country': c['country'],
                'days': c['days'],
                'daily_estimate': _money(c['daily_estimate']),
                'total_estimate': _money(c['total_estimate']),
            }
            for c in estimate['cities']
        ],
    }
