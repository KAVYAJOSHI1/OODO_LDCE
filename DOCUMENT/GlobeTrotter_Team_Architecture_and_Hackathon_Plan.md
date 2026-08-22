# GLOBETROTTER — Complete Architecture, Development Flow & Hackathon Execution Plan

> **Odoo Hackathon** • 4-Member Team • Django + HTML/CSS + Vanilla JS  
> **Master Architecture & Integration Specification**

---

## 1. Objective & System Purpose

Build **GlobeTrotter** as a complete, working, personalized multi-city travel planning application. The core workflow allows users to:
`Authenticate` ➔ `Create Trip` ➔ `Add Cities/Stops` ➔ `Add Activities` ➔ `Calculate Budget` ➔ `Visualize Itinerary / Calendar` ➔ `Share Trip`.

The application meets all hackathon problem statement requirements: multi-city customized itineraries, travel dates, activity planning, budget estimators, city/activity catalog discovery, visual calendars, public read-only trip sharing, and one-click trip copying.

---

## 2. Technology Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Backend** | Python 3 + Django Web Framework | Fast, robust ORM, built-in authentication, server-side template rendering |
| **Database** | SQLite3 (Relational Storage) | Zero-configuration local database for deterministic demo execution |
| **Frontend Layout** | HTML5 + Django Templates | Clean semantic structure, shared master layout (`base.html`) |
| **Styling** | Custom Vanilla CSS (Odoo-Inspired) | `#714B67` Odoo purple theme, clean white cards, dark navigation (`static/css/style.css`) |
| **Interactivity** | Vanilla JavaScript (Modular ES6) | Zero external framework dependencies; safe DOM APIs (`createElement`, `textContent`, `addEventListener`) |

---

## 3. 🌿 Git Branching & Integration Strategy

Our team uses a **two-tier promotion Git workflow** featuring a dedicated `staging` integration battlefield between individual feature branches and the production-grade `main` branch.

### Branch Architecture Diagram

```text
                         ┌────────────────────────┐
                         │         MAIN           │
                         │   FINAL / STABLE       │
                         └──────────▲─────────────┘
                                    │
                              FINAL QA PASS
                                    │
                         ┌──────────┴─────────────┐
                         │       STAGING          │
                         │ INTEGRATION + TESTING  │
                         └──────────▲─────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
       ┌──────┴──────┐       ┌──────┴──────┐       ┌──────┴──────┐
       │    NEEL     │       │   MARGISH   │       │    PRINCE    │
       │   Backend   │       │ Travel Logic│       │ Integration  │
       └─────────────┘       └─────────────┘       └─────────────┘
              │                     │                     │
              └─────────────── KAVYA UI ─────────────────┘
```

---

### Purpose of Each Branch

#### 1. `main` Branch (Production / Final Submission)
- **Role**: Stable, final submission branch.
- **Rule**: Contains ONLY fully tested, submission-ready code.
- **Strict Prohibition**: **NO direct feature development and NO direct commits** during normal team development.

#### 2. `staging` Branch (Integration Battlefield & QA)
- **Role**: Main integration and quality assurance environment.
- **Workflow**: All completed feature branches merge into `staging` first.
- **Testing**: End-to-end integration testing and user flow verification happen here.
- **Bug Fixing**: Any bugs identified on `staging` are fixed on the responsible feature branch and re-merged into `staging`.

#### 3. Feature Branches (Team Member Responsibilities)

* **`feature/kavya-ui-system` — Kavya (Member 2: Frontend & UI System)**
  * **Status**: **✅ COMPLETED & INTEGRATION-READY**
  * **Deliverables**: All 13 core UI templates, Odoo design system (`static/css/style.css`), base master layout, 4 interactive modals (`#addCityModal`, `#addActivityModal`, `#addExpenseModal`, `#deleteConfirmationModal`), toast notification system (`toast.js`), inline validation (`validation.js`), and safe DOM API handlers (`itinerary.js`).

