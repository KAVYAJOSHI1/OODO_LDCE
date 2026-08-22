"""
Staff-only JSON API Endpoints for GlobeTrotter Custom Admin Panel.
Author: Antigravity AI Assistant

Enforces staff authentication (`request.user.is_staff`) on all endpoints.
"""

import json
import csv
from decimal import Decimal
from functools import wraps
from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from django.db.models import Count, Avg, Sum, Q
from django.core.paginator import Paginator
from django.core.management import call_command

from travel.models import City, Activity, ActivityType, Trip, TripStop, TripActivity, Expense


def staff_required(view_func):
    """Decorator ensuring request user is authenticated and is staff."""
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not (request.user.is_authenticated and request.user.is_staff):
            return JsonResponse(
                {
                    "ok": False,
                    "error": {
                        "code": "FORBIDDEN",
                        "message": "Admin staff permissions required to access this resource."
                    }
                },
                status=403
            )
        return view_func(request, *args, **kwargs)
    return _wrapped_view


def parse_json_body(request):
    """Utility to safely parse JSON request body."""
    try:
        return json.loads(request.body.decode('utf-8'))
    except Exception:
        return {}


# -----------------------------------------------------------------------------
# 1. Dashboard API
# -----------------------------------------------------------------------------

@staff_required
@require_http_methods(["GET"])
def admin_dashboard_stats(request):
    """GET /api/admin/dashboard/stats/"""
    total_users = User.objects.count()
    active_trips = Trip.objects.filter(status__in=['planning', 'upcoming', 'ongoing']).count()
    total_cities = City.objects.count()
    total_activities = Activity.objects.count()
    total_public_trips = Trip.objects.filter(is_public=True).count()

    avg_budget_query = Trip.objects.aggregate(avg_budget=Avg('budget'))
    avg_trip_budget = float(avg_budget_query['avg_budget'] or 0.0)

    total_planned_query = Trip.objects.aggregate(total_budget=Sum('budget'))
    total_planned_budget = float(total_planned_query['total_budget'] or 0.0)

    total_expenses_query = Expense.objects.aggregate(total_expenses=Sum('amount'))
    total_expenses = float(total_expenses_query['total_expenses'] or 0.0)

    budget_utilization = round((total_expenses / total_planned_budget * 100), 1) if total_planned_budget > 0 else 0.0

    return JsonResponse({
        "ok": True,
        "stats": {
            "total_users": total_users,
            "active_trips": active_trips,
            "total_cities": total_cities,
            "total_activities": total_activities,
            "total_public_trips": total_public_trips,
            "avg_trip_budget": round(avg_trip_budget, 2),
            "total_planned_budget": round(total_planned_budget, 2),
            "total_expenses": round(total_expenses, 2),
            "budget_utilization": budget_utilization
        }
    })


@staff_required
@require_http_methods(["GET"])
def admin_dashboard_charts(request):
    """GET /api/admin/dashboard/charts/"""
    # Status distribution
    status_counts = dict(
        Trip.objects.values('status').annotate(count=Count('id')).values_list('status', 'count')
    )
    all_statuses = ['planning', 'upcoming', 'ongoing', 'completed', 'cancelled']
    status_distribution = [
        {"status": s, "count": status_counts.get(s, 0)} for s in all_statuses
    ]

    # Popular cities (top 5 by stop count or popularity)
    top_cities = City.objects.annotate(stops_count=Count('trip_stops')).order_by('-stops_count', '-popularity')[:5]
    popular_destinations = [
        {
            "id": c.id,
            "name": c.name,
            "country": c.country,
            "stops_count": c.stops_count,
            "popularity": c.popularity
        }
        for c in top_cities
    ]

    # Expense category breakdown
    category_counts = list(
        Expense.objects.values('category').annotate(
            total_amount=Sum('amount'),
            count=Count('id')
        ).order_by('-total_amount')
    )
    budget_breakdown = [
        {
            "category": item['category'],
            "total_amount": float(item['total_amount'] or 0.0),
            "count": item['count']
        }
        for item in category_counts
    ]

    return JsonResponse({
        "ok": True,
        "charts": {
            "status_distribution": status_distribution,
            "popular_destinations": popular_destinations,
            "budget_breakdown": budget_breakdown
        }
    })


