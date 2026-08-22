# GlobeTrotter

A multi-city travel planning and budgeting web app, built for the Odoo Hackathon.

Plan a trip, add cities and activities to it, track the budget automatically as
you go, see it laid out on a day-by-day calendar, and share a read-only link
that anyone can copy into their own account.

**Stack:** Django 5 · SQLite · Django Templates · Vanilla JavaScript — no frontend
framework, no build step, no external API keys required.

---

## Contents

- [What it does](#what-it-does)
- [Getting started](#getting-started)
- [Logging in](#logging-in)
- [Admin panel](#admin-panel)
- [Running the tests](#running-the-tests)
- [Project structure](#project-structure)
- [Design notes](#design-notes)
- [Team](#team)

---

## What it does

- **Accounts** — sign up, log in with a username *or* email, session-based auth.
- **Trips** — create, view, edit, and delete trips with a title, dates, budget,
  and number of travelers.
- **Itinerary builder** — add city stops to a trip and schedule real catalog
  activities against them, with automatic conflict/overlap handling for
  same-day time slots.
- **Itinerary view** — the finished plan as a day-by-day route summary.
- **Budget tracker** — target budget vs. actual spend, broken down by category
  (transport, stay, activities, meals, other), with meals auto-estimated from
  each city's average cost and a manual expense log on top. Switch between any
  of your trips from a dropdown.
- **Calendar** — every scheduled activity laid out day by day for the trip.
- **Public sharing** — generate a share link for a trip; anyone with the link
  can view it read-only and copy it into their own account with one click.
- **Profile** — name, email, home city, and a short bio.
- **Admin panel** — a separate staff-only console (`/admin-panel/`) with
  platform analytics, city/activity catalog management, trip inspection, user
  management, and CSV exports.

## Getting started

Requires Python 3.12+. No other services (no Postgres, no Redis, no Docker) —
everything runs off a local SQLite file.

```bash
git clone https://github.com/KAVYAJOSHI1/OODO_LDCE.git
cd OODO_LDCE

pip install -r requirements.txt

python manage.py migrate
python manage.py seed_travel_data --demo

python manage.py runserver
```

Open **http://127.0.0.1:8000/**.

`seed_travel_data --demo` populates the city/activity catalog (27 cities, 135
activities) and a fully-built example trip so there's something real to look
at immediately. It's safe to re-run — it won't duplicate data.

## Logging in

| Account | Username | Password | Notes |
|---|---|---|---|
| Demo traveler | `demo` | `demo12345` | Comes with one complete example trip (Goa Adventure) — stops, scheduled activities, logged expenses, public share link |
| Your own | — | — | Sign up from the login page like any user |

## Admin panel

The admin console at `/admin-panel/` is separate from the regular app and from
Django's built-in `/admin/`. It needs a **staff** account, which isn't seeded
by default:

```bash
python manage.py createsuperuser
```

Log in with that account and you'll land on `/admin-panel/` automatically.

## Running the tests

```bash
python manage.py test travel
```

117 tests covering models, services, the budget engine, auth (including
cross-user access — one user can never read or edit another's trip), and the
full page/view layer. Takes a few minutes; that's expected.

## Project structure

```
config/                  Django project settings, root URLs
core/                     Auth, page views, the admin panel views, Profile model
  templatetags/icons.py   Inline-SVG icon set used throughout the UI
travel/                   Trip/City/Activity models, business logic (services.py),
                          JSON API (api_views.py), admin panel API (admin_views.py),
                          catalog seed data, test suite
templates/
  auth/                   Login, signup
  trips/                  Dashboard, trip CRUD, itinerary builder/view, budget,
                          calendar, city/activity search, profile, public share
  admin_custom/           The custom admin panel's templates
static/
  css/style.css           Shared stylesheet
  js/                     itinerary.js (trip builder logic), data.js (catalog
                          fallback), toast.js, validation.js, modals.js
  admin/                  Admin panel's own CSS/JS
docs/                     Backend setup and testing notes from early development
```

## Design notes

- All page-level views live in `core/views.py`; all trip/city/activity/budget
  logic lives in `travel/services.py` — the views stay thin and call into it.
- The itinerary builder is the one page with real client-side state: it hydrates
  from the server on load, and every add/remove action calls the JSON API in
  `travel/api_urls.py` and re-hydrates, so what you see always matches the
  database.
- No emoji in the UI — icons are inline SVG (`{% load icons %}` /
  `{% icon "name" %}`), so the app looks the same and works fully offline
  without any icon-font or CDN dependency.
- Currency defaults to INR (₹) throughout.

## Team

Built for the Odoo Hackathon by Neel (backend core), Kavya (UI system + admin
panel), Margish (travel/itinerary/budget logic), and Prince (integration,
testing, and remaining features).
