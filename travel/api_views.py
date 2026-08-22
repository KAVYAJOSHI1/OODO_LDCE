"""
JSON endpoints over the travel logic.
Author: Margish

Deliberately kept in their own module (api_views.py / api_urls.py) rather than
travel/views.py so they can be dropped into the project without colliding with
the page views. Wire them up with a single line in config/urls.py:

    path('api/travel/', include('travel.api_urls')),

Every handler returns {"ok": true, ...} or {"ok": false, "error": "..."} with a
sensible status code, so the front-end can branch on `data.ok` alone.
"""

import json

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET, require_POST

from travel import serializers as S
from travel.models import (
    Activity, City, Expense, Trip, TripActivity, TripStop,
)
from travel.services import (
    ActivityService, BudgetService, CityService, ItineraryError, ItineraryService,
)


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------

def _ok(**payload):
    return JsonResponse({'ok': True, **payload})


def _fail(message, status=400):
    return JsonResponse({'ok': False, 'error': str(message)}, status=status)


def _body(request):
    """Read params from a JSON body, falling back to normal form POST."""
    if request.content_type and 'application/json' in request.content_type:
        try:
            return json.loads(request.body or b'{}')
        except json.JSONDecodeError:
            return {}
    return request.POST.dict()


def _int(value, default=None):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _decimal(value, default=None):
    """Parse a money value into a Decimal.

    Coercing here rather than leaving the raw string to the ORM matters: the
    instance returned by create() keeps whatever was assigned, so a string
    would blow up the cost arithmetic before it is ever read back.
    """
    from decimal import Decimal, InvalidOperation

    if value in (None, ''):
        return default
    try:
        return Decimal(str(value))
    except InvalidOperation:
        raise ItineraryError(f"'{value}' is not a valid amount.")


def _date(value):
    """Parse an ISO date string. Empty values become None."""
    from datetime import date, datetime

    if not value:
        return None
    if isinstance(value, date):
        return value
    try:
        return datetime.strptime(str(value)[:10], '%Y-%m-%d').date()
    except ValueError:
        raise ItineraryError(f"'{value}' is not a valid date (expected YYYY-MM-DD).")


def _time(value):
    from datetime import time as time_cls, datetime

    if not value:
        return None
    if isinstance(value, time_cls):
        return value
    for fmt in ('%H:%M', '%H:%M:%S'):
        try:
            return datetime.strptime(str(value), fmt).time()
        except ValueError:
            continue
    raise ItineraryError(f"'{value}' is not a valid time (expected HH:MM).")


def _owned_trip(request, trip_id):
    """Fetch a trip, 404-ing if it does not belong to the caller."""
    return get_object_or_404(Trip, id=trip_id, user=request.user)


def _owned_stop(request, stop_id):
    return get_object_or_404(TripStop, id=stop_id, trip__user=request.user)


def _owned_trip_activity(request, ta_id):
    return get_object_or_404(TripActivity, id=ta_id, trip_stop__trip__user=request.user)


def api(view):
    """Turn ItineraryError into a clean 400 instead of a 500."""
    from functools import wraps

    @wraps(view)
    def wrapper(request, *args, **kwargs):
        try:
            return view(request, *args, **kwargs)
        except ItineraryError as exc:
            return _fail(exc, status=400)
        except (City.DoesNotExist, Activity.DoesNotExist) as exc:
            return _fail(exc, status=404)

    return wrapper


# ---------------------------------------------------------------------------
# City data
# ---------------------------------------------------------------------------

@require_GET
@api
def city_search(request):
    """GET /cities/?q=&country=&min_cost=&max_cost=&order_by=&limit="""
    cities = CityService.search_cities(
        query=request.GET.get('q'),
        country=request.GET.get('country'),
        min_cost=_int(request.GET.get('min_cost')),
        max_cost=_int(request.GET.get('max_cost')),
        min_popularity=_int(request.GET.get('min_popularity')),
        order_by=request.GET.get('order_by'),
        limit=_int(request.GET.get('limit'), 20),
    )
    return _ok(results=[S.city_to_dict(c) for c in cities])


