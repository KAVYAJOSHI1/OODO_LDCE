from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal


class City(models.Model):
    """City model with travel-related metadata"""

    name = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    # Cost index: 1 (cheapest) to 5 (most expensive)
    cost_index = models.IntegerField(
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Cost index from 1 (budget) to 5 (luxury)"
    )

    # Popularity score for search ranking
    popularity = models.IntegerField(
        default=50,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Popularity score 0-100"
    )

    # Average daily costs
    avg_hotel_cost = models.DecimalField(max_digits=10, decimal_places=2, default=50.00)
    avg_meal_cost = models.DecimalField(max_digits=10, decimal_places=2, default=15.00)
    avg_transport_cost = models.DecimalField(max_digits=10, decimal_places=2, default=10.00)

    # Location data (for future map integration)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)

    # Image for UI
    image_url = models.URLField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Cities"
        ordering = ['-popularity', 'name']

    def __str__(self):
        return f"{self.name}, {self.country}"

    def get_daily_budget_estimate(self):
        """Calculate estimated daily budget for this city"""
        return self.avg_hotel_cost + (self.avg_meal_cost * 3) + self.avg_transport_cost


class ActivityType(models.Model):
    """Categories for activities"""

    CATEGORY_CHOICES = [
        ('sightseeing', 'Sightseeing'),
        ('adventure', 'Adventure'),
        ('cultural', 'Cultural'),
        ('food', 'Food & Dining'),
        ('shopping', 'Shopping'),
        ('relaxation', 'Relaxation'),
        ('nightlife', 'Nightlife'),
        ('nature', 'Nature'),
        ('sports', 'Sports'),
        ('entertainment', 'Entertainment'),
    ]

    name = models.CharField(max_length=50, choices=CATEGORY_CHOICES, unique=True)
    icon = models.CharField(max_length=50, blank=True, help_text="Icon class name")

    def __str__(self):
        return self.get_name_display()


class Activity(models.Model):
    """Activity model for things to do in cities"""

    name = models.CharField(max_length=200)
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.ForeignKey(
        ActivityType,
        on_delete=models.SET_NULL,
        null=True,
        related_name='activities'
    )

    description = models.TextField(blank=True, null=True)

    # Cost and time
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    duration_hours = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        default=2.0,
        help_text="Duration in hours"
    )

    # Location
    address = models.CharField(max_length=300, blank=True, null=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)

    # Rating and popularity
    rating = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        default=4.0,
        validators=[MinValueValidator(0), MaxValueValidator(5)]
    )
    popularity = models.IntegerField(
        default=50,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )

    # Image
    image_url = models.URLField(blank=True, null=True)

    # Best time to visit
    best_time = models.CharField(max_length=100, blank=True, null=True, help_text="e.g., Morning, Evening")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Activities"
        ordering = ['-popularity', '-rating', 'name']

    def __str__(self):
        return f"{self.name} ({self.city.name})"


class Trip(models.Model):
    """Main Trip model"""

    STATUS_CHOICES = [
        ('planning', 'Planning'),
        ('upcoming', 'Upcoming'),
        ('ongoing', 'Ongoing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trips')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)

    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planning')

    # Budget
    budget = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=3, default='USD')

    # Number of people travelling. Multiplies per-person costs only
    # (meals + activities). Accommodation and transport are entered as
    # already-total amounts, so they are NOT multiplied.
    travelers = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Number of travellers; scales meal and activity costs"
    )

    # Sharing
    is_public = models.BooleanField(default=False)
    share_token = models.CharField(max_length=64, blank=True, null=True, unique=True)

    # Cover image
    cover_image_url = models.URLField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} by {self.user.username}"

    def get_duration_days(self):
        """Calculate trip duration in days"""
        if self.start_date and self.end_date:
            return (self.end_date - self.start_date).days + 1
        return 0

    def get_total_cost(self):
        """Total trip cost = every stop (transport + stay + activities +
        estimated meals) plus every manually logged expense."""
        total = Decimal('0.00')
        for stop in self.stops.all():
            total += stop.get_stop_cost()
        for expense in self.expenses.all():
            total += expense.amount
        return total

    def get_average_cost_per_day(self):
        """Average cost per day across the trip duration."""
        days = self.get_duration_days()
        if days <= 0:
            return Decimal('0.00')
        return (self.get_total_cost() / days).quantize(Decimal('0.01'))

    def get_budget_percentage(self):
        """How much of the set budget is used, 0-100+ (0 when no budget set)."""
        if self.budget and self.budget > 0:
            return float((self.get_total_cost() / self.budget) * 100)
        return 0.0

    def ensure_share_token(self):
        """Return the share token, generating one on first use."""
        if not self.share_token:
            import secrets
            self.share_token = secrets.token_urlsafe(32)
            self.save(update_fields=['share_token'])
        return self.share_token

    def is_over_budget(self):
        """Check if trip is over budget"""
        if self.budget > 0:
            return self.get_total_cost() > self.budget
        return False

    def get_budget_remaining(self):
        """Get remaining budget"""
        if self.budget > 0:
            return self.budget - self.get_total_cost()
        return Decimal('0.00')