# -----------------------------------------------------------------------------
# 2. Cities API & Studio
# -----------------------------------------------------------------------------

@staff_required
@require_http_methods(["GET"])
def admin_cities_list(request):
    """GET /api/admin/cities/"""
    search = request.GET.get('search', '').strip()
    country = request.GET.get('country', '').strip()
    cost_index = request.GET.get('cost_index', '').strip()
    ordering = request.GET.get('ordering', '-popularity').strip()
    page = int(request.GET.get('page', 1))

    qs = City.objects.annotate(
        activity_count=Count('activities', distinct=True),
        stop_count=Count('trip_stops', distinct=True)
    )

    if search:
        qs = qs.filter(Q(name__icontains=search) | Q(country__icontains=search))
    if country:
        qs = qs.filter(country__iexact=country)
    if cost_index and cost_index.isdigit():
        qs = qs.filter(cost_index=int(cost_index))

    # Allowed orderings
    valid_orderings = ['popularity', '-popularity', 'name', '-name', 'cost_index', '-cost_index']
    if ordering in valid_orderings:
        qs = qs.order_by(ordering)
    else:
        qs = qs.order_by('-popularity')

    paginator = Paginator(qs, 10)
    current_page = paginator.get_page(page)

    cities_data = [
        {
            "id": c.id,
            "name": c.name,
            "country": c.country,
            "cost_index": c.cost_index,
            "popularity": c.popularity,
            "avg_hotel_cost": str(c.avg_hotel_cost),
            "avg_meal_cost": str(c.avg_meal_cost),
            "avg_transport_cost": str(c.avg_transport_cost),
            "activity_count": c.activity_count,
            "stop_count": c.stop_count,
            "image_url": c.image_url or "",
            "description": c.description or ""
        }
        for c in current_page.object_list
    ]

    return JsonResponse({
        "ok": True,
        "count": paginator.count,
        "total_pages": paginator.num_pages,
        "current_page": current_page.number,
        "cities": cities_data
    })


@staff_required
@csrf_exempt
@require_http_methods(["POST"])
def admin_city_save(request):
    """POST /api/admin/cities/save/"""
    data = parse_json_body(request)

    city_id = data.get('id')
    name = data.get('name', '').strip()
    country = data.get('country', '').strip()

    if not name or not country:
        return JsonResponse({
            "ok": False,
            "error": {"code": "VALIDATION_ERROR", "message": "City name and country are required."}
        }, status=400)

    try:
        cost_index = int(data.get('cost_index', 3))
        cost_index = max(1, min(5, cost_index))
    except (ValueError, TypeError):
        cost_index = 3

    try:
        popularity = int(data.get('popularity', 50))
        popularity = max(0, min(100, popularity))
    except (ValueError, TypeError):
        popularity = 50

    avg_hotel_cost = Decimal(str(data.get('avg_hotel_cost', 50.00)))
    avg_meal_cost = Decimal(str(data.get('avg_meal_cost', 15.00)))
    avg_transport_cost = Decimal(str(data.get('avg_transport_cost', 10.00)))
    image_url = data.get('image_url', '').strip()
    description = data.get('description', '').strip()

    if city_id:
        try:
            city = City.objects.get(id=city_id)
        except City.DoesNotExist:
            return JsonResponse({
                "ok": False,
                "error": {"code": "NOT_FOUND", "message": "City not found."}
            }, status=404)
    else:
        city = City()

    city.name = name
    city.country = country
    city.cost_index = cost_index
    city.popularity = popularity
    city.avg_hotel_cost = avg_hotel_cost
    city.avg_meal_cost = avg_meal_cost
    city.avg_transport_cost = avg_transport_cost
    city.image_url = image_url
    city.description = description
    city.save()

    return JsonResponse({
        "ok": True,
        "message": "City saved successfully.",
        "city": {
            "id": city.id,
            "name": city.name,
            "country": city.country,
            "cost_index": city.cost_index,
            "popularity": city.popularity,
            "avg_hotel_cost": str(city.avg_hotel_cost),
            "avg_meal_cost": str(city.avg_meal_cost),
            "avg_transport_cost": str(city.avg_transport_cost),
            "image_url": city.image_url
        }
    })


