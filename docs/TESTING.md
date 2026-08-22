# How to test the backend core — confidence checklist

Run these yourself. Every command assumes the venv is active and `.env` exists
(or `GLOBETROTTER_DB_PASSWORD` is set).

---

## A. The automated suite (proves everything)

```bash
python manage.py test travel
```

Expect:

```
Ran 98 tests in ~170s
OK
```

`OK` means: models enforce every rule, signup/login/logout work (username **or**
email), one user cannot read/edit/delete another's trip, trip create/edit/delete
work, dashboard counts are right, and every URL name resolves.

By area:

```bash
python manage.py test travel.tests.test_models     # database rules (32)
python manage.py test travel.tests.test_auth        # signup / login (20)
python manage.py test travel.tests.test_services    # trip CRUD + dashboard (24)
python manage.py test travel.tests.test_views       # HTTP + permissions (22)
```

A failure names the exact test and assertion — send me that and I'll fix it.

---

## B. Click through it (needs Kavya's templates merged, or the admin)

Because the app ships no templates, browser pages only render once Member 2's
branch is merged. On the backend-only branch, use the admin to see the data:

```bash
python manage.py createsuperuser
python manage.py runserver
# visit http://127.0.0.1:8000/admin/  -> log in -> browse Users, Trips, ...
```

Or log in as **demo / demo12345** once templates are present.

---

## C. Verify ownership from the shell (the key security property)

```bash
python manage.py shell
```

```python
from travel import services
from travel.models import User

alice = User.objects.create_user("alice", password="x")
bob   = User.objects.create_user("bob", password="x")
t = services.create_trip(alice, title="Private", start_date="2026-10-01", end_date="2026-10-03")

services.get_user_trip(bob, t.pk)      # -> raises TripPermissionDenied   (correct!)
services.get_user_trip(alice, t.pk)    # -> returns the trip              (correct!)
```

---

## D. Where to look when something breaks

- `logs/errors.log` — every unhandled error with a full traceback.
- `logs/globetrotter.log` — one line per action, incl. `BLOCKED` cross-user attempts.
- The `runserver` terminal — the same INFO lines, live.
