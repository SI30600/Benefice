"""Tests for /api/finance/entries date_from/date_to range (bug fix #1) + backward compat with month param."""
import os
from datetime import datetime, timezone, timedelta
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://profit-calculator-65.preview.emergentagent.com").rstrip("/")
TOKEN = "TEST_TOKEN_DO_NOT_USE_IN_PROD"
SEED_CLIENT = "SEED_FUTURE_V3"


@pytest.fixture(scope="module")
def auth_client():
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def seeded_entries(auth_client):
    """Create 2 future entries (J+5 prestation 500€, J+10 achat 200€) + 1 past entry."""
    today = datetime.now(timezone.utc).date()
    created_ids = []
    payloads = [
        {"date": (today + timedelta(days=5)).isoformat(), "category": "prestation", "amount": 500,
         "description": "SEED future presta", "client_name": SEED_CLIENT},
        {"date": (today + timedelta(days=10)).isoformat(), "category": "achat", "amount": 200,
         "description": "SEED future achat", "client_name": SEED_CLIENT},
        {"date": (today - timedelta(days=3)).isoformat(), "category": "prestation", "amount": 100,
         "description": "SEED past", "client_name": SEED_CLIENT},
    ]
    for p in payloads:
        r = auth_client.post(f"{BASE_URL}/api/finance/entries", json=p)
        assert r.status_code == 200, f"seed failed: {r.text}"
        created_ids.append(r.json()["id"])
    yield payloads, created_ids
    # teardown
    for eid in created_ids:
        auth_client.delete(f"{BASE_URL}/api/finance/entries/{eid}")


# --- Auth tests --------------------------------------------------------------
def test_entries_date_range_requires_auth():
    r = requests.get(f"{BASE_URL}/api/finance/entries?date_from=2026-01-01&date_to=2026-01-31")
    assert r.status_code == 401


# --- date_from / date_to -----------------------------------------------------
def test_entries_date_range_returns_future_entries(auth_client, seeded_entries):
    today = datetime.now(timezone.utc).date()
    date_from = today.isoformat()
    date_to = (today + timedelta(days=95)).isoformat()
    r = auth_client.get(f"{BASE_URL}/api/finance/entries", params={"date_from": date_from, "date_to": date_to})
    assert r.status_code == 200
    rows = r.json()
    # Only entries dated between today and today+95 inclusive
    seed_rows = [row for row in rows if row.get("client_name") == SEED_CLIENT]
    dates = sorted([row["date"] for row in seed_rows])
    assert (today + timedelta(days=5)).isoformat() in dates
    assert (today + timedelta(days=10)).isoformat() in dates
    # The past entry (today-3) must NOT be returned
    assert (today - timedelta(days=3)).isoformat() not in dates


def test_entries_date_range_inclusive_bounds(auth_client, seeded_entries):
    today = datetime.now(timezone.utc).date()
    date_from = (today + timedelta(days=5)).isoformat()
    date_to = (today + timedelta(days=5)).isoformat()
    r = auth_client.get(f"{BASE_URL}/api/finance/entries", params={"date_from": date_from, "date_to": date_to})
    assert r.status_code == 200
    seed_rows = [row for row in r.json() if row.get("client_name") == SEED_CLIENT]
    # Should include the J+5 (presta 500) and not the J+10
    assert any(row["amount"] == 500 and row["category"] == "prestation" for row in seed_rows)
    assert not any(row["amount"] == 200 for row in seed_rows)


def test_entries_date_range_only_date_from(auth_client, seeded_entries):
    today = datetime.now(timezone.utc).date()
    date_from = today.isoformat()
    r = auth_client.get(f"{BASE_URL}/api/finance/entries", params={"date_from": date_from})
    assert r.status_code == 200
    seed_rows = [row for row in r.json() if row.get("client_name") == SEED_CLIENT]
    for row in seed_rows:
        assert row["date"] >= date_from


# --- Backward compat with month param ---------------------------------------
def test_entries_month_param_still_works(auth_client, seeded_entries):
    today = datetime.now(timezone.utc).date()
    month = today.strftime("%Y-%m")
    r = auth_client.get(f"{BASE_URL}/api/finance/entries", params={"month": month})
    assert r.status_code == 200
    rows = r.json()
    # All returned rows must start with this month
    for row in rows:
        assert row["date"].startswith(month)
