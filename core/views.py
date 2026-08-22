from decimal import Decimal

from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.http import require_http_methods

from travel.forms import LoginForm, ProfileForm, SignupForm, TripForm, normalize_trip_data
from travel.models import City, Trip
from travel.serializers import itinerary_day_to_dict
from travel.services import BudgetService, ItineraryError, ItineraryService


def _users_trip_or_first(request, trip_id):
    if trip_id:
        return get_object_or_404(Trip, id=trip_id, user=request.user)
    return Trip.objects.filter(user=request.user).first()


def _owned_trip(request, trip_id):
    return get_object_or_404(Trip, pk=trip_id, user=request.user)


def _form_errors_to_messages(request, form):
    for field, errors in form.errors.items():
        label = "" if field == "__all__" else f"{field.replace('_', ' ').title()}: "
        for error in errors:
            messages.error(request, f"{label}{error}")


def home(request):
    return redirect("dashboard" if request.user.is_authenticated else "login")


def signup_view(request):
    if request.user.is_authenticated:
        return redirect("dashboard")

    form = SignupForm(request.POST or None)
    if request.method == "POST":
        if form.is_valid():
            user = form.save()
            login(request, user, backend="travel.backends.EmailOrUsernameBackend")
            messages.success(request, f"Welcome to GlobeTrotter, {user.first_name or user.username}!")
            return redirect("dashboard")
        _form_errors_to_messages(request, form)

    return render(request, "auth/signup.html", {"form": form})


def login_view(request):
    if request.user.is_authenticated:
        return redirect("dashboard")

    form = LoginForm(request.POST or None)
    if request.method == "POST":
        if form.is_valid():
            user = authenticate(
                request,
                username=form.cleaned_data["username"],
                password=form.cleaned_data["password"],
            )
            if user is not None:
                login(request, user)
                request.session.set_expiry(None if form.cleaned_data.get("remember_me") else 0)
                next_url = request.POST.get("next") or request.GET.get("next")
                if next_url and url_has_allowed_host_and_scheme(
                    next_url, allowed_hosts={request.get_host()}, require_https=request.is_secure()
                ):
                    return redirect(next_url)
                return redirect("dashboard")
            messages.error(request, "Invalid username/email or password.")
        else:
            messages.error(request, "Please enter both your username/email and password.")

    return render(request, "auth/login.html", {"form": form})


@require_http_methods(["GET", "POST"])
def logout_view(request):
    logout(request)
    return redirect("login")


@login_required
def dashboard(request):
    trips = Trip.objects.filter(user=request.user)
    context = {
        "trips": trips,
        "trips_count": trips.count(),
        "upcoming_count": trips.filter(status__in=["planning", "upcoming"]).count(),
    }
    return render(request, "trips/dashboard.html", context)


@login_required
def my_trips(request):
    trips = Trip.objects.filter(user=request.user)
    return render(request, "trips/my_trips.html", {"trips": trips})


@login_required
@require_http_methods(["GET", "POST"])
def create_trip(request):
    form = TripForm(normalize_trip_data(request.POST) or None)
    if request.method == "POST":
        if form.is_valid():
            try:
                trip = ItineraryService.create_trip(request.user, **form.service_kwargs())
            except ItineraryError as exc:
                messages.error(request, str(exc))
            else:
                primary_city_name = request.POST.get("primary_city", "").strip()
                city = City.objects.filter(name__iexact=primary_city_name).first()
                if city:
                    ItineraryService.add_stop_to_trip(
                        trip, city.id, arrival_date=trip.start_date, departure_date=trip.end_date,
                    )
                messages.success(request, f'"{trip.name}" created. Now add your cities and activities.')
                return redirect("trip_detail", trip_id=trip.pk)
        else:
            _form_errors_to_messages(request, form)

    return render(request, "trips/create_trip.html", {"form": form, "is_edit": False})


@login_required
def trip_detail(request, trip_id):
    trip = _owned_trip(request, trip_id)
    return render(request, "trips/trip_detail.html", {"trip": trip})


@login_required
@require_http_methods(["GET", "POST"])
def trip_edit(request, trip_id):
    trip = _owned_trip(request, trip_id)

    if request.method == "POST":
        form = TripForm(normalize_trip_data(request.POST))
        if form.is_valid():
            data = form.service_kwargs()
            trip.name = data["name"]
            trip.description = data["description"]
            trip.start_date = data["start_date"]
            trip.end_date = data["end_date"]
            trip.budget = data["budget"]
            trip.save()
            messages.success(request, f'"{trip.name}" updated.')
            return redirect("trip_detail", trip_id=trip.pk)
        _form_errors_to_messages(request, form)
    else:
        form = TripForm(initial={
            "name": trip.name,
            "start_date": trip.start_date,
            "end_date": trip.end_date,
            "budget": trip.budget,
            "description": trip.description,
        })

    return render(request, "trips/create_trip.html", {"form": form, "trip": trip, "is_edit": True})


