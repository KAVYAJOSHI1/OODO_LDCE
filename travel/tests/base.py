"""Shared fixtures for the backend-core test-suite (auth + Trip CRUD)."""

from __future__ import annotations

import copy
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone

from travel.models import Trip

User = get_user_model()

# The app ships no templates (Member 2 owns the UI). Tests render against tiny
# stubs under travel/tests/templates/, wired in here via override_settings.
_TEST_TEMPLATES = copy.deepcopy(settings.TEMPLATES)
_TEST_TEMPLATES[0]["DIRS"] = [str(Path(__file__).resolve().parent / "templates")]


@override_settings(TEMPLATES=_TEST_TEMPLATES)
class TravelTestCase(TestCase):
    PASSWORD = "hackathon2026"

    def setUp(self):
        super().setUp()
        self.today = timezone.localdate()
        self._default_user = None

    def make_user(self, username="traveller", **kwargs):
        kwargs.setdefault("email", f"{username}@example.com")
        kwargs.setdefault("first_name", username.title())
        return User.objects.create_user(username=username, password=self.PASSWORD, **kwargs)

    def default_user(self):
        if self._default_user is None:
            self._default_user = self.make_user()
        return self._default_user

    def make_trip(self, user=None, *, start_offset=10, days=5, **kwargs):
        """Build a Trip using Member 3's field names (name, start/end, budget)."""
        start = self.today + timedelta(days=start_offset)
        kwargs.setdefault("name", "Test Trip")
        return Trip.objects.create(
            user=user or self.default_user(),
            start_date=start,
            end_date=start + timedelta(days=days - 1),
            **kwargs,
        )

    def login(self, user):
        ok = self.client.login(username=user.username, password=self.PASSWORD)
        self.assertTrue(ok, "test client failed to log in")
        return ok