@require_GET
@api
def city_detail(request, city_id):
    """GET /cities/<id>/ - city plus its activities."""
    city = CityService.get_city_with_activities(city_id)
    return _ok(
        city=S.city_to_dict(city, include_activity_count=True),
        activities=[S.activity_to_dict(a, include_city=False) for a in city.activities.all()],
    )


@require_GET
def country_list(request):
    """GET /countries/ - distinct countries for the filter dropdown."""
    return _ok(results=CityService.get_countries())


@require_GET
def popular_cities(request):
    """GET /cities/popular/"""
    cities = CityService.get_popular_cities(limit=_int(request.GET.get('limit'), 10))
    return _ok(results=[S.city_to_dict(c) for c in cities])


# ---------------------------------------------------------------------------
# Activity data
# ---------------------------------------------------------------------------

@require_GET
@api
def activity_search(request):
    """GET /activities/?q=&city=&type=&max_cost=&max_duration=&min_rating="""
    activities = ActivityService.search_activities(
        query=request.GET.get('q'),
        city_id=_int(request.GET.get('city')),
        activity_type=request.GET.get('type'),
        min_cost=request.GET.get('min_cost') or None,
        max_cost=request.GET.get('max_cost') or None,
        max_duration=request.GET.get('max_duration') or None,
        min_rating=request.GET.get('min_rating') or None,
        order_by=request.GET.get('order_by'),
        limit=_int(request.GET.get('limit'), 50),
    )
    return _ok(results=[S.activity_to_dict(a) for a in activities])


@require_GET
def activity_type_list(request):
    """GET /activity-types/?city= - categories with counts, for filter chips."""
    types = ActivityService.get_activity_type_counts(city_id=_int(request.GET.get('city')))
    return _ok(results=[
        {
            'name': t.name,
            'label': t.get_name_display(),
            'icon': t.icon,
            'count': getattr(t, 'total', 0),
        }
        for t in types
    ])


# ---------------------------------------------------------------------------
# Itinerary - stops
# ---------------------------------------------------------------------------

@login_required
@require_POST
@api
def stop_add(request, trip_id):
    """POST /trips/<id>/stops/add/ - body: city_id, arrival_date, departure_date, ..."""
    trip = _owned_trip(request, trip_id)
    data = _body(request)

    city_id = _int(data.get('city_id'))
    if not city_id:
        return _fail('city_id is required.')

    stop = ItineraryService.add_stop_to_trip(
        trip,
        city_id=city_id,
        order=_int(data.get('order')),
        arrival_date=_date(data.get('arrival_date')),
        departure_date=_date(data.get('departure_date')),
        accommodation_name=data.get('accommodation_name') or None,
        accommodation_cost=_decimal(data.get('accommodation_cost'), 0),
        transport_mode=data.get('transport_mode') or None,
        transport_cost=_decimal(data.get('transport_cost'), 0),
        notes=data.get('notes') or None,
    )
    return _ok(stop=S.stop_to_dict(stop))


@login_required
@require_POST
@api
def stop_update(request, stop_id):
    """POST /stops/<id>/update/ - partial update of an existing stop."""
    stop = _owned_stop(request, stop_id)
    data = _body(request)

    fields = {}
    if 'arrival_date' in data:
        fields['arrival_date'] = _date(data['arrival_date'])
    if 'departure_date' in data:
        fields['departure_date'] = _date(data['departure_date'])
    for key in ('accommodation_name', 'transport_mode', 'notes'):
        if key in data:
            fields[key] = data[key] or None
    if 'accommodation_cost' in data:
        fields['accommodation_cost_per_night'] = _decimal(data['accommodation_cost'], 0)
    if 'transport_cost' in data:
        fields['transport_cost'] = _decimal(data['transport_cost'], 0)

    stop = ItineraryService.update_stop(stop.id, **fields)
    return _ok(stop=S.stop_to_dict(stop))


@login_required
@require_POST
@api
def stop_delete(request, stop_id):
    """POST /stops/<id>/delete/ - removes the stop and closes the order gap."""
    stop = _owned_stop(request, stop_id)
    trip_id = stop.trip_id
    ItineraryService.remove_stop(stop.id)
    stops = TripStop.objects.filter(trip_id=trip_id).select_related('city').order_by('order')
    return _ok(stops=[S.stop_to_dict(s, include_activities=False) for s in stops])


