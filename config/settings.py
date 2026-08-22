"""
Django settings for the GlobeTrotter project (Odoo Hackathon).

Owner: Member 1 (Backend / Database Core).
Keep this file boring and readable -- every teammate depends on it.
"""

import os
from pathlib import Path

from django.contrib.messages import constants as message_constants
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

LOGS_DIR = BASE_DIR / "logs"
LOGS_DIR.mkdir(exist_ok=True)

# ---------------------------------------------------------------------------
# Local configuration from a .env file (optional).
# Copy .env.example to .env and edit it. Values already set in the real
# environment win over the file, so CI / production can override without one.
# The file is git-ignored -- never commit real secrets.
# ---------------------------------------------------------------------------
load_dotenv(BASE_DIR / ".env")

# ---------------------------------------------------------------------------
# Core
# ---------------------------------------------------------------------------
# Read from the environment (.env), falling back to a dev value. A real
# deployment MUST set DJANGO_SECRET_KEY to a private random string.
SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY", "django-insecure-globetrotter-hackathon-key-change-me"
)

# DEBUG is True unless DJANGO_DEBUG is explicitly set to a false-y value.
DEBUG = os.environ.get("DJANGO_DEBUG", "True").lower() not in ("false", "0", "no", "")

ALLOWED_HOSTS = ["*"]

# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Local
    "travel",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        # Member 2 owns everything under templates/ -- do not restyle it here.
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ---------------------------------------------------------------------------
# Database -- PostgreSQL.
#
# Every setting reads from an environment variable with a local-dev default, so
# each teammate can point at their own Postgres without editing this file:
#
#     set GLOBETROTTER_DB_NAME=globetrotter
#     set GLOBETROTTER_DB_USER=postgres
#     set GLOBETROTTER_DB_PASSWORD=root
#     set GLOBETROTTER_DB_HOST=127.0.0.1
#     set GLOBETROTTER_DB_PORT=5432
#
# One-time setup on a fresh machine (needs a running Postgres server):
#     psql -U postgres -c "CREATE DATABASE globetrotter;"
#     python manage.py migrate
# ---------------------------------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("GLOBETROTTER_DB_NAME", "globetrotter"),
        "USER": os.environ.get("GLOBETROTTER_DB_USER", "postgres"),
        "PASSWORD": os.environ.get("GLOBETROTTER_DB_PASSWORD", "root"),
        "HOST": os.environ.get("GLOBETROTTER_DB_HOST", "127.0.0.1"),
        "PORT": os.environ.get("GLOBETROTTER_DB_PORT", "5432"),
        "CONN_MAX_AGE": 60,          # reuse connections for a minute
        "CONN_HEALTH_CHECKS": True,  # but check they are still alive first
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Authentication
# Uses Django's default User model (django.contrib.auth.models.User) to match
# Member 3's travel models, whose Trip.user FK points at the stock user.
# ---------------------------------------------------------------------------
AUTHENTICATION_BACKENDS = [
    # Lets the login form accept a username OR an email address, because the
    # login template labels that field "Username / Email".
    "travel.backends.EmailOrUsernameBackend",
    "django.contrib.auth.backends.ModelBackend",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 6},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LOGIN_URL = "login"
LOGIN_REDIRECT_URL = "dashboard"
LOGOUT_REDIRECT_URL = "login"

# "Remember me" unchecked -> the session dies with the browser (decided
# per-login inside the login view). Checked -> two weeks.
SESSION_COOKIE_AGE = 60 * 60 * 24 * 14
SESSION_EXPIRE_AT_BROWSER_CLOSE = False

# ---------------------------------------------------------------------------
# Internationalisation
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static & media files
# ---------------------------------------------------------------------------
STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}

# ---------------------------------------------------------------------------
# Messages -> CSS class mapping.
# base.html renders `alert alert-{{ message.tags }}` and the shared stylesheet
# only defines .alert-success / .alert-warning / .alert-danger. Django's default
# tag for errors is "error", so remap it to "danger" (and info -> success) so no
# message ever renders as an unstyled box.
# ---------------------------------------------------------------------------
MESSAGE_TAGS = {
    message_constants.DEBUG: "warning",
    message_constants.INFO: "success",
    message_constants.SUCCESS: "success",
    message_constants.WARNING: "warning",
    message_constants.ERROR: "danger",
}

# ---------------------------------------------------------------------------
# Logging
#   logs/globetrotter.log -- everything the app does (rotating, 5 x 2MB)
#   logs/errors.log       -- ERROR and above only, for fast triage
#   console               -- what you see in the runserver terminal
# ---------------------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{asctime} | {levelname:<8} | {name} | {funcName}:{lineno} | {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname:<8} | {name} | {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "level": "INFO",
            "formatter": "simple",
        },
        "app_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "DEBUG",
            "filename": str(LOGS_DIR / "globetrotter.log"),
            "maxBytes": 2 * 1024 * 1024,
            "backupCount": 5,
            "encoding": "utf-8",
            "formatter": "verbose",
        },
        "error_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "ERROR",
            "filename": str(LOGS_DIR / "errors.log"),
            "maxBytes": 2 * 1024 * 1024,
            "backupCount": 5,
            "encoding": "utf-8",
            "formatter": "verbose",
        },
    },
    "loggers": {
        # Our application code.
        "travel": {
            "handlers": ["console", "app_file", "error_file"],
            "level": "DEBUG",
            "propagate": False,
        },
        # Unhandled exceptions and 4xx/5xx responses.
        "django.request": {
            "handlers": ["console", "app_file", "error_file"],
            "level": "WARNING",
            "propagate": False,
        },
        "django": {
            "handlers": ["console", "app_file"],
            "level": "INFO",
            "propagate": False,
        },
    },
    "root": {
        "handlers": ["console", "app_file"],
        "level": "WARNING",
    },
}

# ---------------------------------------------------------------------------
# Project-specific knobs (read by travel/services.py)
# ---------------------------------------------------------------------------
GLOBETROTTER = {
    "CURRENCY_SYMBOL": "₹",        # rupee
    "DEFAULT_MEAL_COST_PER_DAY": 600,   # used by the budget estimator
    "MAX_TRIP_DAYS": 365,               # sanity guard on trip length
    "MAX_STOPS_PER_TRIP": 50,
}
