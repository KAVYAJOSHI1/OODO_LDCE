"""
Django admin registration -- Member 1.

Registers Member 3's travel models so the team has a data editor. Field lists
are kept to columns known to exist on his models, so the admin never breaks if
he tweaks a minor field.
"""

from django.contrib import admin

from .models import Activity, ActivityType, City, Expense, Trip, TripActivity, TripStop


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ("name", "country", "cost_index", "popularity")
    list_filter = ("country",)
    search_fields = ("name", "country")
    ordering = ("-popularity", "name")


@admin.register(ActivityType)
class ActivityTypeAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "activity_type", "cost")
    list_filter = ("activity_type", "city__country")
    search_fields = ("name", "city__name")
    autocomplete_fields = ()


class TripStopInline(admin.TabularInline):
    model = TripStop
    extra = 0


class ExpenseInline(admin.TabularInline):
    model = Expense
    extra = 0


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "status", "start_date", "end_date", "budget")
    list_filter = ("status",)
    search_fields = ("name", "user__username", "user__email")
    inlines = (TripStopInline, ExpenseInline)


@admin.register(TripStop)
class TripStopAdmin(admin.ModelAdmin):
    list_display = ("trip", "city")
    search_fields = ("trip__name", "city__name")


@admin.register(TripActivity)
class TripActivityAdmin(admin.ModelAdmin):
    list_display = ("trip_stop", "activity")
    search_fields = ("activity__name",)


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("trip", "amount")
    search_fields = ("trip__name",)


admin.site.site_header = "GlobeTrotter Administration"
admin.site.site_title = "GlobeTrotter"
admin.site.index_title = "Travel data"
