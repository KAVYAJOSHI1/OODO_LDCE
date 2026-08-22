"""
URL map for Custom Admin JSON API (/api/admin/*).
"""

from django.urls import path
from travel import admin_views as a

app_name = 'admin_api'

urlpatterns = [
    # Dashboard
    path('dashboard/stats/', a.admin_dashboard_stats, name='dashboard-stats'),
    path('dashboard/charts/', a.admin_dashboard_charts, name='dashboard-charts'),

    # Cities
    path('cities/', a.admin_cities_list, name='cities-list'),
    path('cities/save/', a.admin_city_save, name='city-save'),

    # Activities
    path('activities/', a.admin_activities_list, name='activities-list'),
    path('activities/save/', a.admin_activity_save, name='activity-save'),
    path('activities/<int:activity_id>/', a.admin_activity_delete, name='activity-delete'),

    # Trips
    path('trips/', a.admin_trips_list, name='trips-list'),
    path('trips/<int:trip_id>/detail/', a.admin_trip_detail, name='trip-detail'),
    path('trips/<int:trip_id>/toggle-public/', a.admin_trip_toggle_public, name='trip-toggle-public'),

    # Users
    path('users/', a.admin_users_list, name='users-list'),
    path('users/<int:user_id>/update-status/', a.admin_user_update_status, name='user-update-status'),

    # Profile
    path('profile/', a.admin_user_profile, name='user-profile'),

    # System Maintenance
    path('system/reseed/', a.admin_system_reseed, name='system-reseed'),

    # CSV Exports
    path('export/users/', a.admin_export_users_csv, name='export-users'),
    path('export/cities/', a.admin_export_cities_csv, name='export-cities'),
    path('export/activities/', a.admin_export_activities_csv, name='export-activities'),
    path('export/trips/', a.admin_export_trips_csv, name='export-trips'),
]