# -----------------------------------------------------------------------------
# 3. Activity API & Studio
# -----------------------------------------------------------------------------

@staff_required
@require_http_methods(["GET"])
def admin_activities_list(request):
    """GET /api/admin/activities/"""
    city_id = request.GET.get('city_id', '').strip()
    category = request.GET.get('category', '').strip()
    min_rating = request.GET.get('min_rating', '').strip()
    search = request.GET.get('search', '').strip()
    page = int(request.GET.get('page', 1))

    qs = Activity.objects.select_related('city', 'activity_type').all()

    if city_id and city_id.isdigit():
        qs = qs.filter(city_id=int(city_id))
    if category:
        qs = qs.filter(activity_type__name=category)
    if min_rating:
        try:
            qs = qs.filter(rating__gte=float(min_rating))
        except ValueError:
            pass
    if search:
        qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search))

    qs = qs.order_by('-popularity', 'name')

    paginator = Paginator(qs, 12)
    current_page = paginator.get_page(page)

    activities_data = []
    for a in current_page.object_list:
        cat_name = a.activity_type.get_name_display() if a.activity_type else "General"
        cat_code = a.activity_type.name if a.activity_type else ""
        activities_data.append({
            "id": a.id,
            "name": a.name,
            "city_id": a.city_id,
            "city_name": a.city.name,
            "category": cat_name,
            "category_code": cat_code,
            "cost": str(a.cost),
            "duration_hours": float(a.duration_hours),
            "rating": float(a.rating),
            "popularity": a.popularity,
            "image_url": a.image_url or "",
            "description": a.description or ""
        })

    # Available activity types list for dropdowns
    activity_types = [
        {"code": at.name, "label": at.get_name_display()}
        for at in ActivityType.objects.all()
    ]

    return JsonResponse({
        "ok": True,
        "count": paginator.count,
        "total_pages": paginator.num_pages,
        "current_page": current_page.number,
        "activities": activities_data,
        "activity_types": activity_types
    })


@staff_required
@csrf_exempt
@require_http_methods(["POST"])
def admin_activity_save(request):
    """POST /api/admin/activities/save/"""
    data = parse_json_body(request)

    act_id = data.get('id')
    name = data.get('name', '').strip()
    city_id = data.get('city_id')
    category_code = data.get('category', '').strip()

    if not name or not city_id:
        return JsonResponse({
            "ok": False,
            "error": {"code": "VALIDATION_ERROR", "message": "Activity name and city are required."}
        }, status=400)

    try:
        city = City.objects.get(id=city_id)
    except City.DoesNotExist:
        return JsonResponse({
            "ok": False,
            "error": {"code": "NOT_FOUND", "message": "Selected city does not exist."}
        }, status=404)

    activity_type = None
    if category_code:
        activity_type = ActivityType.objects.filter(name=category_code).first()

    cost = Decimal(str(data.get('cost', 0.00)))
    duration_hours = Decimal(str(data.get('duration_hours', 2.0)))
    rating = Decimal(str(data.get('rating', 4.0)))
    popularity = int(data.get('popularity', 50))
    image_url = data.get('image_url', '').strip()
    description = data.get('description', '').strip()

    if act_id:
        try:
            activity = Activity.objects.get(id=act_id)
        except Activity.DoesNotExist:
            return JsonResponse({
                "ok": False,
                "error": {"code": "NOT_FOUND", "message": "Activity not found."}
            }, status=404)
    else:
        activity = Activity()

    activity.name = name
    activity.city = city
    activity.activity_type = activity_type
    activity.cost = cost
    activity.duration_hours = duration_hours
    activity.rating = rating
    activity.popularity = popularity
    activity.image_url = image_url
    activity.description = description
    activity.save()

    return JsonResponse({
        "ok": True,
        "message": "Activity saved successfully.",
        "activity": {
            "id": activity.id,
            "name": activity.name,
            "city_name": activity.city.name,
            "category": activity.activity_type.get_name_display() if activity.activity_type else "General",
            "cost": str(activity.cost),
            "duration_hours": float(activity.duration_hours),
            "rating": float(activity.rating),
            "popularity": activity.popularity
        }
    })


