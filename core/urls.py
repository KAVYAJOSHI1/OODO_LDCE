from django.urls import path

from core import views

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path('signup/', views.signup_view, name='signup'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),

    path('trips/', views.my_trips, name='my_trips'),
    path('trips/create/', views.create_trip, name='create_trip'),
    path('trips/builder/', views.itinerary_builder, name='itinerary_builder'),
    path('trips/itinerary/', views.itinerary_view, name='itinerary_view'),
    path('trips/budget/', views.budget, name='budget'),
    path('trips/calendar/', views.calendar, name='calendar'),

    path('cities/', views.city_search, name='city_search'),
    path('activities/', views.activity_search, name='activity_search'),

    path('profile/', views.profile, name='profile'),
    path('public/', views.public_trip, name='public_trip'),
]
