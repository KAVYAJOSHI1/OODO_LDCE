"""Custom authentication backend.

The login template labels its first field "Username / Email", so the backend
has to accept either. Everything else (password hashing, `is_active` checks)
is inherited from Django's own ModelBackend.
"""

import logging

from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

logger = logging.getLogger(__name__)


class EmailOrUsernameBackend(ModelBackend):
    """Authenticate against `username` first, then `email` (case-insensitive)."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        User = get_user_model()

        identifier = username or kwargs.get(User.USERNAME_FIELD) or kwargs.get("email")
        if not identifier or not password:
            return None

        identifier = identifier.strip()

        try:
            user = User.objects.get(username__iexact=identifier)
        except User.DoesNotExist:
            try:
                user = User.objects.get(email__iexact=identifier)
            except User.DoesNotExist:
                # Run the default hasher anyway so a wrong username and a wrong
                # password take the same amount of time (timing-attack guard).
                User().set_password(password)
                logger.info("login failed: no account for %r", identifier)
                return None
            except User.MultipleObjectsReturned:
                logger.error("data integrity: multiple users share email %r", identifier)
                return None

        if user.check_password(password) and self.user_can_authenticate(user):
            logger.info("login ok for user id=%s username=%s", user.pk, user.username)
            return user

        logger.info("login failed: bad password for %r", identifier)
        return None
