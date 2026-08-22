# Travel Logic — Integration Guide

**Branch:** `feature/margish-travel-logic` · **Owner:** Margish (Member 3)

Everything in the `travel/` package is self-contained. There is no `views.py`,
no `urls.py` and no `admin.py` in here, so Neel's core Django files and my
travel logic can be merged without touching the same files.

---

## 1. Wiring it up (Neel / Prince — 3 lines)

**`config/settings.py`**

```python
INSTALLED_APPS = [
    ...,
    'travel',
]
```

**`config/urls.py`**

```python
from django.urls import include, path

urlpatterns = [
    ...,
    path('api/travel/', include('travel.api_urls')),   # JSON endpoints
]
```

**Terminal**

```bash
python manage.py migrate
python manage.py seed_travel_data --demo     # catalogue + the demo trip
python manage.py test travel                 # 78 tests, all green
```

`seed_travel_data` is idempotent — running it twice changes nothing.

| Flag | Effect |
|---|---|
| *(none)* | 27 cities, 10 activity types, 135 activities |
| `--reset` | wipes the catalogue first |
| `--demo` | also builds the `Goa Adventure` demo trip (login `demo` / `demo12345`) |

---

## 2. Models

`travel/models.py` holds `City`, `ActivityType`, `Activity`, `Trip`,
`TripStop`, `TripActivity` and `Expense` — the exact relational shape from
section 5 of the architecture doc.

Two additions worth knowing about:

- **`Trip.travelers`** (default `1`) scales *per-person* costs only: meals and
  activities. Accommodation and transport are entered as already-total amounts
  and are **not** multiplied.
- **`TripStop.get_meals_estimate()`** derives meal spend from
  `city.avg_meal_cost × 3 meals × days × travelers`. This is what puts *Meals*
  into the budget without the user logging a single expense. Any food expense
  they *do* log is added on top.

Handy model methods the templates can call directly:

```
trip.get_duration_days()          trip.get_total_cost()
trip.get_average_cost_per_day()   trip.get_budget_percentage()
trip.is_over_budget()             trip.ensure_share_token()

stop.get_nights()                 stop.get_days()
stop.get_accommodation_total()    stop.get_activities_cost()
stop.get_meals_estimate()         stop.get_stop_cost()

trip_activity.get_cost()          trip_activity.get_end_time()
```

> All money is stored in one currency scale (`Trip.currency`, default `USD`).
> The seeded costs are all on that same scale, so totals are consistent — but
> switching the demo to `INR` means re-scaling the seed numbers, not just
> changing the symbol.

---

## 3. Calling the logic from Python (`travel/services.py`)

Prefer these over hand-written ORM calls — they handle ordering, validation and
the budget maths.

```python
from travel.services import (
    CityService, ActivityService, ItineraryService, BudgetService, ItineraryError,
)
```

### CityService
`search_cities(query, country, min_cost, max_cost, min_popularity, order_by, limit)`
· `get_popular_cities()` · `get_budget_cities()` · `get_cities_by_country()`
· `get_countries()` · `get_city_with_activities(city_id)`

### ActivityService
`search_activities(query, city_id, activity_type, min_cost, max_cost, max_duration, min_rating, order_by, limit)`
· `get_activities_for_city()` · `get_free_activities()` · `get_top_rated_activities()`
· `get_activity_types()` · `get_activity_type_counts(city_id)`

