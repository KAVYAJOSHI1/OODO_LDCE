"""Root URL configuration for GlobeTrotter."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    # Member 3 (Margish) travel-logic JSON API
    path("api/travel/", include("travel.api_urls")),
    path("", include("travel.urls")),
]

# Serve uploaded cover photos / avatars while DEBUG is on.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
