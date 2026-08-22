"""
URL routing for GlobeTrotter -- Member 1 (Backend core).

Only the routes owned by the backend core are here: authentication, dashboard,
Trip CRUD and profile. Member 3 (itinerary / budget / search) and Member 4
(calendar / public sharing) add their own routes for the pages they own; those
names (e.g. `itinerary_view`, `budget`, `city_search`, `calendar`) come in when
their branches merge.

Named URLs defined here:
    home  signup  login  logout  dashboard  my_trips  create_trip
    trip_detail  trip_edit  trip_delete  profile
"""

from django.urls import path

from . import views

urlpatterns = [
    # entry
    path("", views.home, name="home"),
    # authentication
    path("signup/", views.signup_view, name="signup"),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    # dashboard
    path("dashboard/", views.dashboard, name="dashboard"),
    # trip CRUD
    path("trips/", views.my_trips, name="my_trips"),
    path("trips/new/", views.create_trip, name="create_trip"),
    # kept because the shared sidebar links to /create-trip/
    path("create-trip/", views.create_trip, name="create_trip_alias"),
    path("trips/<int:trip_id>/", views.trip_detail, name="trip_detail"),
    path("trips/<int:trip_id>/edit/", views.trip_edit, name="trip_edit"),
    path("trips/<int:trip_id>/delete/", views.trip_delete, name="trip_delete"),
    # profile
    path("profile/", views.profile, name="profile"),
]