### ItineraryService
| Method | Notes |
|---|---|
| `create_trip(user, name, ...)` | generates the `share_token` up front |
| `add_stop_to_trip(trip, city_id, ...)` | appends by default; passing `order` inserts and shifts the rest |
| `update_stop(stop_id, **fields)` | whitelisted fields only |
| `reorder_stops(trip, [stop_id, ...])` | accepts a plain id list **or** `(id, order)` pairs |
| `move_stop(stop_id, 'up'\|'down')` | returns `False` at the ends |
| `remove_stop(stop_id)` | closes the gap in the ordering |
| `auto_assign_stop_dates(trip)` | spreads the trip dates evenly across stops |
| `add_activity_to_stop(stop_id, activity_id, ...)` | defaults to the stop's arrival date |
| `update_activity_schedule(ta_id, ...)` | re-times an activity |
| `remove_activity(ta_id)` | |
| `get_trip_itinerary(trip_id)` | stops + activities grouped by date |
| `get_itinerary_by_day(trip_id)` | one entry per calendar day → calendar view |
| `get_unscheduled_activities(trip_id)` | activities with no date yet |
| `get_itinerary_duration(trip_id)` | trip days vs. what the stops add up to |
| `validate_itinerary(trip_id)` | list of `{level, message}` warnings |

### BudgetService
`calculate_trip_budget(trip_id, include_estimated_meals=True)` ·
`get_budget_summary(trip_id)` · `get_budget_warning(trip_id, threshold=0.8)` ·
`estimate_trip_cost(city_ids, days_per_city, travel_style, travelers)` ·
`add_expense(...)` · `delete_expense(expense_id)`

**Errors:** anything the user could get wrong raises `ItineraryError`
(a `ValueError`). Catch it and show `str(exc)` — the messages are already
written for a human:

```python
try:
    ItineraryService.add_stop_to_trip(trip, city_id=city_id, arrival_date=d1, departure_date=d2)
except ItineraryError as exc:
    messages.error(request, str(exc))
```

---

## 4. JSON API (Kavya / Prince)

Base path: **`/api/travel/`**

Every response is `{"ok": true, ...}` or `{"ok": false, "error": "..."}`, so the
front-end only ever has to branch on `data.ok`.

### Read — no login needed
| Method | Path | Query params |
|---|---|---|
| GET | `cities/` | `q`, `country`, `min_cost`, `max_cost`, `min_popularity`, `order_by`, `limit` |
| GET | `cities/popular/` | `limit` |
| GET | `cities/<id>/` | — (returns the city plus its activities) |
| GET | `countries/` | — |
| GET | `activities/` | `q`, `city`, `type`, `min_cost`, `max_cost`, `max_duration`, `min_rating`, `order_by`, `limit` |
| GET | `activity-types/` | `city` (adds a per-city `count`) |
| GET | `estimate/` | `cities=1,2,3`, `days`, `style`, `travelers` |

`order_by` for cities: `popularity` (default) · `name` · `cost_low` · `cost_high`
For activities, also: `rating` · `duration`

### Write — login required, owner-checked
Someone else's trip returns **404**, never someone else's data.

| Method | Path | Body |
|---|---|---|
| POST | `trips/<id>/stops/add/` | `city_id`, `arrival_date`, `departure_date`, `accommodation_name`, `accommodation_cost`, `transport_mode`, `transport_cost`, `notes`, `order` |
| POST | `trips/<id>/stops/reorder/` | `{"order": [stop_id, stop_id, ...]}` |
| POST | `trips/<id>/stops/auto-dates/` | `nights_per_stop` *(optional)* |
| POST | `stops/<id>/update/` | any subset of the stop fields |
| POST | `stops/<id>/move/` | `direction`: `up` \| `down` |
| POST | `stops/<id>/delete/` | — (returns the renumbered stop list) |
| POST | `stops/<id>/activities/add/` | `activity_id`, `scheduled_date`, `scheduled_time`, `day_order`, `notes` |
| POST | `trip-activities/<id>/update/` | `scheduled_date`, `scheduled_time`, `day_order`, `notes` |
| POST | `trip-activities/<id>/delete/` | — |
| POST | `trips/<id>/expenses/add/` | `category`, `description`, `amount`, `date` |
| POST | `expenses/<id>/delete/` | — |

| Method | Path | Returns |
|---|---|---|
| GET | `trips/<id>/itinerary/` | `trip`, `stops[]` (with activities), `duration`, `issues[]` |
| GET | `trips/<id>/calendar/` | `days[]` (one per date), `unscheduled[]` |
| GET | `trips/<id>/budget/` | full `budget` breakdown + `warning` (`?meals=0` to drop the estimate) |
| GET | `trips/<id>/validate/` | `issues[]` + `duration` |