@login_required
@require_POST
@api
def stop_reorder(request, trip_id):
    """POST /trips/<id>/stops/reorder/ - body: {"order": [stop_id, stop_id, ...]}"""
    trip = _owned_trip(request, trip_id)
    data = _body(request)

    raw = data.get('order') or data.get('stop_ids')
    if isinstance(raw, str):
        raw = [part for part in raw.split(',') if part.strip()]
    if not raw:
        return _fail('order must be a non-empty list of stop ids.')

    owned = set(trip.stops.values_list('id', flat=True))
    ids = [_int(x) for x in raw]
    if any(i is None for i in ids) or not set(ids).issubset(owned):
        return _fail('order contains stop ids that do not belong to this trip.')

    stops = ItineraryService.reorder_stops(trip, ids)
    return _ok(stops=[S.stop_to_dict(s, include_activities=False) for s in stops])


@login_required
@require_POST
@api
def stop_move(request, stop_id):
    """POST /stops/<id>/move/ - body: direction=up|down"""
    stop = _owned_stop(request, stop_id)
    direction = (_body(request).get('direction') or '').lower()

    moved = ItineraryService.move_stop(stop.id, direction)
    stops = TripStop.objects.filter(trip_id=stop.trip_id).select_related('city').order_by('order')
    return _ok(moved=moved, stops=[S.stop_to_dict(s, include_activities=False) for s in stops])


@login_required
@require_POST
@api
def stops_auto_dates(request, trip_id):
    """POST /trips/<id>/stops/auto-dates/ - spread trip dates across the stops."""
    trip = _owned_trip(request, trip_id)
    nights = _int(_body(request).get('nights_per_stop'))

    stops = ItineraryService.auto_assign_stop_dates(trip, nights_per_stop=nights)
    return _ok(stops=[S.stop_to_dict(s, include_activities=False) for s in stops])


# ---------------------------------------------------------------------------
# Itinerary - activities
# ---------------------------------------------------------------------------

@login_required
@require_POST
@api
def trip_activity_add(request, stop_id):
    """POST /stops/<id>/activities/add/ - body: activity_id, scheduled_date, scheduled_time"""
    stop = _owned_stop(request, stop_id)
    data = _body(request)

    activity_id = _int(data.get('activity_id'))
    if not activity_id:
        return _fail('activity_id is required.')

    ta = ItineraryService.add_activity_to_stop(
        stop.id,
        activity_id=activity_id,
        scheduled_date=_date(data.get('scheduled_date')),
        scheduled_time=_time(data.get('scheduled_time')),
        day_order=_int(data.get('day_order')),
        notes=data.get('notes') or None,
    )
    return _ok(activity=S.trip_activity_to_dict(ta))


@login_required
@require_POST
@api
def trip_activity_update(request, trip_activity_id):
    """POST /trip-activities/<id>/update/ - reschedule an activity."""
    ta = _owned_trip_activity(request, trip_activity_id)
    data = _body(request)

    ta = ItineraryService.update_activity_schedule(
        ta.id,
        scheduled_date=_date(data.get('scheduled_date')) if 'scheduled_date' in data else None,
        scheduled_time=_time(data.get('scheduled_time')) if 'scheduled_time' in data else None,
        day_order=_int(data.get('day_order')),
        notes=data.get('notes') if 'notes' in data else None,
    )
    return _ok(activity=S.trip_activity_to_dict(ta))


@login_required
@require_POST
@api
def trip_activity_delete(request, trip_activity_id):
    """POST /trip-activities/<id>/delete/"""
    ta = _owned_trip_activity(request, trip_activity_id)
    ItineraryService.remove_activity(ta.id)
    return _ok(deleted=trip_activity_id)


# ---------------------------------------------------------------------------
# Reading a trip
# ---------------------------------------------------------------------------

