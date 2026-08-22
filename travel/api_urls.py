"""
URL map for the travel JSON API.
Author: Margish

Include from config/urls.py:

    path('api/travel/', include('travel.api_urls')),

Kept separate from travel/urls.py so the page routes and the data routes can be
owned by different people without stepping on each other.
"""

from django.urls import path

from travel import api_views as v

app_name = 'travel_api'

urlpatterns = [
    # --- City data -------------------------------------------------------
    path('cities/', v.city_search, name='city-search'),
    path('cities/popular/', v.popular_cities, name='city-popular'),
    path('cities/<int:city_id>/', v.city_detail, name='city-detail'),
    path('countries/', v.country_list, name='country-list'),

    # --- Activity data ---------------------------------------------------
    path('activities/', v.activity_search, name='activity-search'),
    path('activity-types/', v.activity_type_list, name='activity-type-list'),

    # --- Itinerary: stops ------------------------------------------------
    path('trips/<int:trip_id>/stops/add/', v.stop_add, name='stop-add'),
    path('trips/<int:trip_id>/stops/reorder/', v.stop_reorder, name='stop-reorder'),
    path('trips/<int:trip_id>/stops/auto-dates/', v.stops_auto_dates, name='stop-auto-dates'),
    path('stops/<int:stop_id>/update/', v.stop_update, name='stop-update'),
    path('stops/<int:stop_id>/move/', v.stop_move, name='stop-move'),
    path('stops/<int:stop_id>/delete/', v.stop_delete, name='stop-delete'),

    # --- Itinerary: activities -------------------------------------------
    path('stops/<int:stop_id>/activities/add/', v.trip_activity_add, name='trip-activity-add'),
    path('trip-activities/<int:trip_activity_id>/update/', v.trip_activity_update,
         name='trip-activity-update'),
    path('trip-activities/<int:trip_activity_id>/delete/', v.trip_activity_delete,
         name='trip-activity-delete'),

    # --- Reading a trip --------------------------------------------------
    path('trips/<int:trip_id>/itinerary/', v.trip_itinerary, name='trip-itinerary'),
    path('trips/<int:trip_id>/calendar/', v.trip_calendar, name='trip-calendar'),
    path('trips/<int:trip_id>/validate/', v.trip_validate, name='trip-validate'),

    # --- Budget ----------------------------------------------------------
    path('trips/<int:trip_id>/budget/', v.trip_budget, name='trip-budget'),
    path('trips/<int:trip_id>/expenses/add/', v.expense_add, name='expense-add'),
    path('expenses/<int:expense_id>/delete/', v.expense_delete, name='expense-delete'),
    path('estimate/', v.cost_estimate, name='cost-estimate'),
]
