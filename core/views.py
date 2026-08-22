from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404, redirect, render

from travel.models import Trip


def signup_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')

    if request.method == 'POST':
        first_name = request.POST.get('first_name', '').strip()
        last_name = request.POST.get('last_name', '').strip()
        username = request.POST.get('username', '').strip()
        email = request.POST.get('email', '').strip()
        password = request.POST.get('password', '')
        confirm_password = request.POST.get('confirm_password', '')

        if not username or not password:
            messages.error(request, 'Username and password are required.')
        elif password != confirm_password:
            messages.error(request, 'Passwords do not match.')
        elif User.objects.filter(username=username).exists():
            messages.error(request, 'That username is already taken.')
        else:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
            )
            login(request, user)
            messages.success(request, f'Welcome to GlobeTrotter, {first_name or username}!')
            return redirect('dashboard')

    return render(request, 'auth/signup.html')


def login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')

    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('dashboard')
        messages.error(request, 'Invalid username or password.')

    return render(request, 'auth/login.html')


def logout_view(request):
    logout(request)
    return redirect('login')


@login_required
def dashboard(request):
    trips = Trip.objects.filter(user=request.user)
    context = {
        'trips': trips,
        'trips_count': trips.count(),
        'upcoming_count': trips.filter(status__in=['planning', 'upcoming']).count(),
    }
    return render(request, 'trips/dashboard.html', context)


@login_required
def my_trips(request):
    trips = Trip.objects.filter(user=request.user)
    return render(request, 'trips/my_trips.html', {'trips': trips})


@login_required
def create_trip(request):
    if request.method == 'POST':
        trip = Trip.objects.create(
            user=request.user,
            name=request.POST.get('title', 'Untitled Trip').strip(),
            description=request.POST.get('notes', ''),
            start_date=request.POST.get('start_date') or None,
            end_date=request.POST.get('end_date') or None,
            budget=request.POST.get('budget') or 0,
        )
        messages.success(request, f'Trip "{trip.name}" created! Now add cities and activities.')
        return redirect(f"/trips/builder/?trip={trip.id}")

    return render(request, 'trips/create_trip.html')


@login_required
def itinerary_builder(request):
    trip_id = request.GET.get('trip')
    trip = get_object_or_404(Trip, id=trip_id, user=request.user) if trip_id else \
        Trip.objects.filter(user=request.user).first()
    return render(request, 'trips/itinerary_builder.html', {'trip': trip})


@login_required
def itinerary_view(request):
    trip_id = request.GET.get('trip')
    trip = get_object_or_404(Trip, id=trip_id, user=request.user) if trip_id else \
        Trip.objects.filter(user=request.user).first()
    return render(request, 'trips/itinerary_view.html', {'trip': trip})


@login_required
def city_search(request):
    return render(request, 'trips/city_search.html')


@login_required
def activity_search(request):
    return render(request, 'trips/activity_search.html')


@login_required
def budget(request):
    trip_id = request.GET.get('trip')
    trip = get_object_or_404(Trip, id=trip_id, user=request.user) if trip_id else \
        Trip.objects.filter(user=request.user).first()
    return render(request, 'trips/budget.html', {'trip': trip})


@login_required
def calendar(request):
    trip_id = request.GET.get('trip')
    trip = get_object_or_404(Trip, id=trip_id, user=request.user) if trip_id else \
        Trip.objects.filter(user=request.user).first()
    return render(request, 'trips/calendar.html', {'trip': trip})


@login_required
def profile(request):
    if request.method == 'POST':
        user = request.user
        user.first_name = request.POST.get('first_name', user.first_name)
        user.last_name = request.POST.get('last_name', user.last_name)
        user.email = request.POST.get('email', user.email)
        user.save()
        messages.success(request, 'Profile updated.')
        return redirect('profile')

    return render(request, 'trips/profile.html')


def public_trip(request):
    token = request.GET.get('token')
    trip = get_object_or_404(Trip, share_token=token) if token else None
    return render(request, 'trips/public_trip.html', {'trip': trip})
