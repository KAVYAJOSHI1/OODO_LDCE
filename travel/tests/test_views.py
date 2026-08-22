"""
View / HTTP tests for the backend core (Member 1), against Member 3's models.

Covers dashboard, Trip CRUD, profile and cross-user access. Itinerary / budget /
search live in Member 3's JSON API and are tested with his code.
"""

from datetime import timedelta

from django.urls import NoReverseMatch, reverse

from travel.models import Trip

from .base import TravelTestCase


class TripCrudViewTests(TravelTestCase):
    def setUp(self):
        super().setUp()
        self.user = self.make_user("crud")
        self.login(self.user)

    def _payload(self, **overrides):
        payload = {
            "title": "Kerala Backwaters",             # template posts name="title"
            "start_date": (self.today + timedelta(days=10)).isoformat(),
            "end_date": (self.today + timedelta(days=16)).isoformat(),
            "budget": "32000",
            "notes": "Houseboats and tea hills",       # template posts name="notes"
        }
        payload.update(overrides)
        return payload

    def test_create_trip_maps_template_field_names_to_the_model(self):
        response = self.client.post(reverse("create_trip"), self._payload())
        trip = Trip.objects.get(name="Kerala Backwaters")   # title -> name
        self.assertRedirects(response, reverse("trip_detail", args=[trip.pk]))
        self.assertEqual(trip.description, "Houseboats and tea hills")  # notes -> description
        self.assertEqual(str(trip.budget), "32000.00")
        self.assertEqual(trip.user, self.user)
        self.assertTrue(trip.share_token)                   # ItineraryService set it

    def test_create_trip_with_backwards_dates_is_rejected(self):
        self.client.post(
            reverse("create_trip"),
            self._payload(
                start_date=(self.today + timedelta(days=20)).isoformat(),
                end_date=(self.today + timedelta(days=10)).isoformat(),
            ),
        )
        self.assertEqual(Trip.objects.count(), 0)

    def test_create_trip_with_a_missing_title_is_rejected(self):
        self.client.post(reverse("create_trip"), self._payload(title=""))
        self.assertEqual(Trip.objects.count(), 0)

    def test_edit_trip(self):
        trip = self.make_trip(self.user, name="Before")
        response = self.client.post(
            reverse("trip_edit", args=[trip.pk]),
            {
                "title": "After",
                "start_date": trip.start_date.isoformat(),
                "end_date": trip.end_date.isoformat(),
                "budget": "5000",
                "notes": "changed",
            },
        )
        trip.refresh_from_db()
        self.assertRedirects(response, reverse("trip_detail", args=[trip.pk]))
        self.assertEqual(trip.name, "After")
        self.assertEqual(trip.description, "changed")

    def test_delete_trip_with_post(self):
        trip = self.make_trip(self.user, name="Delete me")
        response = self.client.post(reverse("trip_delete", args=[trip.pk]))
        self.assertRedirects(response, reverse("my_trips"))
        self.assertFalse(Trip.objects.filter(pk=trip.pk).exists())

    def test_a_bare_get_does_not_delete_anything(self):
        trip = self.make_trip(self.user, name="Keep me")
        self.client.get(reverse("trip_delete", args=[trip.pk]))
        self.assertTrue(Trip.objects.filter(pk=trip.pk).exists())

    def test_get_with_explicit_confirmation_does_delete(self):
        trip = self.make_trip(self.user, name="Confirmed")
        self.client.get(reverse("trip_delete", args=[trip.pk]), {"confirm": "1"})
        self.assertFalse(Trip.objects.filter(pk=trip.pk).exists())

    def test_missing_trip_is_a_404(self):
        self.assertEqual(self.client.get(reverse("trip_detail", args=[999999])).status_code, 404)


class PageRenderTests(TravelTestCase):
    def setUp(self):
        super().setUp()
        self.user = self.make_user("pager")
        self.login(self.user)
        self.trip = self.make_trip(self.user, name="Goa Adventure")

    def test_core_pages_render(self):
        for name in ["dashboard", "my_trips", "create_trip", "profile"]:
            with self.subTest(page=name):
                self.assertEqual(self.client.get(reverse(name)).status_code, 200)

    def test_trip_detail_and_edit_render(self):
        self.assertEqual(self.client.get(reverse("trip_detail", args=[self.trip.pk])).status_code, 200)
        self.assertEqual(self.client.get(reverse("trip_edit", args=[self.trip.pk])).status_code, 200)

    def test_dashboard_counts(self):
        context = self.client.get(reverse("dashboard")).context
        self.assertEqual(context["trips_count"], 1)


class CrossUserAccessTests(TravelTestCase):
    """A data-leak bug if any of these fail."""

    def setUp(self):
        super().setUp()
        self.alice = self.make_user("alice")
        self.bob = self.make_user("bob")
        self.trip = self.make_trip(self.alice, name="Alice private trip")
        self.login(self.bob)

    def test_bob_cannot_open_alices_trip(self):
        response = self.client.get(reverse("trip_detail", args=[self.trip.pk]))
        self.assertEqual(response.status_code, 404)          # owner-scoped fetch
        self.assertNotIn(b"Alice private trip", response.content)

    def test_bob_cannot_edit_alices_trip(self):
        self.client.post(
            reverse("trip_edit", args=[self.trip.pk]),
            {"title": "Hacked", "start_date": self.trip.start_date.isoformat(),
             "end_date": self.trip.end_date.isoformat()},
        )
        self.trip.refresh_from_db()
        self.assertEqual(self.trip.name, "Alice private trip")

    def test_bob_cannot_delete_alices_trip(self):
        self.client.post(reverse("trip_delete", args=[self.trip.pk]))
        self.assertTrue(Trip.objects.filter(pk=self.trip.pk).exists())

    def test_bobs_own_trip_list_stays_empty(self):
        response = self.client.get(reverse("my_trips"))
        self.assertEqual(list(response.context["trips"]), [])


class ProfileViewTests(TravelTestCase):
    def setUp(self):
        super().setUp()
        self.user = self.make_user("profiler")
        self.login(self.user)

    def test_profile_update(self):
        response = self.client.post(
            reverse("profile"),
            {"first_name": "Neel", "last_name": "Desai", "email": "neel.new@example.com"},
        )
        self.user.refresh_from_db()
        self.assertRedirects(response, reverse("profile"))
        self.assertEqual(self.user.first_name, "Neel")
        self.assertEqual(self.user.email, "neel.new@example.com")

    def test_taking_another_users_email_is_refused(self):
        self.make_user("rival", email="rival@example.com")
        self.client.post(
            reverse("profile"),
            {"first_name": "X", "last_name": "Y", "email": "rival@example.com"},
        )
        self.user.refresh_from_db()
        self.assertNotEqual(self.user.email, "rival@example.com")


class UrlCoverageTests(TravelTestCase):
    CORE_NAMES = ["home", "login", "signup", "logout", "dashboard", "my_trips", "create_trip", "profile"]
    PER_TRIP_NAMES = ["trip_detail", "trip_edit", "trip_delete"]

    def test_core_url_names_reverse(self):
        for name in self.CORE_NAMES:
            with self.subTest(name=name):
                try:
                    reverse(name)
                except NoReverseMatch as exc:   # pragma: no cover
                    self.fail(f"URL name '{name}' does not resolve: {exc}")

    def test_per_trip_names_reverse_with_an_id(self):
        for name in self.PER_TRIP_NAMES:
            with self.subTest(name=name):
                self.assertTrue(reverse(name, args=[1]))
