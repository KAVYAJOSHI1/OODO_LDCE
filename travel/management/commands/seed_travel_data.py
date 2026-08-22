"""
Management command to load the GlobeTrotter city and activity catalogue.

    python manage.py seed_travel_data
    python manage.py seed_travel_data --reset     # wipe catalogue first
    python manage.py seed_travel_data --demo      # also create the demo trip

Author: Margish
"""

from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = "Seed cities, activity types and activities for GlobeTrotter."

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete existing cities/activities before seeding.',
        )
        parser.add_argument(
            '--demo',
            action='store_true',
            help='Also create a demo user and a fully planned demo trip.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        from travel.models import Activity, ActivityType, City
        from travel.seed_data import seed_data, seed_demo_trip

        if options['reset']:
            self.stdout.write(self.style.WARNING('Clearing existing catalogue...'))
            Activity.objects.all().delete()
            City.objects.all().delete()
            ActivityType.objects.all().delete()

        stats = seed_data(stdout=self.stdout)

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {stats['cities']} cities, {stats['activity_types']} activity types "
            f"and {stats['activities']} activities."
        ))

        if options['demo']:
            trip = seed_demo_trip(stdout=self.stdout)
            self.stdout.write(self.style.SUCCESS(
                f"Demo trip ready: '{trip.name}' (login demo / demo12345)"
            ))