@staff_required
@csrf_exempt
@require_http_methods(["DELETE", "POST"])
def admin_activity_delete(request, activity_id):
    """DELETE /api/admin/activities/<id>/"""
    try:
        activity = Activity.objects.get(id=activity_id)
    except Activity.DoesNotExist:
        return JsonResponse({
            "ok": False,
            "error": {"code": "NOT_FOUND", "message": "Activity not found."}
        }, status=404)

    act_name = activity.name
    activity.delete()

    return JsonResponse({
        "ok": True,
        "message": f"Activity '{act_name}' deleted successfully."
    })


# -----------------------------------------------------------------------------
# 4. Trips API & Inspection
# -----------------------------------------------------------------------------

@staff_required
@require_http_methods(["GET"])
def admin_trips_list(request):
    """GET /api/admin/trips/"""
    is_public = request.GET.get('is_public', '').strip()
    status = request.GET.get('status', '').strip()
    user_id = request.GET.get('user_id', '').strip()
    search = request.GET.get('search', '').strip()
    page = int(request.GET.get('page', 1))

    qs = Trip.objects.select_related('user').prefetch_related('stops', 'stops__city').all()

    if is_public.lower() in ['true', '1']:
        qs = qs.filter(is_public=True)
    elif is_public.lower() in ['false', '0']:
        qs = qs.filter(is_public=False)

    if status:
        qs = qs.filter(status=status)

    if user_id and user_id.isdigit():
        qs = qs.filter(user_id=int(user_id))

    if search:
        qs = qs.filter(
            Q(name__icontains=search) |
            Q(user__username__icontains=search) |
            Q(user__email__icontains=search)
        )

    qs = qs.order_by('-created_at')

    paginator = Paginator(qs, 10)
    current_page = paginator.get_page(page)

    trips_data = []
    for t in current_page.object_list:
        destinations = [stop.city.name for stop in t.stops.all()]
        trips_data.append({
            "id": t.id,
            "name": t.name,
            "user_username": t.user.username,
            "user_email": t.user.email or "N/A",
            "destinations": destinations,
            "travelers": t.travelers,
            "duration_days": t.get_duration_days(),
            "total_cost": str(t.get_total_cost()),
            "budget": str(t.budget),
            "status": t.status,
            "is_public": t.is_public,
            "share_token": t.share_token or "",
            "created_at": t.created_at.strftime("%Y-%m-%d %H:%M")
        })

    return JsonResponse({
        "ok": True,
        "count": paginator.count,
        "total_pages": paginator.num_pages,
        "current_page": current_page.number,
        "trips": trips_data
    })


@staff_required
@require_http_methods(["GET"])
def admin_trip_detail(request, trip_id):
    """GET /api/admin/trips/<id>/detail/"""
    try:
        trip = Trip.objects.select_related('user').prefetch_related(
            'stops__city',
            'stops__trip_activities__activity',
            'expenses'
        ).get(id=trip_id)
    except Trip.DoesNotExist:
        return JsonResponse({
            "ok": False,
            "error": {"code": "NOT_FOUND", "message": "Trip not found."}
        }, status=404)

    stops_data = []
    for stop in trip.stops.all():
        activities = [
            {
                "id": ta.id,
                "name": ta.activity.name,
                "cost": str(ta.activity.cost),
                "scheduled_date": str(ta.scheduled_date) if ta.scheduled_date else None,
                "scheduled_time": str(ta.scheduled_time) if ta.scheduled_time else None
            }
            for ta in stop.trip_activities.all()
        ]

        stops_data.append({
            "id": stop.id,
            "city_name": stop.city.name,
            "country": stop.city.country,
            "order": stop.order,
            "arrival_date": str(stop.arrival_date) if stop.arrival_date else None,
            "departure_date": str(stop.departure_date) if stop.departure_date else None,
            "accommodation_name": stop.accommodation_name or "N/A",
            "accommodation_cost": str(stop.accommodation_cost_per_night),
            "transport_mode": stop.transport_mode or "N/A",
            "transport_cost": str(stop.transport_cost),
            "stop_cost": str(stop.get_stop_cost()),
            "activities": activities
        })

    expenses_data = [
        {
            "id": e.id,
            "category": e.get_category_display(),
            "description": e.description,
            "amount": str(e.amount),
            "date": str(e.date) if e.date else None
        }
        for e in trip.expenses.all()
    ]

    return JsonResponse({
        "ok": True,
        "trip": {
            "id": trip.id,
            "name": trip.name,
            "description": trip.description or "",
            "user_username": trip.user.username,
            "user_email": trip.user.email or "N/A",
            "start_date": str(trip.start_date) if trip.start_date else None,
            "end_date": str(trip.end_date) if trip.end_date else None,
            "duration_days": trip.get_duration_days(),
            "travelers": trip.travelers,
            "status": trip.status,
            "budget": str(trip.budget),
            "total_cost": str(trip.get_total_cost()),
            "avg_cost_per_day": str(trip.get_average_cost_per_day()),
            "is_public": trip.is_public,
            "share_token": trip.share_token or "",
            "stops": stops_data,
            "expenses": expenses_data
        }
    })