@login_required
@require_GET
@api
def trip_itinerary(request, trip_id):
    """GET /trips/<id>/itinerary/ - stops with their activities."""
    trip = _owned_trip(request, trip_id)
    data = ItineraryService.get_trip_itinerary(trip.id)

    return _ok(
        trip=S.trip_to_dict(data['trip']),
        stops=[S.stop_to_dict(entry['stop']) for entry in data['stops']],
        duration=ItineraryService.get_itinerary_duration(trip.id),
        issues=ItineraryService.validate_itinerary(trip.id),
    )


@login_required
@require_GET
@api
def trip_calendar(request, trip_id):
    """GET /trips/<id>/calendar/ - one entry per day, for the timeline view."""
    trip = _owned_trip(request, trip_id)
    days = ItineraryService.get_itinerary_by_day(trip.id)

    return _ok(
        trip=S.trip_to_dict(trip),
        days=[S.itinerary_day_to_dict(d) for d in days],
        unscheduled=[
            S.trip_activity_to_dict(ta)
            for ta in ItineraryService.get_unscheduled_activities(trip.id)
        ],
    )


@login_required
@require_GET
@api
def trip_validate(request, trip_id):
    """GET /trips/<id>/validate/ - itinerary warnings for the builder banner."""
    trip = _owned_trip(request, trip_id)
    return _ok(
        issues=ItineraryService.validate_itinerary(trip.id),
        duration=ItineraryService.get_itinerary_duration(trip.id),
    )


# ---------------------------------------------------------------------------
# Budget
# ---------------------------------------------------------------------------

@login_required
@require_GET
@api
def trip_budget(request, trip_id):
    """GET /trips/<id>/budget/?meals=0 - full budget breakdown."""
    trip = _owned_trip(request, trip_id)
    include_meals = request.GET.get('meals', '1') not in ('0', 'false', 'no')

    budget = BudgetService.calculate_trip_budget(trip.id, include_estimated_meals=include_meals)
    return _ok(
        budget=S.budget_to_dict(budget),
        warning=BudgetService.get_budget_warning(trip.id),
    )


@login_required
@require_POST
@api
def expense_add(request, trip_id):
    """POST /trips/<id>/expenses/add/ - body: category, description, amount, date"""
    trip = _owned_trip(request, trip_id)
    data = _body(request)

    description = (data.get('description') or '').strip()
    if not description:
        return _fail('description is required.')

    from decimal import Decimal, InvalidOperation
    try:
        amount = Decimal(str(data.get('amount')))
    except (InvalidOperation, TypeError):
        return _fail('amount must be a number.')

    expense = BudgetService.add_expense(
        trip.id,
        category=data.get('category') or 'other',
        description=description,
        amount=amount,
        date=_date(data.get('date')),
    )
    return _ok(
        expense={
            'id': expense.id,
            'category': expense.category,
            'category_display': expense.get_category_display(),
            'description': expense.description,
            'amount': str(expense.amount),
            'date': expense.date.isoformat() if expense.date else None,
        },
        summary=S.budget_to_dict(BudgetService.calculate_trip_budget(trip.id)),
    )


@login_required
@require_POST
@api
def expense_delete(request, expense_id):
    """POST /expenses/<id>/delete/"""
    expense = get_object_or_404(Expense, id=expense_id, trip__user=request.user)
    trip_id = expense.trip_id
    BudgetService.delete_expense(expense.id)
    return _ok(
        deleted=expense_id,
        summary=S.budget_to_dict(BudgetService.calculate_trip_budget(trip_id)),
    )


@require_GET
@api
def cost_estimate(request):
    """GET /estimate/?cities=1,2,3&days=3&style=moderate&travelers=2

    Public on purpose - it is a planning aid that touches no user data.
    """
    raw = request.GET.get('cities', '')
    city_ids = [_int(part) for part in raw.split(',') if part.strip()]
    city_ids = [c for c in city_ids if c]
    if not city_ids:
        return _fail('cities is required, e.g. ?cities=1,2,3')

    estimate = BudgetService.estimate_trip_cost(
        city_ids,
        days_per_city=_int(request.GET.get('days'), 3),
        travel_style=request.GET.get('style', 'moderate'),
        travelers=_int(request.GET.get('travelers'), 1),
    )
    return _ok(estimate=S.estimate_to_dict(estimate))