Dates are `YYYY-MM-DD`, times are `HH:MM`, money is a **2-decimal string**
(`"270.00"`) so JavaScript floats never mangle a total.

### Example — the itinerary builder

```javascript
// 1. search cities as the user types
const r = await fetch(`/api/travel/cities/?q=${encodeURIComponent(term)}&limit=8`);
const { ok, results } = await r.json();

// 2. add the chosen city as a stop
await postJSON(`/api/travel/trips/${tripId}/stops/add/`, {
  city_id: cityId,
  arrival_date: '2026-10-20',
  departure_date: '2026-10-23',
  transport_mode: 'Flight',
  transport_cost: '180.00',
});

// 3. drag-and-drop reorder
await postJSON(`/api/travel/trips/${tripId}/stops/reorder/`, { order: [3, 1, 2] });

// 4. refresh the budget bar
const { budget, warning } = await (await fetch(`/api/travel/trips/${tripId}/budget/`)).json();
bar.style.width = Math.min(budget.percentage_used, 100) + '%';
bar.classList.toggle('over-budget', budget.is_over_budget);
```

`postJSON` needs the CSRF token:

```javascript
async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) showToast(data.error, 'error');
  return data;
}
```

Form-encoded POSTs work too — the handlers read `request.POST` when the content
type is not JSON, so a plain `<form>` submit hits the same code path.

### Budget response shape

```json
{
  "ok": true,
  "budget": {
    "currency": "USD", "travelers": 2,
    "set_budget": "2500.00", "total_cost": "1418.00",
    "daily_average": "177.25", "per_person": "709.00",
    "remaining": "1082.00", "is_over_budget": false,
    "over_by": "0.00", "percentage_used": 56.7,
    "categories": [
      {"key": "transport",     "label": "Transport",  "amount": "220.00", "percentage": 15.5},
      {"key": "accommodation", "label": "Stay",       "amount": "390.00", "percentage": 27.5},
      {"key": "activities",    "label": "Activities", "amount": "184.00", "percentage": 13.0},
      {"key": "food",          "label": "Meals",      "amount": "474.00", "percentage": 33.4},
      {"key": "other",         "label": "Other",      "amount": "150.00", "percentage": 10.6}
    ],
    "transport_details": [], "accommodation_details": [],
    "activities_details": [], "meal_details": [], "expense_details": []
  },
  "warning": {"has_warning": false, "severity": "success", "message": "...", "percentage": 56.7}
}
```

`categories` is ordered and pre-computed with percentages — render it straight
into the breakdown bar, no arithmetic in the template.

---

## 5. Templates

`travel/serializers.py` also works server-side when you would rather not fetch:

```python
from travel.services import BudgetService, ItineraryService
from travel import serializers

def budget_page(request, trip_id):
    budget = BudgetService.calculate_trip_budget(trip_id)
    return render(request, 'trips/budget.html', {
        'budget': budget,                                   # Decimals, for the template
        'budget_json': serializers.budget_to_dict(budget),  # JSON-safe, for JS
        'warning': BudgetService.get_budget_warning(trip_id),
    })
```

---

## 6. Sharing

`Trip.share_token` is populated by `ItineraryService.create_trip()`.
For trips created some other way, call `trip.ensure_share_token()` — it
generates one on first use and saves it.

The public view is Prince's (`/trip/share/<share_token>/`); it can call
`ItineraryService.get_trip_itinerary(trip.id)` and
`BudgetService.get_budget_summary(trip.id)` exactly like the private pages do —
neither touches `request.user`.

---

## 7. What is deliberately *not* here

`views.py`, `urls.py`, `forms.py`, `admin.py` — those belong to Neel's core so
we do not both edit the same file. If admin registration is wanted, it is a
short `admin.py` over the seven models in `travel/models.py`.
