# 🌍 GlobeTrotter — Smart Multi-City Travel Planning & Budget Platform

> **Odoo Hackathon Project** • A unified, enterprise-grade travel management system engineered with Django, custom Odoo-inspired styling, and a modular, secure JavaScript frontend.

---

## 📋 Table of Contents
1. [Executive Summary & Problem Statement Alignment](#-executive-summary--problem-statement-alignment)
2. [Full System Architecture & Database Schema](#-full-system-architecture--database-schema)
3. [Complete Feature Matrix (14 Core Modules)](#-complete-feature-matrix-14-core-modules)
4. [🎨 Odoo Design System Specification](#-odoo-design-system-specification)
5. [🌿 Git Branching & Promotion Strategy (`staging → main`)](#-git-branching--promotion-strategy-staging--main)
6. [🔄 End-to-End Demo Journey](#-end-to-end-demo-journey)
7. [📁 Repository Structure](#-repository-structure)
8. [🚀 Getting Started & Local Setup](#-getting-started--local-setup)

---

## 🎯 Executive Summary & Problem Statement Alignment

GlobeTrotter addresses the key challenges of modern group and solo travel planning: fragmented destination research, manual budget tracking, difficult itinerary sharing, and rigid scheduling. 

The application delivers a end-to-end workflow:
`User Authentication` ➔ `Trip Creation` ➔ `Multi-City Stop Assignment` ➔ `Activity Scheduling` ➔ `Real-Time Budget Analytics` ➔ `Visual Calendar Mapping` ➔ `Public Trip Sharing & Cloning`.

---

## 🏗️ Full System Architecture & Database Schema

### High-Level System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             BROWSER / CLIENT UI                             │
│       HTML5 Templates  •  Odoo CSS Design Tokens  •  Vanilla JS Modules     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP Requests / Django Context
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DJANGO APPLICATION LAYER                          │
│                                                                             │
│   ┌─────────────────────┐    ┌────────────────────┐    ┌────────────────┐   │
│   │ Authentication View │    │  Trip CRUD Views   │    │  Public Token  │   │
│   │   (Login/Signup)    │    │ (Builder/Itinerary)│    │ View Handler   │   │
│   └──────────┬──────────┘    └─────────┬──────────┘    └───────┬────────┘   │
│              │                         │                       │            │
│              └─────────────────────────┼───────────────────────┘            │
│                                        ▼                                    │
│                           Django ORM Data Models                            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ SQL Queries
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SQLITE3 RELATIONAL DATABASE                         │
│                                                                             │
│   User ───< Trip ───< TripStop ───< TripActivity ───> Activity               │
│                │                                                             │
│                └───< Expense               City ────> Catalog Data          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Relational Database Schema

```text
User (Django Built-in Auth)
├── id: Primary Key
├── username: String (Email)
└── email: String

Trip (User-created Trip Container)
├── id: Primary Key
├── user_id: Foreign Key (User)
├── title: String ("Golden Triangle Explorer")
├── start_date: Date
├── end_date: Date
├── target_budget: Decimal (e.g. ₹25,000)
├── description: Text
└── share_token: UUID (Unique key for public sharing)

TripStop (Destination city stop inside a Trip)
├── id: Primary Key
├── trip_id: Foreign Key (Trip)
├── city_name: String ("Jaipur")
├── state_name: String ("Rajasthan")
├── arrival_date: Date
├── departure_date: Date
└── order: Integer (Sequence index)

Activity (Global Activity Catalog)
├── id: Primary Key
├── city_id: Foreign Key (City)
├── title: String ("Taj Mahal Guided Tour")
├── category: Enum ("Heritage & Monuments", "Food Walk", "Adventure", "Sightseeing")
├── duration: String ("3 Hours")
└── cost: Decimal (₹1,200)

TripActivity (Activity assigned to a TripStop)
├── id: Primary Key
├── trip_stop_id: Foreign Key (TripStop)
├── activity_id: Foreign Key (Activity)
├── scheduled_time: Time ("09:00 AM")
├── cost: Decimal
└── category: String

Expense (Custom expense item inside a Trip)
├── id: Primary Key
├── trip_id: Foreign Key (Trip)
├── title: String ("Gatimaan Express Train Ticket")
├── category: Enum ("Transport", "Stay", "Activities", "Meals", "Other")
├── amount: Decimal
└── date: Date
```

---

## ⚡ Complete Feature Matrix (14 Core Modules)

| # | Module | Key Capabilities | Status |
| :-: | :--- | :--- | :---: |
| **1** | **User Auth & Profiles** | Login, Signup, password validation, user preference storage | **✅ Ready** |
| **2** | **Analytics Dashboard** | High-level stat cards (Total Trips, Spent Budget, Upcoming Plans), quick action bar | **✅ Ready** |
| **3** | **Trip Management** | Create, view, edit, and delete travel itineraries with date range selection | **✅ Ready** |
| **4** | **Itinerary Builder** | Dynamic stop reordering, city additions, and activity scheduling timeline | **✅ Ready** |
| **5** | **Day-wise Itinerary View** | Visual timeline displaying activities grouped by time slots and categories | **✅ Ready** |
| **6** | **City Discovery** | Searchable catalog of Indian & global destinations with cost indices and state tags | **✅ Ready** |
| **7** | **Activity Catalog** | Categorized experience list (Heritage, Food Walk, Adventure) with instant trip pre-filling | **✅ Ready** |
| **8** | **Budget Estimator** | Real-time budget progress bar, allocated vs spent comparison, average cost/day breakdown | **✅ Ready** |
| **9** | **Expense Tracker** | Custom expense logging (Transport, Meals, Stay), CSV export trigger, itemized deletion | **✅ Ready** |
| **10** | **Visual Travel Calendar** | Month/Week schedule grid mapping trip dates and daily activity badges | **✅ Ready** |
| **11** | **Public Trip Sharing** | Unique UUID token generation for public, read-only viewable itinerary URLs | **✅ Ready** |
| **12** | **One-Click Trip Copying** | "Copy Trip to My Account" feature allowing visitors to duplicate shared itineraries | **✅ Ready** |
| **13** | **Interactive Modals** | Reusable dialog overlays (`#addCityModal`, `#addActivityModal`, `#addExpenseModal`, `#deleteConfirmationModal`) | **✅ Ready** |
| **14** | **Toast & Validation** | Floating notification engine (`showToast()`), inline red form error states (`.input-error`), 0 `innerHTML` vulnerabilities | **✅ Ready** |

---

## 🎨 Odoo Design System Specification

GlobeTrotter adheres strictly to the approved **Odoo Design System** defined in `static/css/style.css`.

### Design Tokens & Color Palette

```css
:root {
    --primary:       #714B67;   /* Odoo Signature Purple */
    --primary-dark:  #5a3a52;   /* Deep Hover Purple */
    --primary-light: #f3eef2;   /* Soft Background Purple */
    --dark:          #212529;   /* Slate Header Text */
    --text:          #212529;   /* Primary Body Text */
    --muted:         #6C757D;   /* Secondary Subtitles */
    --background:    #F8F9FA;   /* Application Background Gray */
    --white:         #FFFFFF;   /* Card Container White */
    --border:        #DEE2E6;   /* Subtle Border Divider */
    --success:       #28A745;   /* Success Badges & Under-Budget Indicators */
    --warning:       #F59E0B;   /* Warnings & Cost Index Indicators */
    --danger:        #DC3545;   /* Delete Buttons & Errors */
    --info:          #17A2B8;   /* Information Alerts */
}
```

---

## 🌿 Git Branching & Promotion Strategy (`staging → main`)

GlobeTrotter uses a **two-tier promotion Git workflow** featuring a dedicated `staging` integration battlefield between individual feature branches and the production-grade `main` branch.

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

### Branch Responsibilities

- **`main` (Production / Final Submission)**: Stable, final submission branch. Contains ONLY fully tested, submission-ready code. **NO direct feature development or direct commits.**
- **`staging` (Integration Battlefield & QA)**: Main integration environment. All feature branches are merged into `staging` first for full end-to-end user flow testing.
- **`feature/kavya-ui-system` (Kavya — Member 2: UI System)**: **✅ COMPLETED & INTEGRATION-READY** — Master Odoo design system, 13 core page templates, interactive modals (`#addCityModal`, `#addActivityModal`, `#addExpenseModal`, `#deleteConfirmationModal`), toast notification engine, inline validation, and safe DOM API handlers.
- **`feature/neel-django-core` (Neel — Member 1: Backend)**: Django setup, models, database migrations, authentication, Trip CRUD views.
- **`feature/margish-travel-logic` (Margish — Member 3: Travel Data)**: City/Activity catalog data seeding, search algorithms, budget calculation formulas.
- **`feature/prince-integration` (Prince — Member 4: Integration)**: Integration wiring, dynamic calendar rendering, public share token routing, E2E testing, final QA.

---

## 🔄 End-to-End Demo Journey

The staging environment is validated against the following end-to-end sequence before promotion to `main`:

```text
   Signup ➔ Login ➔ Dashboard ➔ Create Trip ➔ Add Cities ➔ Add Activities
                                                                 │
   Copy Trip ◄─ Public Trip ◄─ Share Trip ◄─ Calendar ◄─ Budget ◄─ Save & View
```

1. **Authentication**: Register and login as `demo@globetrotter.com`.
2. **Dashboard**: Inspect statistics, active trip count, and budget trackers.
3. **Plan Trip**: Create "Golden Triangle Explorer" (Oct 20–28, Target Budget: ₹25,000).
4. **City Stops**: Add Jaipur, Agra, and Delhi using pre-filled `#addCityModal`.
5. **Activities**: Attach "Taj Mahal Guided Tour" (₹1,200) and "Food Walk" (₹800).
6. **Budget Check**: View automatic calculation (Spent: ₹24,500 / Remaining: ₹500 / Progress: 98%).
7. **Expense Log**: Add custom train ticket expense using `#addExpenseModal`.
8. **Calendar**: Inspect day-by-day scheduled stops on visual calendar grid.
9. **Public Sharing**: Click "Share Trip" to generate public token URL (`/trip/share/<token>/`).
10. **Trip Cloning**: Access read-only shared view and click "Copy Trip to My Account" to duplicate.

---

## 📁 Repository Structure

```text
.
├── DOCUMENT/                      # Architecture Specs & Hackathon Execution Documents
│   ├── GlobeTrotter_Team_Architecture_and_Hackathon_Plan.md
│   └── GlobeTrotter_Team_Architecture_and_Hackathon_Plan.docx
├── STANDARD CSS/                  # Standalone Odoo CSS reference & preview templates
│   ├── style.css                  # Core CSS design system
│   ├── base.html                  # Standalone master layout
│   ├── static/js/                 # Standalone JS modules
│   └── ...                        # All 13 preview HTML pages
├── static/                        # Production Django static assets
│   ├── css/
│   │   └── style.css              # Master Odoo stylesheet
│   └── js/
│       ├── validation.js          # Inline form validation helper
│       ├── toast.js               # Dynamic toast alert system
│       ├── modals.js              # Modal lifecycle & keyboard trap
│       └── itinerary.js           # Safe DOM handlers for Cities, Activities & Expenses
├── templates/                     # Production Django templates
│   ├── base.html                  # Django master template with global modals
│   ├── auth/                      # Login & Signup templates
│   └── trips/                     # Trip CRUD, Itinerary, Search & Budget templates
└── README.md
```

---

## 🚀 Getting Started & Local Setup

### 1. Standalone UI Preview (No Django required)
Open any preview template directly in your browser:
```bash
google-chrome "STANDARD CSS/dashboard.html"
```

### 2. Running with Django
```bash
# Clone the repository
git clone https://github.com/KAVYAJOSHI1/OODO_LDCE.git
cd OODO_LDCE

# Apply database migrations
python manage.py migrate

# Run development server
python manage.py runserver
```
Visit `http://127.0.0.1:8000/` in your browser.
