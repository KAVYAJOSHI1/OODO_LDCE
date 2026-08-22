from django.urls import path

from core import views

urlpatterns = [
    path('', views.home, name='home'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('signup/', views.signup_view, name='signup'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),

    path('trips/', views.my_trips, name='my_trips'),
    path('trips/create/', views.create_trip, name='create_trip'),
    path('trips/builder/', views.itinerary_builder, name='itinerary_builder'),
    path('trips/itinerary/', views.itinerary_view, name='itinerary_view'),
    path('trips/budget/', views.budget, name='budget'),
    path('trips/calendar/', views.calendar, name='calendar'),
    path('trips/<int:trip_id>/', views.trip_detail, name='trip_detail'),
    path('trips/<int:trip_id>/edit/', views.trip_edit, name='trip_edit'),
    path('trips/<int:trip_id>/delete/', views.trip_delete, name='trip_delete'),

    path('cities/', views.city_search, name='city_search'),
    path('activities/', views.activity_search, name='activity_search'),

    path('profile/', views.profile, name='profile'),
    path('public/', views.public_trip, name='public_trip'),
    path('public/copy/', views.copy_trip, name='copy_trip'),
]
