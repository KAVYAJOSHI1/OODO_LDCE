"""
Forms and validation -- Member 1 (Backend core).

Auth + the trip create/edit form + profile. These work against Member 3's
`Trip` model (fields: name, description, start_date, end_date, budget) and
Django's default User.
"""

from __future__ import annotations

import logging

from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)
User = get_user_model()

CONTROL = {"class": "form-control"}

# template field name -> backend field name
ALIASES = {
    "title": "name",
    "trip_name": "name",
    "notes": "description",
    "trip_description": "description",
    "total_budget": "budget",
}


def normalize_trip_data(data) -> dict:
    """Copy a QueryDict into a plain dict, renaming aliased keys. A real key
    always wins over its alias."""
    clean = {key: value for key, value in data.items()}
    for alias, real in ALIASES.items():
        if alias in clean and not clean.get(real):
            clean[real] = clean.pop(alias)
    return clean


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------
class SignupForm(forms.Form):
    """Matches the fields in templates/auth/signup.html."""

    first_name = forms.CharField(max_length=150, widget=forms.TextInput(attrs=CONTROL))
    last_name = forms.CharField(max_length=150, required=False, widget=forms.TextInput(attrs=CONTROL))
    username = forms.CharField(max_length=150, widget=forms.TextInput(attrs=CONTROL))
    email = forms.EmailField(widget=forms.EmailInput(attrs=CONTROL))
    password = forms.CharField(widget=forms.PasswordInput(attrs=CONTROL))
    confirm_password = forms.CharField(widget=forms.PasswordInput(attrs=CONTROL))

    def clean_username(self):
        username = self.cleaned_data["username"].strip()
        if User.objects.filter(username__iexact=username).exists():
            raise ValidationError("That username is already taken.")
        return username

    def clean_email(self):
        email = self.cleaned_data["email"].strip().lower()
        if email and User.objects.filter(email__iexact=email).exists():
            raise ValidationError("An account with that email already exists.")
        return email

    def clean(self):
        cleaned = super().clean()
        password, confirm = cleaned.get("password"), cleaned.get("confirm_password")
        if password and confirm and password != confirm:
            self.add_error("confirm_password", "The two passwords do not match.")
        if password:
            probe = User(username=cleaned.get("username", ""), email=cleaned.get("email") or "")
            try:
                validate_password(password, probe)
            except ValidationError as exc:
                self.add_error("password", exc)
        return cleaned

    def save(self) -> "User":
        data = self.cleaned_data
        user = User.objects.create_user(
            username=data["username"],
            email=data["email"],
            password=data["password"],
            first_name=data["first_name"].strip(),
            last_name=data.get("last_name", "").strip(),
        )
        logger.info("signup: created user id=%s username=%s", user.pk, user.username)
        return user


class LoginForm(forms.Form):
    """Username *or* email, plus password. See travel/backends.py."""

    username = forms.CharField(widget=forms.TextInput(attrs=CONTROL))
    password = forms.CharField(widget=forms.PasswordInput(attrs=CONTROL))
    remember_me = forms.BooleanField(required=False)


# ---------------------------------------------------------------------------
# Trip create / edit  (maps onto Member 3's Trip model)
# ---------------------------------------------------------------------------
class TripForm(forms.Form):
    """Create / edit a trip. Cities/activities are added via the itinerary
    builder (Member 3)."""

    name = forms.CharField(max_length=200, widget=forms.TextInput(attrs=CONTROL))
    start_date = forms.DateField(required=False, widget=forms.DateInput(attrs={**CONTROL, "type": "date"}))
    end_date = forms.DateField(required=False, widget=forms.DateInput(attrs={**CONTROL, "type": "date"}))
    budget = forms.DecimalField(
        max_digits=12, decimal_places=2, min_value=0, required=False,
        widget=forms.NumberInput(attrs={**CONTROL, "min": 0, "step": 500}),
    )
    description = forms.CharField(required=False, widget=forms.Textarea(attrs={**CONTROL, "rows": 4}))

    def clean_name(self):
        name = self.cleaned_data["name"].strip()
        if len(name) < 3:
            raise ValidationError("Please use at least 3 characters.")
        return name

    def clean(self):
        cleaned = super().clean()
        start, end = cleaned.get("start_date"), cleaned.get("end_date")
        if start and end and end < start:
            self.add_error("end_date", "End date cannot be before the start date.")
        if cleaned.get("budget") in (None, ""):
            cleaned["budget"] = 0
        return cleaned

    def service_kwargs(self) -> dict:
        """Keyword arguments for `ItineraryService.create_trip`."""
        data = self.cleaned_data
        return {
            "name": data["name"],
            "description": data.get("description", ""),
            "start_date": data.get("start_date"),
            "end_date": data.get("end_date"),
            "budget": data.get("budget") or 0,
        }


# ---------------------------------------------------------------------------
# Profile (Django's default User: name + email)
# ---------------------------------------------------------------------------
class ProfileForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ["first_name", "last_name", "email"]
        widgets = {
            "first_name": forms.TextInput(attrs=CONTROL),
            "last_name": forms.TextInput(attrs=CONTROL),
            "email": forms.EmailInput(attrs=CONTROL),
        }

    def clean_email(self):
        email = (self.cleaned_data.get("email") or "").strip().lower()
        if not email:
            return email
        clash = User.objects.filter(email__iexact=email).exclude(pk=self.instance.pk)
        if clash.exists():
            raise ValidationError("Another account already uses that email.")
        return email
