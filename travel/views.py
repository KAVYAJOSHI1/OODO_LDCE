"""
GlobeTrotter page views -- Member 1 (Backend core).

Auth, dashboard, Trip CRUD and profile. Trip create goes through Member 3's
`ItineraryService`; itinerary / budget / calendar / search pages are served by
his JSON API and his own pages.
"""

from __future__ import annotations

import logging

from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.http import require_http_methods

from .forms import LoginForm, ProfileForm, SignupForm, TripForm, normalize_trip_data
from .models import Trip
from .services import ItineraryService, ItineraryError

logger = logging.getLogger(__name__)


def _name_of(user):
    return user.get_full_name().strip() or user.username


def _form_errors_to_messages(request, form) -> None:
    for field, errors in form.errors.items():
        label = "" if field == "__all__" else f"{field.replace('_', ' ').title()}: "
        for error in errors:
            messages.error(request, f"{label}{error}")


def _owned_trip(request, trip_id) -> Trip:
    """Fetch a trip owned by the current user, or 404 (never leak another's)."""
    return get_object_or_404(Trip, pk=trip_id, user=request.user)


# ===========================================================================
# Authentication
# ===========================================================================
@require_http_methods(["GET", "POST"])
def signup_view(request):
    if request.user.is_authenticated:
        return redirect("dashboard")

    form = SignupForm(request.POST or None)
    if request.method == "POST":
        if form.is_valid():
            user = form.save()
            login(request, user, backend="travel.backends.EmailOrUsernameBackend")
            messages.success(request, f"Welcome aboard, {_name_of(user)}!")
            logger.info("signup complete for user %s", user.pk)
            return redirect("dashboard")
        _form_errors_to_messages(request, form)

    return render(request, "auth/signup.html", {"form": form})


@require_http_methods(["GET", "POST"])
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
                messages.success(request, f"Welcome back, {_name_of(user)}!")
                next_url = request.POST.get("next") or request.GET.get("next")
                if next_url and url_has_allowed_host_and_scheme(
                    next_url, allowed_hosts={request.get_host()}, require_https=request.is_secure()
                ):
                    return redirect(next_url)
                return redirect("dashboard")
            messages.error(request, "Wrong username/email or password. Please try again.")
        else:
            messages.error(request, "Please enter both your username/email and password.")

    return render(request, "auth/login.html", {"form": form})


@require_http_methods(["GET", "POST"])
def logout_view(request):
    if request.user.is_authenticated:
        logger.info("logout user %s", request.user.pk)
        logout(request)
        messages.success(request, "You have been signed out.")
    return redirect("login")


# ===========================================================================
# Core pages
# ===========================================================================
def home(request):
    return redirect("dashboard" if request.user.is_authenticated else "login")


@login_required
def dashboard(request):
    trips = Trip.objects.filter(user=request.user)
    context = {
        "trips_count": trips.count(),
        "upcoming_count": trips.filter(status__in=["planning", "upcoming"]).count(),
        "ongoing_count": trips.filter(status="ongoing").count(),
        "completed_count": trips.filter(status="completed").count(),
        "upcoming_trips": list(trips.order_by("start_date")[:6]),
        "recent_trips": list(trips.order_by("-created_at")[:6]),
    }
    return render(request, "trips/dashboard.html", context)


@login_required
def my_trips(request):
    q = request.GET.get("q", "").strip()
    status = request.GET.get("status", "").strip()
    sort = request.GET.get("sort", "recent").strip()

    trips = Trip.objects.filter(user=request.user)
    if q:
        trips = trips.filter(name__icontains=q) | trips.filter(description__icontains=q)
        trips = trips.distinct()
    if status:
        trips = trips.filter(status=status)

    orderings = {
        "recent": ("-created_at",),
        "date_desc": ("-start_date", "-id"),
        "date_asc": ("start_date", "id"),
        "budget_desc": ("-budget",),
        "name": ("name",),
    }
    trips = trips.order_by(*orderings.get(sort, orderings["recent"]))

    return render(
        request,
        "trips/my_trips.html",
        {
            "trips": trips,
            "trips_count": trips.count(),
            "q": q,
            "status": status,
            "sort": sort,
            "status_choices": Trip.STATUS_CHOICES,
        },
    )


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
                messages.success(request, f"'{trip.name}' created. Now add your cities and activities.")
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
            messages.success(request, f"'{trip.name}' updated.")
            return redirect("trip_detail", trip_id=trip.pk)
        _form_errors_to_messages(request, form)
    else:
        form = TripForm(
            initial={
                "name": trip.name,
                "start_date": trip.start_date,
                "end_date": trip.end_date,
                "budget": trip.budget,
                "description": trip.description,
            }
        )

    return render(request, "trips/create_trip.html", {"form": form, "trip": trip, "is_edit": True})


@login_required
@require_http_methods(["GET", "POST"])
def trip_delete(request, trip_id):
    """POST deletes; a GET must carry ?confirm=1 so a stray link can't delete."""
    trip = _owned_trip(request, trip_id)
    if request.method == "POST" or request.GET.get("confirm") == "1":
        name = trip.name
        trip.delete()
        messages.success(request, f"'{name}' was deleted.")
        return redirect("my_trips")

    messages.warning(request, f"Use the delete button to confirm removing '{trip.name}'.")
    return redirect("my_trips")


# ===========================================================================
# Integration glue (Member 1: URL routing + core views)
#
# These thin views only RENDER Member 2's templates so the shared base.html
# links resolve and the whole UI is navigable. They contain no travel logic:
# the pages load their data client-side from Member 3's JSON API at
# /api/travel/ (see travel/INTEGRATION.md). Member 3 / Member 4 can replace any
# of these with a richer view without changing the URL name.
# ===========================================================================
def _current_trip(request):
    return Trip.objects.filter(user=request.user).order_by("-created_at").first()


@login_required
def city_search(request):
    return render(request, "trips/city_search.html", {})


@login_required
def activity_search(request):
    return render(request, "trips/activity_search.html", {})


@login_required
def calendar_view(request):
    return render(request, "trips/calendar.html", {"trip": _current_trip(request)})


@login_required
def itinerary_builder(request):
    return render(request, "trips/itinerary_builder.html", {"trip": _current_trip(request)})


@login_required
def itinerary_view(request):
    return render(request, "trips/itinerary_view.html", {"trip": _current_trip(request)})


@login_required
def budget_view(request):
    return render(request, "trips/budget.html", {"trip": _current_trip(request)})


def public_trip(request, share_token=None):
    """Read-only public itinerary. Owned by Member 4; this renders the template."""
    trip = None
    if share_token:
        trip = Trip.objects.filter(share_token=share_token, is_public=True).first()
    return render(request, "trips/public_trip.html", {"trip": trip})


# ===========================================================================
# Profile
# ===========================================================================
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

    trips = Trip.objects.filter(user=request.user)
    return render(
        request,
        "trips/profile.html",
        {"form": form, "user_obj": request.user, "stats": {"trips": trips.count()}},
    )
