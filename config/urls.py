"""Root URL configuration for GlobeTrotter."""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    # Member 3 (Margish) travel-logic JSON API
    path("api/travel/", include("travel.api_urls")),
    # Custom Admin JSON API
    path("api/admin/", include("travel.admin_urls")),
    path("", include("core.urls")),
]