@staff_required
@csrf_exempt
@require_http_methods(["POST"])
def admin_trip_toggle_public(request, trip_id):
    """POST /api/admin/trips/<id>/toggle-public/"""
    try:
        trip = Trip.objects.get(id=trip_id)
    except Trip.DoesNotExist:
        return JsonResponse({
            "ok": False,
            "error": {"code": "NOT_FOUND", "message": "Trip not found."}
        }, status=404)

    trip.is_public = not trip.is_public
    if trip.is_public:
        trip.ensure_share_token()
    trip.save()

    return JsonResponse({
        "ok": True,
        "message": f"Trip '{trip.name}' public visibility is now {'Public' if trip.is_public else 'Private'}.",
        "is_public": trip.is_public,
        "share_token": trip.share_token
    })


# -----------------------------------------------------------------------------
# 5. Users API & Management
# -----------------------------------------------------------------------------

@staff_required
@require_http_methods(["GET"])
def admin_users_list(request):
    """GET /api/admin/users/"""
    q = request.GET.get('q', '').strip() or request.GET.get('search', '').strip()
    is_staff = request.GET.get('is_staff', '').strip()
    page = int(request.GET.get('page', 1))

    qs = User.objects.annotate(trip_count=Count('trips')).all()

    if q:
        qs = qs.filter(Q(username__icontains=q) | Q(email__icontains=q) | Q(first_name__icontains=q))

    if is_staff.lower() in ['true', '1']:
        qs = qs.filter(is_staff=True)
    elif is_staff.lower() in ['false', '0']:
        qs = qs.filter(is_staff=False)

    qs = qs.order_by('-date_joined')

    paginator = Paginator(qs, 10)
    current_page = paginator.get_page(page)

    users_data = [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email or "N/A",
            "is_staff": u.is_staff,
            "is_active": u.is_active,
            "date_joined": u.date_joined.strftime("%Y-%m-%d"),
            "last_login": u.last_login.strftime("%Y-%m-%d %H:%M") if u.last_login else "Never",
            "trip_count": u.trip_count
        }
        for u in current_page.object_list
    ]

    return JsonResponse({
        "ok": True,
        "count": paginator.count,
        "total_pages": paginator.num_pages,
        "current_page": current_page.number,
        "users": users_data
    })


@staff_required
@csrf_exempt
@require_http_methods(["POST"])
def admin_user_update_status(request, user_id):
    """POST /api/admin/users/<id>/update-status/"""
    data = parse_json_body(request)
    action = data.get('action', '').strip()

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({
            "ok": False,
            "error": {"code": "NOT_FOUND", "message": "User not found."}
        }, status=404)

    if action == "deactivate":
        user.is_active = False
        user.save()
        msg = f"User '{user.username}' deactivated."
    elif action == "activate":
        user.is_active = True
        user.save()
        msg = f"User '{user.username}' activated."
    elif action == "promote_staff":
        user.is_staff = True
        user.save()
        msg = f"User '{user.username}' promoted to Staff."
    elif action == "demote_staff":
        user.is_staff = False
        user.save()
        msg = f"User '{user.username}' demoted from Staff."
    else:
        return JsonResponse({
            "ok": False,
            "error": {"code": "INVALID_ACTION", "message": "Unknown action specified."}
        }, status=400)

    return JsonResponse({
        "ok": True,
        "message": msg,
        "user": {
            "id": user.id,
            "username": user.username,
            "is_staff": user.is_staff,
            "is_active": user.is_active
        }
    })


