# GlobeTrotter — Backend Core (Member 1: Neel)

My scope: **Django project setup, all database models, migrations, authentication,
Trip CRUD, dashboard, profile, admin, and seed support.**

Not my scope (owned by teammates, they bring their own code on merge):
- **Member 3 (Margish):** city & activity data + seeding, search/filter, stop &
  activity logic, itinerary rendering, all budget calculation.
- **Member 4:** calendar, public sharing, integration/QA.

The 7 models live here (I own the schema); teammates' logic runs against them.

---

## 1. Setup (needs Python 3.12+ and a running PostgreSQL)

```bash
python -m venv .venv
.venv\Scripts\activate                       # Windows
pip install -r requirements.txt

psql -U postgres -c "CREATE DATABASE globetrotter;"   # one time
cp .env.example .env                          # then edit the password

python manage.py migrate
python manage.py seed_demo                    # demo account + a few trips
python manage.py runserver
```

Log in as **demo / demo12345**.

> Note: `seed_demo` seeds only a user and trips (my scope). Cities and activities
> come from Margish's seeder once his branch is merged.

---

## 2. Configuration — `.env`

`settings.py` loads a `.env` file (via `python-dotenv`). Copy `.env.example` to
`.env` and set your values. `.env` is git-ignored; `.env.example` is committed.

| Variable | Default |
|---|---|
| `DJANGO_SECRET_KEY` | dev key |
| `DJANGO_DEBUG` | `True` |
| `GLOBETROTTER_DB_NAME` | `globetrotter` |
| `GLOBETROTTER_DB_USER` | `postgres` |
| `GLOBETROTTER_DB_PASSWORD` | `root` |
| `GLOBETROTTER_DB_HOST` | `127.0.0.1` |
| `GLOBETROTTER_DB_PORT` | `5432` |

Anything set in the real OS environment overrides the file.

---

## 3. The data model (all 7 tables — my schema)

```
User ──< Trip ──< TripStop >── City
                    │           │
                    │           └──< Activity
                    └──< TripActivity >─(optional)─ Activity
         Trip ──< Expense
```

Rules are enforced twice — a `clean()` method (friendly error) **and** a database
`CheckConstraint` (bad data can't land even via the admin). Money is always
`Decimal`. `on_delete`: trip→children CASCADE; stop→City PROTECT; trip-activity→
Activity SET_NULL. Margish/Member 4 write logic against these tables and use the
`share_token` / `is_public` columns for sharing.

---

## 4. Service layer — `travel/services.py` (my part only)

Trip-level helpers the whole team can call. Business logic for stops/budget/
itinerary is Margish's separate module.

```python
from travel import services
trip  = services.create_trip(request.user, title="Goa", start_date="2026-10-20", end_date="2026-10-28")
trip  = services.get_user_trip(request.user, trip_id)     # checks ownership — always use this
trips = services.list_user_trips(request.user, q="goa", sort="date_desc")
services.update_trip(trip, title="New name")
services.delete_trip(trip)
ctx   = services.get_dashboard_context(request.user)      # counts + trip lists
services.update_profile(request.user, first_name="Neel", email="...")
```

`get_user_trip()` is the one line stopping user A from reading user B's trip
(raises `TripPermissionDenied`). Errors are typed in `travel/exceptions.py`;
views wrap them with `@handle_errors` so a failure is a flash message + redirect,
never a 500.

---

## 5. URLs I provide (for the templates)

`home login signup logout dashboard my_trips create_trip trip_detail
trip_edit trip_delete profile`

Names like `itinerary_view`, `budget`, `calendar`, `city_search` are **not** here
— Margish and Member 4 add those routes when their branches merge.

---

## 6. Templates

The app ships **no** templates — that's Member 2's (Kavya's) job. Her styled
templates render against my views/URLs on merge. (The test suite uses tiny stub
templates under `travel/tests/templates/`, which are test-only and never UI.)

---

## 7. Logging & admin

- `logs/globetrotter.log` — every action; `logs/errors.log` — errors + tracebacks.
  The `logs/` folder auto-creates on startup and is git-ignored.
- `python manage.py createsuperuser` then visit `/admin/` — all 7 models registered.