* **`feature/neel-django-core` — Neel (Member 1: Backend & Database Core)**
  * **Responsibilities**: Django project/app setup, `settings.py`, database models (`User`, `Trip`, `City`, `TripStop`, `Activity`, `TripActivity`, `Expense`), migrations, authentication (`Signup`, `Login`, `Logout`), URL routing, views, Trip CRUD.

* **`feature/margish-travel-logic` — Margish (Member 3: Travel Data & Itinerary Logic)**
  * **Responsibilities**: City catalog seeding, activity catalog seeding, search/filter algorithms, itinerary stop reordering, budget calculations, cost index formulas.

* **`feature/prince-integration` — Prince (Member 4: Integration & Final QA)**
  * **Responsibilities**: Wiring backend views to frontend templates, dynamic calendar populating, public sharing token handling, copy trip workflow, end-to-end testing, bug fixes, final polish.

---

### Command Examples & Execution Guide

#### Step 1: Create `staging` from `main`
```bash
git checkout main
git pull origin main
git checkout -b staging
git push -u origin staging
```

#### Step 2: Merge UI System into `staging`
```bash
git checkout staging
git pull origin staging
git merge feature/kavya-ui-system
git push origin staging
```

#### Step 3: Individual Feature Development & Push
```bash
git checkout feature/neel-django-core
git add .
git commit -m "feat: add Django core authentication and models"
git push origin feature/neel-django-core
```

#### Step 4: Final Promotion (`staging` ➔ `main`)
Once the complete application passes all E2E tests on `staging`:
```bash
git checkout main
git pull origin main
git merge staging
git push origin main
```

---

### 🚨 Mandatory Hackathon Git Rules

1. `main` must ALWAYS remain stable and runnable.
2. **NO DIRECT COMMITS TO `main`** during active feature development.
3. `staging` is the integration battlefield where code comes together.
4. Every feature branch must be tested locally before merging to `staging`.
5. Run complete end-to-end user flow testing on `staging`.
6. Do NOT merge broken or untested code into `main`.
7. At the **Feature Freeze (14:00)**, no new features are permitted.
8. Post-freeze effort is dedicated exclusively to bug fixes, integration polish, and submission checks.
9. Before final submission, `staging` must pass the entire end-to-end demo script.
10. Only after full verification on `staging` is `staging` merged into `main`.

---

## 4. 🔄 Complete End-to-End Demo Flow (Staging Verification)

Before `staging` is promoted to `main`, it must execute this seamless flow:

```text
   Signup ➔ Login ➔ Dashboard ➔ Create Trip ➔ Add Cities ➔ Add Activities
                                                                 │
   Copy Trip ◄─ Public Trip ◄─ Share Trip ◄─ Calendar ◄─ Budget ◄─ Save & View
```

1. **Signup**: Register a new user (`user@example.com`).
2. **Login**: Authenticate into the system.
3. **Dashboard**: View active trip summaries and quick action buttons.
4. **Create Trip**: Submit trip name, date range, description, and target budget.
5. **Add Cities**: Add destination stops (`Jaipur`, `Kochi`) using `#addCityModal`.
6. **Add Activities**: Select activities (`Taj Mahal Guided Tour`, `Food Walk`) using `#addActivityModal`.
7. **Save & View Itinerary**: Review day-wise timeline and stop ordering.
8. **Budget**: Add custom expenses using `#addExpenseModal`, view category breakdown & target progress bar.
9. **Calendar**: Inspect visual day-by-day itinerary schedule.
10. **Share Trip**: Generate public share token URL.
11. **Public Trip**: Access read-only itinerary page without logging in.
12. **Copy Trip**: Click "Copy Trip to My Account" to duplicate the itinerary for personal editing.

---

## 5. Relational Database Architecture

```text
User (Django Auth)
  └── Trip (id, title, start_date, end_date, budget, share_token)
       ├── TripStop (id, city, arrival_date, departure_date, order)
       │    └── TripActivity (id, activity, time, cost, category)
       └── Expense (id, title, category, amount, date)

Catalog Models (Shared):
  ├── City (id, name, state, country, cost_index)
  └── Activity (id, city, title, category, cost, duration)
```

---

## 6. Page & Template Architecture

