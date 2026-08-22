"""
Management command to seed realistic community users, active trips, stops, activities, and real-world INR budgets for GlobeTrotter Admin.

Usage:
    python manage.py seed_community_data

Author: Antigravity AI Assistant
"""

from datetime import date, timedelta, time
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from travel.models import City, Activity, Trip, TripStop, TripActivity, Expense


class Command(BaseCommand):
    help = "Seed realistic users, active trips, and real-world INR financial data."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Updating city real-world INR prices..."))

        city_updates = {
            'Mumbai': {'hotel': 4500, 'meal': 700, 'transport': 450},
            'Delhi': {'hotel': 3500, 'meal': 550, 'transport': 350},
            'Goa': {'hotel': 3800, 'meal': 750, 'transport': 550},
            'Jaipur': {'hotel': 2800, 'meal': 450, 'transport': 300},
            'Agra': {'hotel': 2600, 'meal': 400, 'transport': 280},
            'Ahmedabad': {'hotel': 2400, 'meal': 380, 'transport': 250},
            'Lonavala': {'hotel': 2500, 'meal': 400, 'transport': 250},
            'Udaipur': {'hotel': 3200, 'meal': 500, 'transport': 350},
            'Bengaluru': {'hotel': 3800, 'meal': 600, 'transport': 400},
            'Tokyo': {'hotel': 10500, 'meal': 2200, 'transport': 1200},
            'Paris': {'hotel': 13500, 'meal': 2800, 'transport': 1500},
            'Rome': {'hotel': 9500, 'meal': 2200, 'transport': 900},
            'London': {'hotel': 15000, 'meal': 3200, 'transport': 1800},
            'Dubai': {'hotel': 16000, 'meal': 3500, 'transport': 1800},
            'Bali': {'hotel': 4500, 'meal': 900, 'transport': 700},
            'Bangkok': {'hotel': 3500, 'meal': 700, 'transport': 450},
        }

        for city_name, prices in city_updates.items():
            City.objects.filter(name=city_name).update(
                avg_hotel_cost=prices['hotel'],
                avg_meal_cost=prices['meal'],
                avg_transport_cost=prices['transport']
            )

        self.stdout.write(self.style.NOTICE("Seeding community user accounts..."))

        users_data = [
            {'username': 'arjun_sharma', 'first_name': 'Arjun', 'last_name': 'Sharma', 'email': 'arjun.sharma@example.com'},
            {'username': 'priya_patel', 'first_name': 'Priya', 'last_name': 'Patel', 'email': 'priya.patel@example.com'},
            {'username': 'rohan_mehta', 'first_name': 'Rohan', 'last_name': 'Mehta', 'email': 'rohan.mehta@example.com'},
            {'username': 'ananya_verma', 'first_name': 'Ananya', 'last_name': 'Verma', 'email': 'ananya.verma@example.com'},
            {'username': 'kabir_singh', 'first_name': 'Kabir', 'last_name': 'Singh', 'email': 'kabir.singh@example.com'},
            {'username': 'neha_gupta', 'first_name': 'Neha', 'last_name': 'Gupta', 'email': 'neha.gupta@example.com'},
            {'username': 'aditya_rao', 'first_name': 'Aditya', 'last_name': 'Rao', 'email': 'aditya.rao@example.com'},
        ]

        created_users = {}
        for ud in users_data:
            u, _ = User.objects.get_or_create(username=ud['username'], defaults=ud)
            u.set_password('password123')
            u.save()
            created_users[ud['username']] = u

        self.stdout.write(self.style.NOTICE("Seeding active trips with real-world budgets & expenses..."))

        trips_specs = [
            {
                'username': 'arjun_sharma',
                'name': 'Golden Triangle Cultural Tour',
                'description': 'Exploring the historical splendor of Delhi, Agra, and Jaipur in northern India.',
                'budget': 48000,
                'travelers': 2,
                'status': 'ongoing',
                'is_public': True,
                'start_offset': -2,
                'stops': [
                    ('Delhi', 2, 'Express Train', 1200, 'The Imperial Hotel', 3500),
                    ('Agra', 1, 'AC Private Cab', 1500, 'Radisson Blu Taj East', 3200),
                    ('Jaipur', 2, 'Highway Cruiser Bus', 900, 'Heritage Palace Haveli', 2800),
                ],
                'expenses': [
                    ('transport', 'Flight to Delhi (2 passengers)', 11500),
                    ('accommodation', 'Resort advance payments', 16000),
                    ('food', 'Fine dining at Bukhara Delhi', 4800),
                    ('activities', 'Monument entry tickets & guided tours', 3200),
                ]
            },
            {
                'username': 'priya_patel',
                'name': 'Goa Beach Party & Watersports',
                'description': 'Sun, sand, scuba diving, and nightlife across North and South Goa.',
                'budget': 55000,
                'travelers': 4,
                'status': 'upcoming',
                'is_public': True,
                'start_offset': 10,
                'stops': [
                    ('Goa', 4, 'Self-Drive SUV', 4500, 'Taj Holiday Village Resort', 4800),
                ],
                'expenses': [
                    ('accommodation', 'Luxury Beachfront Villa Stay', 19200),
                    ('activities', 'Scuba diving & Dudhsagar safari', 8400),
                    ('food', 'Seafood dinner at Thalassa', 6500),
                ]
            },
            {
                'username': 'rohan_mehta',
                'name': 'Monsoon Sahyadri Escape: Lonavala & Mumbai',
                'description': 'Cascading waterfalls, hill-station treks, and Marine Drive evening walks.',
                'budget': 28000,
                'travelers': 2,
                'status': 'planning',
                'is_public': False,
                'start_offset': 25,
                'stops': [
                    ('Lonavala', 2, 'Express Bus', 600, 'Fariyas Resort Lonavala', 2600),
                    ('Mumbai', 2, 'Local AC Taxi', 1000, 'Marine Drive Suites', 4200),
                ],
                'expenses': [
                    ('shopping', 'Lonavala Chikki & Fudge hamper', 1800),
                    ('food', 'High tea at Taj Mahal Palace Mumbai', 4200),
                ]
            },
            {
                'username': 'ananya_verma',
                'name': 'Tokyo Cherry Blossom & Tech Odyssey',
                'description': 'Experiencing traditional shrines, neon skyscrapers, and culinary marvels in Tokyo.',
                'budget': 185000,
                'travelers': 2,
                'status': 'upcoming',
                'is_public': True,
                'start_offset': 45,
                'stops': [
                    ('Tokyo', 5, 'JR Shinkansen & Subway Pass', 14000, 'Shinjuku Granbell Hotel', 10500),
                ],
                'expenses': [
                    ('flights', 'Return Airfare Mumbai-Tokyo', 78000),
                    ('accommodation', 'Hotel booking (5 nights)', 52500),
                    ('activities', 'TeamLab Planets & Skytree passes', 6800),
                    ('food', 'Tsukiji Market sushi tasting tour', 9200),
                ]
            },
            {
                'username': 'kabir_singh',
                'name': 'Grand European Highlights: Paris & Rome',
                'description': 'Romantic strolls along the Seine and walking through Roman ancient history.',
                'budget': 220000,
                'travelers': 2,
                'status': 'completed',
                'is_public': True,
                'start_offset': -60,
                'stops': [
                    ('Paris', 3, 'Paris Metro Pass', 3500, 'Le Marais Boutique Hotel', 13500),
                    ('Rome', 3, 'High Speed Frecciarossa Train', 6800, 'Piazza Navona Grand Hotel', 9500),
                ],
                'expenses': [
                    ('flights', 'Air France Flights (Delhi to Paris/Rome)', 96000),
                    ('accommodation', 'Boutique Hotel stays in Paris & Rome', 69000),
                    ('activities', 'Louvre Museum & Colosseum VIP tours', 14200),
                    ('food', 'Authentic Italian dinners & Trastevere wine', 18500),
                ]
            },
            {
                'username': 'neha_gupta',
                'name': 'Tropical Bali Villa & Beach Retreat',
                'description': 'Serene Ubud rice terraces, cliffside temples, and surf lessons in Kuta.',
                'budget': 88000,
                'travelers': 3,
                'status': 'ongoing',
                'is_public': True,
                'start_offset': -1,
                'stops': [
                    ('Bali', 5, 'Private Driver Scooter Hire', 3800, 'Ubud Rainforest Luxury Villa', 4500),
                ],
                'expenses': [
                    ('flights', 'Flights Bengaluru to Denpasar', 42000),
                    ('accommodation', 'Private Pool Villa in Ubud', 22500),
                    ('relaxation', 'Traditional Balinese Spa & Massage', 7500),
                ]
            },
            {
                'username': 'aditya_rao',
                'name': 'Luxury Dubai Desert & Skyline Escape',
                'description': 'Burj Khalifa observation deck, dune bashing safari, and gold souk shopping.',
                'budget': 150000,
                'travelers': 2,
                'status': 'upcoming',
                'is_public': True,
                'start_offset': 15,
                'stops': [
                    ('Dubai', 4, 'Private Metro & Luxury Taxi', 4800, 'Address Downtown Dubai Hotel', 16000),
                ],
                'expenses': [
                    ('flights', 'Emirates Direct Flights', 54000),
                    ('accommodation', '5-Star Downtown Hotel', 64000),
                    ('activities', 'VIP Desert Safari & Burj Khalifa FastPass', 16500),
                ]
            }
        ]

        today = date.today()
        for spec in trips_specs:
            u = created_users[spec['username']]
            Trip.objects.filter(user=u, name=spec['name']).delete()

            start_d = today + timedelta(days=spec['start_offset'])
            total_nights = sum(s[1] for s in spec['stops'])
            end_d = start_d + timedelta(days=total_nights)

            trip = Trip.objects.create(
                user=u,
                name=spec['name'],
                description=spec['description'],
                start_date=start_d,
                end_date=end_d,
                budget=spec['budget'],
                travelers=spec['travelers'],
                status=spec['status'],
                is_public=spec['is_public'],
                currency='INR'
            )

            cursor = start_d
            for city_name, nights, mode, t_cost, hotel_name, h_rate in spec['stops']:
                city = City.objects.filter(name=city_name).first()
                if not city:
                    continue
                stop = TripStop.objects.create(
                    trip=trip,
                    city=city,
                    arrival_date=cursor,
                    departure_date=cursor + timedelta(days=nights),
                    accommodation_name=hotel_name,
                    accommodation_cost_per_night=h_rate,
                    transport_mode=mode,
                    transport_cost=t_cost,
                    order=trip.stops.count() + 1
                )

                acts = Activity.objects.filter(city=city)[:2]
                for offset, act in enumerate(acts):
                    TripActivity.objects.create(
                        trip_stop=stop,
                        activity=act,
                        scheduled_date=cursor + timedelta(days=min(offset, nights)),
                        scheduled_time=time(10 + offset * 4, 0)
                    )

                cursor = stop.departure_date

            for category, desc, amt in spec['expenses']:
                Expense.objects.create(
                    trip=trip,
                    category=category,
                    description=desc,
                    amount=amt,
                    date=start_d
                )

        self.stdout.write(self.style.SUCCESS("Seeded 7 active community trips with real-world INR budget & expense data."))