@login_required
@require_http_methods(["GET", "POST"])
def trip_delete(request, trip_id):
    """POST deletes; a GET must carry ?confirm=1 so a stray link can't delete."""
    trip = _owned_trip(request, trip_id)
    if request.method == "POST" or request.GET.get("confirm") == "1":
        name = trip.name
        trip.delete()
        messages.success(request, f'"{name}" was deleted.')
        return redirect("my_trips")

    messages.warning(request, f'Use the delete button to confirm removing "{trip.name}".')
    return redirect("my_trips")


@login_required
def itinerary_builder(request):
    trip = _users_trip_or_first(request, request.GET.get("trip"))
    return render(request, "trips/itinerary_builder.html", {"trip": trip})


@login_required
def itinerary_view(request):
    trip = _users_trip_or_first(request, request.GET.get("trip"))
    if trip:
        trip.ensure_share_token()
    return render(request, "trips/itinerary_view.html", {"trip": trip})


@login_required
def city_search(request):
    return render(request, "trips/city_search.html")


@login_required
def activity_search(request):
    return render(request, "trips/activity_search.html")


@login_required
def budget(request):
    trip = _users_trip_or_first(request, request.GET.get("trip"))
    context = {"trip": trip}
    if trip:
        context["budget"] = BudgetService.calculate_trip_budget(trip.id)
        context["warning"] = BudgetService.get_budget_warning(trip.id)
    return render(request, "trips/budget.html", context)


@login_required
def calendar(request):
    trip = _users_trip_or_first(request, request.GET.get("trip"))
    context = {"trip": trip}
    if trip:
        raw_days = ItineraryService.get_itinerary_by_day(trip.id)
        context["days"] = [itinerary_day_to_dict(d) for d in raw_days if d["activities"]]
    return render(request, "trips/calendar.html", context)


@login_required
@require_http_methods(["GET", "POST"])
def profile(request):
    if request.method == "POST":
        form = ProfileForm(request.POST, instance=request.user)
        if form.is_valid():
            form.save()
            messages.success(request, "Profile updated.")
            return redirect("profile")
        _form_errors_to_messages(request, form)
    else:
        form = ProfileForm(instance=request.user)

    trips = Trip.objects.filter(user=request.user).prefetch_related("stops__city")
    cities = {stop.city_id for trip in trips for stop in trip.stops.all()}
    total_spent = sum((trip.get_total_cost() for trip in trips), Decimal("0.00"))

    stats = {"trips": trips.count(), "cities": len(cities), "spent": total_spent}
    return render(request, "trips/profile.html", {"form": form, "stats": stats})


def public_trip(request):
    token = request.GET.get("token")
    trip = get_object_or_404(Trip, share_token=token) if token else None
    stops = trip.stops.select_related("city").prefetch_related("trip_activities") if trip else []
    return render(request, "trips/public_trip.html", {"trip": trip, "stops": stops, "token": token})


@login_required
def copy_trip(request):
    if request.method != "POST":
        return redirect("public_trip")

    token = request.POST.get("token")
    source = get_object_or_404(Trip, share_token=token)

    new_trip = Trip.objects.create(
        user=request.user,
        name=f"{source.name} (Copy)",
        description=source.description,
        start_date=source.start_date,
        end_date=source.end_date,
        budget=source.budget,
        currency=source.currency,
        travelers=source.travelers,
    )

    for stop in source.stops.select_related("city").prefetch_related("trip_activities"):
        new_stop = ItineraryService.add_stop_to_trip(
            new_trip, stop.city_id,
            arrival_date=stop.arrival_date,
            departure_date=stop.departure_date,
            accommodation_name=stop.accommodation_name,
            accommodation_cost=stop.accommodation_cost_per_night,
            transport_mode=stop.transport_mode,
            transport_cost=stop.transport_cost,
            notes=stop.notes,
        )
        for ta in stop.trip_activities.all():
            ItineraryService.add_activity_to_stop(
                new_stop.id,
                activity_id=ta.activity_id,
                scheduled_date=ta.scheduled_date,
                scheduled_time=ta.scheduled_time,
                day_order=ta.day_order,
                notes=ta.notes,
            )

    messages.success(request, f'"{source.name}" copied to your trips!')
    return redirect(f"/trips/builder/?trip={new_trip.id}")