All 14 pages are fully designed, standardized with Odoo purple accents (`#714B67`), and prepped for Django template variable substitution:

| Page Name | Template Path | UI Component / Modal | Status |
| :--- | :--- | :--- | :---: |
| **Login** | `templates/auth/login.html` | Form validation (`validation.js`) | **✅ Completed** |
| **Signup** | `templates/auth/signup.html` | Form validation (`validation.js`) | **✅ Completed** |
| **Dashboard** | `templates/trips/dashboard.html` | Stat cards, upcoming trips, quick actions | **✅ Completed** |
| **Create Trip** | `templates/trips/create_trip.html` | Date pickers, budget input, description | **✅ Completed** |
| **My Trips** | `templates/trips/my_trips.html` | Trip cards grid, search/filter | **✅ Completed** |
| **Itinerary Builder** | `templates/trips/itinerary_builder.html` | `#addCityModal`, `#addActivityModal`, `#deleteConfirmationModal` | **✅ Completed** |
| **Itinerary View** | `templates/trips/itinerary_view.html` | Day-wise timeline view, activity badges | **✅ Completed** |
| **City Search** | `templates/trips/city_search.html` | City cards, pre-fill `#addCityModal` | **✅ Completed** |
| **Activity Search** | `templates/trips/activity_search.html` | Activity catalog table, pre-fill `#addActivityModal` | **✅ Completed** |
| **Budget Estimator** | `templates/trips/budget.html` | Progress bar, `#addExpenseModal`, delete handler | **✅ Completed** |
| **Calendar** | `templates/trips/calendar.html` | Day-by-day visual calendar grid | **✅ Completed** |
| **Public Shared Trip** | `templates/trips/public_trip.html` | Read-only header, Copy Trip toast notification | **✅ Completed** |
| **Profile** | `templates/trips/profile.html` | User info card, travel preferences | **✅ Completed** |
| **Master Base** | `templates/base.html` | Navbar, Sidebar, 4 Global Modals, Toast Container | **✅ Completed** |

---

## 7. Hackathon Execution Timeline

| Time Window | Milestone / Goal | Primary Responsibility |
| :--- | :--- | :--- |
| **08:30 – 09:00** | Repo initialization, Django project setup, `STANDARD CSS` creation | All Members |
| **09:00 – 10:00** | Backend models & Auth setup; Full UI template completion & Toast system | Neel & Kavya |
| **10:00 – 11:00** | Trip CRUD endpoints; Travel catalog seeding; Safe DOM API refactoring | Neel & Margish & Kavya |
| **11:00 – 12:00** | Member 4 joins; Create `staging` branch; First vertical slice demo | All Members |
| **12:00 – 13:00** | Budget calculation wiring, visual calendar integration, public sharing tokens | Margish & Prince |
| **13:00 – 14:00** | Full end-to-end testing on `staging`, bug resolution, responsive UI polish | Prince & All |
| **14:00** | 🚨 **FEATURE FREEZE**: No new features added. Bug fixes only. | All Members |
| **14:00 – 15:00** | Final E2E verification pass on `staging` ➔ Promote `staging` to `main` ➔ Submit repo | All Members |

---

## 8. Definition of Done (Submission Checklist)

- [x] Responsive Odoo-inspired UI system with zero `alert()` popups.
- [x] Reusable modal, toast, inline validation, and safe DOM JavaScript modules.
- [x] Dedicated `staging` branch established as the integration battlefield.
- [ ] Django ORM database models migrated and seeded with catalog data.
- [ ] User authentication flow (Signup/Login/Logout) functioning.
- [ ] Trip CRUD operations working end-to-end.
- [ ] Budget estimator calculating real-time expense totals and day averages.
- [ ] Visual calendar displaying scheduled activities.
- [ ] Public shared trip link rendering read-only itinerary with copy trip functionality.
- [ ] End-to-end demo flow verified on `staging`.
- [ ] `staging` cleanly merged into `main` before 15:00 submission deadline.

---
*GlobeTrotter — One Team • One Staging Branch • One Working Main Demo*