class TripStop(models.Model):
    """A city/stop within a trip itinerary"""

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='stops')
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='trip_stops')

    # Order in the itinerary
    order = models.PositiveIntegerField(default=1)

    # Dates at this stop
    arrival_date = models.DateField(blank=True, null=True)
    departure_date = models.DateField(blank=True, null=True)

    # Accommodation
    accommodation_name = models.CharField(max_length=200, blank=True, null=True)
    accommodation_cost_per_night = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00
    )

    # Transport to this stop
    transport_mode = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="e.g., Flight, Train, Bus, Car"
    )
    transport_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'arrival_date']
        unique_together = ['trip', 'order']

    def __str__(self):
        return f"{self.city.name} (Stop #{self.order} in {self.trip.name})"

    def get_nights(self):
        """Number of nights slept at this stop"""
        if self.arrival_date and self.departure_date:
            return max(0, (self.departure_date - self.arrival_date).days)
        return 0

    def get_days(self):
        """Number of calendar days spent at this stop (inclusive).

        A stop always counts as at least one day once it exists, otherwise a
        same-day stop would contribute zero meals to the budget.
        """
        if self.arrival_date and self.departure_date:
            return max(1, (self.departure_date - self.arrival_date).days + 1)
        return 1

    def get_accommodation_total(self):
        """Total accommodation cost = per-night rate x nights"""
        return self.accommodation_cost_per_night * self.get_nights()

    def get_activities_cost(self):
        """Total activities cost at this stop (per person x travellers)"""
        per_person = sum(
            (ta.activity.cost for ta in self.trip_activities.all()),
            Decimal('0.00'),
        )
        return per_person * self.trip.travelers

    def get_meals_estimate(self):
        """Estimated meal spend at this stop.

        Derived from the city's average meal cost, assuming three meals a day
        for every traveller. This is an estimate, not a logged expense - if the
        user logs real food expenses they are shown on top of this.
        """
        return self.city.avg_meal_cost * 3 * self.get_days() * self.trip.travelers

    def get_stop_cost(self):
        """Total cost for this stop: transport + stay + activities + meals"""
        return (
            self.transport_cost
            + self.get_accommodation_total()
            + self.get_activities_cost()
            + self.get_meals_estimate()
        )


class TripActivity(models.Model):
    """An activity scheduled for a trip stop"""

    trip_stop = models.ForeignKey(TripStop, on_delete=models.CASCADE, related_name='trip_activities')
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name='trip_activities')

    # Scheduling
    scheduled_date = models.DateField(blank=True, null=True)
    scheduled_time = models.TimeField(blank=True, null=True)

    # Order within the day
    day_order = models.PositiveIntegerField(default=1)

    notes = models.TextField(blank=True, null=True)
    is_completed = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['scheduled_date', 'scheduled_time', 'day_order']
        verbose_name_plural = "Trip Activities"

    def __str__(self):
        return f"{self.activity.name} on {self.scheduled_date}"

    def get_cost(self):
        """Cost of this scheduled activity for the whole party"""
        return self.activity.cost * self.trip_stop.trip.travelers

    def get_end_time(self):
        """Estimated finish time, derived from the activity duration"""
        if not self.scheduled_time:
            return None
        from datetime import datetime, timedelta
        base = datetime.combine(
            self.scheduled_date or datetime.today().date(), self.scheduled_time
        )
        return (base + timedelta(hours=float(self.activity.duration_hours))).time()


class Expense(models.Model):
    """Additional expenses for a trip"""

    CATEGORY_CHOICES = [
        ('transport', 'Transport'),
        ('accommodation', 'Accommodation'),
        ('food', 'Food & Dining'),
        ('activities', 'Activities'),
        ('shopping', 'Shopping'),
        ('insurance', 'Travel Insurance'),
        ('visa', 'Visa & Documents'),
        ('communication', 'Communication'),
        ('other', 'Other'),
    ]

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='expenses')

    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    description = models.CharField(max_length=300)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    date = models.DateField(blank=True, null=True)

    # Receipt/proof
    receipt_url = models.URLField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.description} - {self.amount} ({self.category})"
