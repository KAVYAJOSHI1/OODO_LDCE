
GLOBETROTTER — FINAL TASK DISTRIBUTION

This is the final task division based on the architecture document. Everyone will work on separate branches and integration will begin from 11:00 AM onwards.

1. NEEL BHAI — MEMBER 1
   Branch: feature/neel-django-core

Responsibility: Django Backend + Database Core

Tasks:
• Django project/app setup
• settings.py configuration
• Database configuration
• Django models: User, Trip, City, TripStop, Activity, TripActivity, Expense
• Migrations
• Authentication: Signup, Login, Logout
• URL routing
• Core Django views
• Trip CRUD: Create, Read, Update, Delete
• Basic backend forms/validation
• Django admin setup if needed
• Prepare backend for frontend integration
• Initial database/seed-data support

Priority: Backend must be stable and usable by 11 AM integration.

Do NOT spend time on UI styling. Use the standard templates/CSS structure already created.

2. KAVYA — MEMBER 2
   Branch: feature/kavya-ui-system

Responsibility: ALL UI pages + frontend design using the STANDARD CSS folder as the single design reference.

Pages:
• Login
• Signup
• Dashboard
• Create Trip
• My Trips
• Itinerary Builder
• City Search
• Activity Search
• Itinerary View
• Budget
• Calendar/Timeline
• Public/Shared Trip
• Profile/Settings

Responsibilities:
• HTML/Django templates
• Odoo-inspired common UI
• Shared base.html
• Navbar/sidebar
• Cards, buttons, forms and tables
• Trip cards
• Timeline
• Budget UI
• Responsive design
• Vanilla JS for required frontend interactions

Important: Do not create separate CSS systems. Everything must follow STANDARD CSS/style.css.

3. MARGISH BHAI — MEMBER 3
   Branch: feature/margish-travel-logic

Responsibility: Travel Data + Itinerary + Budget Logic

City Data:
• Seed cities
• Country
• Cost index
• Popularity
• Search/filter

Activity Data:
• Seed activities
• Activity type
• Cost
• Duration
• Description
• City association
• Search/filter

Itinerary Logic:
• Add city/stop to trip
• Assign start/end dates
• Stop ordering
• Add activities to stops
• Activity date/time
• Remove activities
• Calculate itinerary duration

Budget Logic:
• Transport
• Stay
• Activities
• Meals
• Other expenses
• Total trip cost
• Average cost/day
• Budget comparison
• Over-budget warning

Make sure the logic works with Neel's Django models and is easy for the UI to consume.

4. PRINCE BHAI — MEMBER 4
   Branch: feature/prince-integration

Start at 11 AM.

Responsibility: Integration + Testing + Further Features

Do not start building an isolated module before 11 AM. At 11 AM, start connecting everyone's work.

PHASE 1 — INTEGRATION

Connect:
Kavya UI
↓
Neel Django Backend
↓
Margish Travel Logic
↓
SQLite Database

Test:
Signup
↓
Login
↓
Dashboard
↓
Create Trip
↓
Add City
↓
Add Activity
↓
View Itinerary

PHASE 2 — FEATURES

After the core flow works:
• Calendar / Timeline
• Public Trip Sharing
• Share Token / Public URL
• Copy Trip
• Profile/Settings
• Any remaining required functionality

PHASE 3 — TESTING

Test the complete user journey:
Signup → Login → Create Trip → Add Stops → Add Activities → Edit Trip → Budget → Calendar → Share → Public View

Find and fix:
• Broken URLs
• Template errors
• Backend/frontend mismatches
• Database errors
• JS errors
• Form validation
• Edge cases
• Responsive issues

At 2 PM → FEATURE FREEZE.

From 2–3 PM ONLY:
• Bug fixing
• UI polish
• Integration
• Final testing
• GitHub
• Submission/demo preparation

BRANCH STRUCTURE

main
├── feature/neel-django-core
├── feature/kavya-ui-system
├── feature/margish-travel-logic
└── feature/prince-integration

IMPORTANT:
Do NOT directly work on main.

Create your branch:
git checkout -b feature/your-branch

Commit regularly:
git add .
git commit -m "feat: add trip models"
git push -u origin feature/your-branch

INTEGRATION RULE

At 11 AM, Prince starts integration.

Everyone should push their current working branch before integration.

Prince will pull the branches and merge them into the integration/main flow.

Do not wait until 2 PM to merge everything. Integrate incrementally.

TARGET TIMELINE

9–11 AM
Backend + UI + Travel Logic developed independently.

11–12 PM
FIRST END-TO-END FLOW MUST WORK:
LOGIN → DASHBOARD → CREATE TRIP → ADD CITY → ADD ACTIVITY → ITINERARY

12–1 PM
Budget + Calendar + Sharing integration.

1–2 PM
Testing + fixing + remaining features.

2–3 PM — FEATURE FREEZE
Only:
BUGS
UI POLISH
TESTING
GITHUB
SUBMISSION
DEMO

MOST IMPORTANT

Do not overbuild.

No React, FastAPI, MongoDB, Docker, complex AI, external travel APIs, maps, hotel APIs, etc. until the core system is completely working.

Stack:
Django + SQLite + HTML + CSS + Vanilla JS + Django Templates

The goal is not to have 100 half-working features.

The goal is to have one polished, completely working end-to-end GlobeTrotter demo.

By 12 PM: Working product.
By 2 PM: Feature complete.
By 3 PM: Stable + submission ready.
