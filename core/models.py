from django.conf import settings
from django.db import models


class Profile(models.Model):
    """Extra account fields that don't belong on Django's built-in User."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    home_city = models.CharField(max_length=150, blank=True)
    bio = models.TextField(max_length=500, blank=True)

    def __str__(self):
        return f"Profile({self.user.username})"
