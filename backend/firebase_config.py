"""
Secure Firebase connection for the SAFEPARK 360 Flask backend.

SETUP
  1. Firebase console -> Project settings -> Service accounts
  2. "Generate new private key" -> save the JSON as backend/serviceAccountKey.json
     (never commit this file to GitHub)
  3. Copy your Realtime Database URL into DATABASE_URL below or set the
     FIREBASE_DB_URL environment variable.
"""

import os

import firebase_admin
from firebase_admin import credentials, db

SERVICE_ACCOUNT_FILE = os.getenv("FIREBASE_KEY_FILE", "serviceAccountKey.json")
DATABASE_URL = os.getenv(
    "FIREBASE_DB_URL", "https://YOUR_PROJECT-default-rtdb.firebaseio.com"
)
ROOT = "SAFEPARK360"

if not firebase_admin._apps:  # initialise only once
    cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
    firebase_admin.initialize_app(cred, {"databaseURL": DATABASE_URL})


def db_ref(path: str = ""):
    """Return a reference under SAFEPARK360/<path>."""
    full = f"{ROOT}/{path}" if path else ROOT
    return db.reference(full)