# -----------------------------------------------------------------------------
# 6. Maintenance & Reseed API
# -----------------------------------------------------------------------------

@staff_required
@csrf_exempt
@require_http_methods(["POST"])
def admin_system_reseed(request):
    """POST /api/admin/system/reseed/"""
    try:
        call_command('seed_travel_data')
        return JsonResponse({
            "ok": True,
            "message": "Demo travel catalog data re-seeded successfully."
        })
    except Exception as e:
        return JsonResponse({
            "ok": False,
            "error": {"code": "RESEED_ERROR", "message": f"Failed to reseed: {str(e)}"}
        }, status=500)


# -----------------------------------------------------------------------------
# 7. CSV Exports API
# -----------------------------------------------------------------------------

@staff_required
@require_http_methods(["GET"])
def admin_export_users_csv(request):
    """GET /api/admin/export/users/"""
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="globetrotter_users.csv"'

    writer = csv.writer(response)
    writer.writerow(['ID', 'Username', 'Email', 'First Name', 'Last Name', 'Is Staff', 'Is Active', 'Date Joined', 'Last Login'])

    users = User.objects.all().order_by('-date_joined')
    for u in users:
        writer.writerow([
            u.id,
            u.username,
            u.email or '',
            u.first_name or '',
            u.last_name or '',
            u.is_staff,
            u.is_active,
            u.date_joined.strftime("%Y-%m-%d %H:%M:%S") if u.date_joined else '',
            u.last_login.strftime("%Y-%m-%d %H:%M:%S") if u.last_login else 'Never'
        ])
    return response


@staff_required
@require_http_methods(["GET"])
def admin_export_cities_csv(request):
    """GET /api/admin/export/cities/"""
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="globetrotter_cities.csv"'

    writer = csv.writer(response)
    writer.writerow(['ID', 'Name', 'Country', 'Cost Index', 'Popularity', 'Avg Hotel Cost', 'Avg Meal Cost', 'Avg Transport Cost', 'Activities Count', 'Description'])

    cities = City.objects.annotate(act_count=Count('activities')).order_by('-popularity')
    for c in cities:
        writer.writerow([
            c.id,
            c.name,
            c.country,
            c.cost_index,
            c.popularity,
            str(c.avg_hotel_cost),
            str(c.avg_meal_cost),
            str(c.avg_transport_cost),
            c.act_count,
            c.description or ''
        ])
    return response


@staff_required
@require_http_methods(["GET"])
def admin_export_activities_csv(request):
    """GET /api/admin/export/activities/"""
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="globetrotter_activities.csv"'

    writer = csv.writer(response)
    writer.writerow(['ID', 'Name', 'City ID', 'City Name', 'Category', 'Cost', 'Duration (Hours)', 'Rating', 'Popularity', 'Description'])

    activities = Activity.objects.select_related('city', 'activity_type').order_by('-popularity')
    for a in activities:
        cat_name = a.activity_type.get_name_display() if a.activity_type else 'General'
        writer.writerow([
            a.id,
            a.name,
            a.city_id,
            a.city.name,
            cat_name,
            str(a.cost),
            float(a.duration_hours),
            float(a.rating),
            a.popularity,
            a.description or ''
        ])
    return response


@staff_required
@require_http_methods(["GET"])
def admin_export_trips_csv(request):
    """GET /api/admin/export/trips/"""
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="globetrotter_trips.csv"'

    writer = csv.writer(response)
    writer.writerow(['ID', 'Name', 'Owner Username', 'Travelers', 'Status', 'Budget', 'Currency', 'Is Public', 'Share Token', 'Start Date', 'End Date', 'Created At'])

    trips = Trip.objects.select_related('user').order_by('-created_at')
    for t in trips:
        writer.writerow([
            t.id,
            t.name,
            t.user.username,
            t.travelers,
            t.status,
            str(t.budget),
            t.currency,
            t.is_public,
            t.share_token or '',
            str(t.start_date) if t.start_date else '',
            str(t.end_date) if t.end_date else '',
            t.created_at.strftime("%Y-%m-%d %H:%M:%S") if t.created_at else ''
        ])
    return response

