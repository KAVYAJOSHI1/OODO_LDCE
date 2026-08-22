"""Authentication tests: signup, login (username or email), logout, access control."""

from django.contrib.auth import get_user_model
from django.urls import reverse

from .base import TravelTestCase

User = get_user_model()


class SignupTests(TravelTestCase):
    def test_signup_page_loads(self):
        response = self.client.get(reverse("signup"))
        self.assertEqual(response.status_code, 200)

    def test_signup_creates_an_account_and_logs_in(self):
        response = self.client.post(
            reverse("signup"),
            {
                "first_name": "Margish",
                "last_name": "Shah",
                "username": "margish",
                "email": "Margish@Example.com",
                "password": "traveller2026",
                "confirm_password": "traveller2026",
            },
            follow=True,
        )

        self.assertEqual(response.status_code, 200)
        user = User.objects.get(username="margish")
        self.assertEqual(user.email, "margish@example.com")   # lowercased
        self.assertTrue(user.check_password("traveller2026"))
        # Already signed in -- no second login step needed.
        self.assertEqual(int(self.client.session["_auth_user_id"]), user.pk)

    def test_mismatched_passwords_are_rejected(self):
        self.client.post(
            reverse("signup"),
            {
                "first_name": "A", "last_name": "B", "username": "mismatch",
                "email": "m@example.com",
                "password": "traveller2026", "confirm_password": "different2026",
            },
        )
        self.assertFalse(User.objects.filter(username="mismatch").exists())

    def test_weak_password_is_rejected(self):
        self.client.post(
            reverse("signup"),
            {
                "first_name": "A", "last_name": "B", "username": "weak",
                "email": "w@example.com",
                "password": "123", "confirm_password": "123",
            },
        )
        self.assertFalse(User.objects.filter(username="weak").exists())

    def test_duplicate_username_is_rejected(self):
        self.make_user("taken")
        self.client.post(
            reverse("signup"),
            {
                "first_name": "A", "last_name": "B", "username": "taken",
                "email": "other@example.com",
                "password": "traveller2026", "confirm_password": "traveller2026",
            },
        )
        self.assertEqual(User.objects.filter(username="taken").count(), 1)

    def test_duplicate_email_is_rejected(self):
        self.make_user("first", email="shared@example.com")
        self.client.post(
            reverse("signup"),
            {
                "first_name": "A", "last_name": "B", "username": "second",
                "email": "shared@example.com",
                "password": "traveller2026", "confirm_password": "traveller2026",
            },
        )
        self.assertFalse(User.objects.filter(username="second").exists())


class LoginTests(TravelTestCase):
    def setUp(self):
        super().setUp()
        self.user = self.make_user("neel", email="neel@example.com")

    def test_login_with_username(self):
        response = self.client.post(
            reverse("login"),
            {"username": "neel", "password": self.PASSWORD},
            follow=True,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(int(self.client.session["_auth_user_id"]), self.user.pk)

    def test_login_with_email_because_the_form_says_username_or_email(self):
        self.client.post(
            reverse("login"),
            {"username": "neel@example.com", "password": self.PASSWORD},
        )
        self.assertEqual(int(self.client.session["_auth_user_id"]), self.user.pk)

    def test_login_with_email_is_case_insensitive(self):
        self.client.post(
            reverse("login"),
            {"username": "NEEL@EXAMPLE.COM", "password": self.PASSWORD},
        )
        self.assertEqual(int(self.client.session["_auth_user_id"]), self.user.pk)

    def test_wrong_password_does_not_log_in(self):
        self.client.post(reverse("login"), {"username": "neel", "password": "nope"})
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_unknown_user_does_not_log_in(self):
        self.client.post(reverse("login"), {"username": "ghost", "password": "nope"})
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_inactive_user_cannot_log_in(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        self.client.post(reverse("login"), {"username": "neel", "password": self.PASSWORD})
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_remember_me_controls_session_expiry(self):
        self.client.post(
            reverse("login"),
            {"username": "neel", "password": self.PASSWORD, "remember_me": "on"},
        )
        self.assertFalse(self.client.session.get_expire_at_browser_close())

        self.client.logout()
        self.client.post(reverse("login"), {"username": "neel", "password": self.PASSWORD})
        self.assertTrue(self.client.session.get_expire_at_browser_close())

    def test_next_parameter_is_honoured_for_local_urls(self):
        target = reverse("my_trips")
        response = self.client.post(
            f"{reverse('login')}?next={target}",
            {"username": "neel", "password": self.PASSWORD},
        )
        self.assertRedirects(response, target)

    def test_next_parameter_cannot_send_you_off_site(self):
        """An open redirect here would be a real security bug."""
        response = self.client.post(
            f"{reverse('login')}?next=https://evil.example.com/steal",
            {"username": "neel", "password": self.PASSWORD},
        )
        self.assertRedirects(response, reverse("dashboard"))

    def test_already_signed_in_users_skip_the_login_page(self):
        self.login(self.user)
        response = self.client.get(reverse("login"))
        self.assertRedirects(response, reverse("dashboard"))


class LogoutTests(TravelTestCase):
    def test_logout_works_with_a_plain_link(self):
        """The shared sidebar logs out with <a href>, i.e. a GET."""
        user = self.make_user()
        self.login(user)

        response = self.client.get(reverse("logout"))

        self.assertRedirects(response, reverse("login"))
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_logout_also_accepts_post(self):
        user = self.make_user()
        self.login(user)
        self.client.post(reverse("logout"))
        self.assertNotIn("_auth_user_id", self.client.session)


class AccessControlTests(TravelTestCase):
    PROTECTED = ["dashboard", "my_trips", "create_trip", "profile"]

    def test_anonymous_visitors_are_sent_to_the_login_page(self):
        for name in self.PROTECTED:
            with self.subTest(url=name):
                response = self.client.get(reverse(name))
                self.assertEqual(response.status_code, 302)
                self.assertIn(reverse("login"), response.url)

    def test_home_redirects_by_auth_state(self):
        self.assertRedirects(self.client.get("/"), reverse("login"))

        self.login(self.make_user())
        self.assertRedirects(self.client.get("/"), reverse("dashboard"))
