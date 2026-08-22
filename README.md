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

## 🚀 Key Features

1. **User Authentication**: Secure Login & Signup with custom user profiles.
2. **Interactive Dashboard**: High-level metrics tracking total trips, destinations visited, total budget spent, and upcoming travel plans.
3. **Trip Planning & Management**: Create new trips with start/end dates, target budgets, travel styles, and destination hubs.
4. **Day-by-Day Itinerary Builder**: Multi-stop trip builder allowing day-wise activity assignment and schedule timing.
5. **City & Activity Discovery**: Searchable catalog of Indian and global cities with cost indices, activity categories (Heritage, Culinary, Adventure, Cruises), and quick-add actions.
6. **Budget Estimator & Expense Log**: Real-time budget progress bar, over-budget warnings, category breakdowns (Stay, Transport, Activities, Meals), and custom expense logging.
7. **Visual Travel Calendar**: Month/Week timeline view mapping travel dates and scheduled stop badges.
8. **Public Trip Sharing**: Generate public share tokens enabling visitors to view curated itineraries and copy trips directly into their accounts.

---

## 👨‍💻 Team Task Allocation & Branch Architecture

```text
main
│
├── feature/neel-django-core       (Neel Bhai — Django Models, Auth, URLs & DB Core)
├── feature/kavya-ui-system        (Kavya — Odoo UI System & All 13 HTML Templates)
├── feature/margish-travel-logic   (Margish Bhai — City/Activity Data & Budget Logic)
└── feature/prince-integration     (Prince Bhai — Incremental Integration & E2E Testing)
```

---

## 🛠️ Tech Stack

- **Backend**: Python 3, Django Web Framework
- **Database**: SQLite3
- **Frontend**: HTML5, Vanilla CSS3 (Custom Odoo Design System), Vanilla JS
- **Templates**: Django Template Language (`base.html` inheritance)

---

## 📁 Repository Structure

```text
.
├── STANDARD CSS/                  # Odoo-inspired design reference & standalone HTML previews
│   ├── style.css                  # Core CSS design system token definitions
│   ├── base.html                  # Base standalone template
│   ├── login.html / signup.html   # Auth preview templates
│   ├── dashboard.html             # Main dashboard preview
│   └── ...                        # Standalone preview HTML files
├── static/                        # Project static assets
│   └── css/
│       └── style.css
├── templates/                     # Production Django templates
│   ├── base.html                  # Django master template
│   ├── auth/                      # Login & Signup templates
│   └── trips/                     # Trip CRUD, Itinerary, Search & Budget templates
└── README.md
```

---

## 🏃 Getting Started

### 1. Standalone UI Preview (No Django required)
Open any HTML file inside the `STANDARD CSS/` folder directly in your browser:
```bash
# Open dashboard in browser
google-chrome "STANDARD CSS/dashboard.html"
```

### 2. Running with Django
```bash
# Apply database migrations
python manage.py migrate

# Run local development server
python manage.py runserver
```
Visit `http://127.0.0.1:8000/` in your browser.
