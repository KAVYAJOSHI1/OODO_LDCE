# 🌍 GlobeTrotter — Smart Travel Itinerary & Budget Planner

> **Odoo Hackathon Project** — A unified, Odoo-inspired travel management platform designed to build, customize, estimate, and share travel itineraries effortlessly.

---

## 🎨 Odoo Design System & Visual Identity

GlobeTrotter follows a clean, professional, Odoo-inspired UI design language:
- **Primary Accent**: `#714B67` (Odoo Purple)
- **Dark Navigation**: `#212529`
- **Background**: `#F8F9FA`
- **Card System**: Clean white cards (`#FFFFFF`) with subtle borders (`#DEE2E6`) and smooth hover elevation.

---

## 🌿 Git Branching & Integration Architecture

GlobeTrotter uses a **two-tier promotion Git workflow** with a dedicated `staging` integration battlefield between individual feature branches and the stable `main` branch.

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

- **`main` (Production / Final Submission)**: Stable, final submission branch. Contains ONLY tested, submission-ready code. **NO direct feature development or direct commits.**
- **`staging` (Integration Battlefield & QA)**: Integration & testing branch. All feature branches are merged into `staging` first for full end-to-end user flow testing.
- **`feature/kavya-ui-system` (Kavya — Member 2: UI System)**: **✅ COMPLETED & INTEGRATION-READY** — Master Odoo design system, 13 core page templates, interactive modals (`#addCityModal`, `#addActivityModal`, `#addExpenseModal`, `#deleteConfirmationModal`), toast notification engine, inline validation, and safe DOM API handlers.
- **`feature/neel-django-core` (Neel — Member 1: Backend)**: Django project/app setup, models, database migrations, authentication, Trip CRUD views.
- **`feature/margish-travel-logic` (Margish — Member 3: Travel Data)**: City/Activity catalog data seeding, search algorithms, budget calculation formulas.
- **`feature/prince-integration` (Prince — Member 4: Integration)**: Integration wiring, dynamic calendar rendering, public share token routing, E2E testing, final QA.

---

## 🛠️ Tech Stack

- **Backend**: Python 3, Django Web Framework
- **Database**: SQLite3
- **Frontend**: HTML5, Vanilla CSS3 (Custom Odoo Design System), Vanilla JS (Safe DOM APIs)
- **Templates**: Django Template Language (`base.html` master layout inheritance)

---

## 📁 Repository Structure

```text
.
├── DOCUMENT/                      # Hackathon Architecture & Integration Plan (.md & .docx)
├── STANDARD CSS/                  # Odoo-inspired design reference & standalone HTML previews
│   ├── style.css                  # Core CSS design system token definitions
│   ├── base.html                  # Base standalone template
│   ├── static/js/                 # Standalone JS modules
│   └── ...                        # Standalone preview HTML files
├── static/                        # Production Django static assets
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── validation.js          # Inline form error handling
│       ├── toast.js               # Dynamic toast alerts
│       ├── modals.js              # Modal lifecycle & keyboard trap
│       └── itinerary.js           # Safe DOM handlers for Cities, Activities & Expenses
├── templates/                     # Production Django templates
│   ├── base.html                  # Django master template with global modals
│   ├── auth/                      # Login & Signup templates
│   └── trips/                     # Trip CRUD, Itinerary, Search & Budget templates
└── README.md
```

---

## 🏃 Workflow Command Examples

### 1. Merging Feature into Staging
```bash
git checkout staging
git pull origin staging
git merge feature/kavya-ui-system
git push origin staging
```

### 2. Promoting Staging to Main (Post-QA Pass)
```bash
git checkout main
git pull origin main
git merge staging
git push origin main
```

---

## 🚨 Hackathon Git Rules

1. `main` must always remain stable and runnable.
2. **No direct feature development or commits on `main`.**
3. `staging` is the integration environment where all testing occurs.
4. Test every feature locally before merging to `staging`.
5. At **14:00 (Feature Freeze)**, no new features are permitted.
6. Before final submission, `staging` must pass the full end-to-end demo flow.
7. Only then merge `staging` into `main`.
