"""Backend regression tests for the secured finance portal.

Covers:
- Auth gating on all /api/finance/* and /api/auth/portal/me endpoints
- Public /api/auth/portal/login returns a single-tenant Microsoft auth_url
- E2E flows with a manually-injected portal_sessions document in MongoDB
- Removed OneDrive routes return 404
"""
from __future__ import annotations

import os
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urlparse, parse_qs

import pytest
import requests
from dotenv import load_dotenv
from pymongo import MongoClient

# ---- Env / config -----------------------------------------------------------

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE_URL:
    # Fallback: read from frontend/.env
    fe_env = ROOT.parent / "frontend" / ".env"
    for line in fe_env.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
            break

assert BASE_URL, "REACT_APP_BACKEND_URL must be defined"

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
TENANT_ID = os.environ["MS_TENANT_ID"]
ALLOWED_EMAIL = os.environ["PORTAL_ALLOWED_EMAIL"]

TEST_TOKEN = "TEST_AUTH_TOKEN_E2E"

# ---- Fixtures ---------------------------------------------------------------


@pytest.fixture(scope="module")
def mongo():
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    yield db
    client.close()


@pytest.fixture(scope="module")
def session(mongo):
    """Insert a valid portal session and clean up after the module."""
    now = datetime.now(timezone.utc)
    mongo.portal_sessions.delete_many({"token": TEST_TOKEN})
    mongo.portal_sessions.insert_one({
        "token": TEST_TOKEN,
        "email": ALLOWED_EMAIL,
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(days=30)).isoformat(),
    })
    yield TEST_TOKEN
    mongo.portal_sessions.delete_many({"token": TEST_TOKEN})


@pytest.fixture(scope="module")
def auth_headers(session):
    return {"Authorization": f"Bearer {session}"}


@pytest.fixture(scope="module")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---- 1-7, 9: Auth gating ----------------------------------------------------

PROTECTED_GET = [
    "/api/finance/balance",
    "/api/finance/entries",
    "/api/finance/pending",
    "/api/finance/summary",
    "/api/finance/lbc-purchases",
    "/api/auth/portal/me",
]


@pytest.mark.parametrize("path", PROTECTED_GET)
def test_protected_get_without_token_returns_401(http, path):
    r = http.get(f"{BASE_URL}{path}")
    assert r.status_code == 401, f"{path} returned {r.status_code}"
    body = r.json()
    assert "detail" in body
    assert "authentifié" in body["detail"].lower() or "session" in body["detail"].lower()


def test_protected_post_entries_without_token(http):
    r = http.post(f"{BASE_URL}/api/finance/entries",
                  json={"date": "2026-02-15", "category": "materiel", "amount": 1.0})
    assert r.status_code == 401


def test_protected_put_balance_without_token(http):
    r = http.put(f"{BASE_URL}/api/finance/balance",
                 json={"balance": 0, "cb_deferred": 0, "lbc_pending": 0})
    assert r.status_code == 401


def test_protected_delete_entry_without_token(http):
    r = http.delete(f"{BASE_URL}/api/finance/entries/non-existent-id")
    assert r.status_code == 401


def test_protected_post_pending_without_token(http):
    r = http.post(f"{BASE_URL}/api/finance/pending",
                  json={"client_name": "X", "amount": 10.0})
    assert r.status_code == 401


def test_protected_post_lbc_without_token(http):
    r = http.post(f"{BASE_URL}/api/finance/lbc-purchases",
                  json={"label": "x", "amount": 1.0})
    assert r.status_code == 401


def test_invalid_bearer_token_returns_401_session_expired(http):
    r = http.get(f"{BASE_URL}/api/finance/balance",
                 headers={"Authorization": "Bearer totally_fake_token_xxx"})
    assert r.status_code == 401
    assert "expir" in r.json()["detail"].lower()


# ---- 8: Public portal/login returns single-tenant auth URL ------------------


def test_portal_login_returns_single_tenant_auth_url(http, mongo):
    r = http.get(f"{BASE_URL}/api/auth/portal/login")
    assert r.status_code == 200, r.text
    body = r.json()
    assert "auth_url" in body
    url = body["auth_url"]
    parsed = urlparse(url)
    assert parsed.netloc == "login.microsoftonline.com", url
    # Must be single-tenant: contain tenant id, NOT /common or /organizations
    assert TENANT_ID in parsed.path, f"Tenant id {TENANT_ID} not in path: {parsed.path}"
    assert "/common/" not in parsed.path
    assert "/organizations/" not in parsed.path
    qs = parse_qs(parsed.query)
    assert qs.get("client_id"), "client_id missing"
    assert qs.get("redirect_uri"), "redirect_uri missing"
    state = qs.get("state", [None])[0]
    assert state, "state missing"
    # state should have been persisted in mongo for the callback
    assert mongo.portal_states.find_one({"state": state}) is not None
    # cleanup
    mongo.portal_states.delete_one({"state": state})


# ---- 10: Authenticated GETs work with injected session ---------------------


@pytest.mark.parametrize("path", PROTECTED_GET)
def test_protected_get_with_valid_token(http, auth_headers, path):
    r = http.get(f"{BASE_URL}{path}", headers=auth_headers)
    assert r.status_code == 200, f"{path} -> {r.status_code} {r.text}"


