"""
SYNCHER - Development Settings
"""
from .base import *

DEBUG = True
ALLOWED_HOSTS = ['*']

# SQLite for development
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# CORS - Allow React dev server
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