def test_balance_response_shape(http, auth_headers):
    r = http.get(f"{BASE_URL}/api/finance/balance", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    for key in ("balance", "cb_deferred", "lbc_pending"):
        assert key in body, f"Missing {key} in {body}"


def test_portal_me_returns_session_email(http, auth_headers):
    r = http.get(f"{BASE_URL}/api/auth/portal/me", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == ALLOWED_EMAIL
    assert "expires_at" in body


def test_pending_response_shape(http, auth_headers):
    r = http.get(f"{BASE_URL}/api/finance/pending", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert "items" in body and "total" in body and "count" in body
    assert isinstance(body["items"], list)


def test_summary_response_shape(http, auth_headers):
    r = http.get(f"{BASE_URL}/api/finance/summary", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    for k in ("month", "previous_month", "current", "previous"):
        assert k in body
    for k in ("total_ca", "net_after_taxes", "total_urssaf", "total_impot"):
        assert k in body["current"]


def test_lbc_purchases_response_shape(http, auth_headers):
    r = http.get(f"{BASE_URL}/api/finance/lbc-purchases", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert "items" in body and "total" in body and "count" in body


# ---- 11: CRUD entry ---------------------------------------------------------


def test_create_list_delete_entry(http, auth_headers, mongo):
    payload = {
        "date": "2026-02-15",
        "category": "materiel",
        "amount": 150.5,
        "client_name": "TEST_E2E_Client",
        "description": "TEST_E2E entry",
    }
    r = http.post(f"{BASE_URL}/api/finance/entries", headers=auth_headers, json=payload)
    assert r.status_code == 200, r.text
    entry = r.json()
    assert entry["id"]
    assert entry["amount"] == 150.5
    assert entry["category"] == "materiel"
    entry_id = entry["id"]

    try:
        # Verify it shows up in listing (filtered by month)
        r2 = http.get(f"{BASE_URL}/api/finance/entries?month=2026-02", headers=auth_headers)
        assert r2.status_code == 200
        ids = [e["id"] for e in r2.json()]
        assert entry_id in ids
    finally:
        r3 = http.delete(f"{BASE_URL}/api/finance/entries/{entry_id}", headers=auth_headers)
        assert r3.status_code == 200
        assert r3.json().get("deleted") is True
        # Direct mongo cleanup safety net
        mongo.finance_entries.delete_one({"id": entry_id})


# ---- 12: LBC purchases CRUD -------------------------------------------------


def test_lbc_purchase_create_list_delete(http, auth_headers, mongo):
    # NOTE: LbcPurchaseCreate requires `label` AND `amount`. Sending only
    # {amount: 45.0} (per test plan) would 422. We test the actual contract.
    payload = {"label": "TEST_E2E_LBC", "amount": 45.0}
    r = http.post(f"{BASE_URL}/api/finance/lbc-purchases", headers=auth_headers, json=payload)
    assert r.status_code == 200, r.text
    item = r.json()
    pid = item["id"]
    assert item["amount"] == 45.0

    try:
        r2 = http.get(f"{BASE_URL}/api/finance/lbc-purchases", headers=auth_headers)
        assert r2.status_code == 200
        body = r2.json()
        assert any(p["id"] == pid for p in body["items"])
        assert body["total"] >= 45.0
    finally:
        r3 = http.delete(f"{BASE_URL}/api/finance/lbc-purchases/{pid}", headers=auth_headers)
        assert r3.status_code == 200
        mongo.lbc_purchases.delete_one({"id": pid})


def test_lbc_purchase_amount_only_payload_returns_422(http, auth_headers):
    """Test plan asks for {amount: 45.0} payload; verify model validation."""
    r = http.post(f"{BASE_URL}/api/finance/lbc-purchases",
                  headers=auth_headers, json={"amount": 45.0})
    # Should be 422 because `label` is required by LbcPurchaseCreate
    assert r.status_code == 422, f"Expected 422 (label missing), got {r.status_code}"


# ---- 13: Balance update -----------------------------------------------------


def test_put_balance_updates_and_persists(http, auth_headers, mongo):
    # Snapshot existing balance to restore
    original = mongo.account_balance.find_one({"_id": "default"}) or {}

    new_vals = {"balance": 1000.0, "cb_deferred": 200.0, "lbc_pending": 50.0}
    r = http.put(f"{BASE_URL}/api/finance/balance", headers=auth_headers, json=new_vals)
    assert r.status_code == 200, r.text

    r2 = http.get(f"{BASE_URL}/api/finance/balance", headers=auth_headers)
    assert r2.status_code == 200
    body = r2.json()
    assert body["balance"] == 1000.0
    assert body["cb_deferred"] == 200.0
    assert body["lbc_pending"] == 50.0
    assert body.get("updated_at")

    # Restore (best effort)
    if original:
        original.pop("_id", None)
        mongo.account_balance.update_one(
            {"_id": "default"}, {"$set": original}, upsert=True
        )
    else:
        mongo.account_balance.delete_one({"_id": "default"})


# ---- 14: Removed OneDrive routes ---------------------------------------------

ONEDRIVE_PATHS = [
    ("GET", "/api/auth/onedrive/login"),
    ("GET", "/api/auth/onedrive/callback"),
    ("GET", "/api/auth/onedrive/status"),
    ("POST", "/api/onedrive/save-devis"),
]


@pytest.mark.parametrize("method,path", ONEDRIVE_PATHS)
def test_onedrive_routes_removed(http, method, path):
    r = http.request(method, f"{BASE_URL}{path}", json={} if method == "POST" else None)
    assert r.status_code == 404, f"{method} {path} -> {r.status_code}"
