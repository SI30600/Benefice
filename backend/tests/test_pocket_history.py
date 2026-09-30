"""Backend tests: /api/finance/pocket-history endpoint."""
import os
import requests
from datetime import datetime, date

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://profit-calculator-65.preview.emergentagent.com",
).rstrip("/")
TOKEN = "TEST_TOKEN_DO_NOT_USE_IN_PROD"
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}


def _month_of(d: date) -> str:
    return d.strftime("%Y-%m")


def _prev_month(d: date) -> date:
    y, m = d.year, d.month
    if m == 1:
        return date(y - 1, 12, 15)
    return date(y, m - 1, 15)


def _cleanup():
    """Remove SEED_HIST_V2 entries in current + prev month."""
    today = date.today()
    for month in (_month_of(today), _month_of(_prev_month(today))):
        r = requests.get(
            f"{BASE_URL}/api/finance/entries?month={month}", headers=H
        )
        if r.status_code != 200:
            continue
        for e in r.json():
            if (e.get("client_name") or "").startswith("SEED_HIST_V2"):
                requests.delete(
                    f"{BASE_URL}/api/finance/entries/{e['id']}", headers=H
                )


# ---- Auth --------------------------------------------------------------------
def test_pocket_history_requires_auth():
    r = requests.get(f"{BASE_URL}/api/finance/pocket-history?months=12")
    assert r.status_code == 401


# ---- Shape -------------------------------------------------------------------
def test_pocket_history_returns_12_entries_ordered_oldest_first():
    r = requests.get(
        f"{BASE_URL}/api/finance/pocket-history?months=12", headers=H
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["count"] == 12
    months = data["months"]
    assert isinstance(months, list) and len(months) == 12
    # oldest first
    keys = [m["month"] for m in months]
    assert keys == sorted(keys), f"months not oldest→newest: {keys}"
    # last one is current month
    assert keys[-1] == datetime.now().strftime("%Y-%m")
    # shape
    for m in months:
        for k in ("month", "pocket", "ca", "taxes", "achats"):
            assert k in m, f"missing key {k} in {m}"


def test_pocket_history_respects_months_param():
    r = requests.get(
        f"{BASE_URL}/api/finance/pocket-history?months=6", headers=H
    )
    assert r.status_code == 200
    data = r.json()
    assert data["count"] == 6
    assert len(data["months"]) == 6


# ---- Values ------------------------------------------------------------------
def test_pocket_history_pocket_matches_summary_for_current_month():
    """Verify pocket in history for current month == summary.net_in_pocket."""
    month = datetime.now().strftime("%Y-%m")
    rs = requests.get(f"{BASE_URL}/api/finance/summary?month={month}", headers=H)
    assert rs.status_code == 200
    summary_pocket = rs.json()["current"]["net_in_pocket"]

    rh = requests.get(
        f"{BASE_URL}/api/finance/pocket-history?months=12", headers=H
    )
    hist = rh.json()["months"]
    current = [m for m in hist if m["month"] == month][0]
    assert (
        round(current["pocket"], 2) == round(summary_pocket, 2)
    ), f"pocket mismatch: history={current['pocket']} summary={summary_pocket}"


def test_pocket_history_reflects_seeded_entries():
    _cleanup()
    today = date.today()
    prev = _prev_month(today)
    today_iso = today.strftime("%Y-%m-%d")
    prev_iso = prev.strftime("%Y-%m-%d")

    created = []
    try:
        # Current month: 2 materiel + 1 achat
        for amt in (500.0, 300.0):
            r = requests.post(
                f"{BASE_URL}/api/finance/entries",
                headers=H,
                json={
                    "date": today_iso,
                    "category": "materiel",
                    "amount": amt,
                    "description": "SEED_HIST_V2 mat",
                    "client_name": "SEED_HIST_V2",
                },
            )
            assert r.status_code in (200, 201), r.text
            created.append(r.json()["id"])
        r = requests.post(
            f"{BASE_URL}/api/finance/entries",
            headers=H,
            json={
                "date": today_iso,
                "category": "achat",
                "amount": 100.0,
                "description": "SEED_HIST_V2 achat",
                "client_name": "SEED_HIST_V2",
            },
        )
        assert r.status_code in (200, 201)
        created.append(r.json()["id"])

        # Prev month: 1 prestation + 1 achat
        r = requests.post(
            f"{BASE_URL}/api/finance/entries",
            headers=H,
            json={
                "date": prev_iso,
                "category": "prestation",
                "amount": 1000.0,
                "description": "SEED_HIST_V2 presta prev",
                "client_name": "SEED_HIST_V2",
            },
        )
        assert r.status_code in (200, 201)
        created.append(r.json()["id"])
        r = requests.post(
            f"{BASE_URL}/api/finance/entries",
            headers=H,
            json={
                "date": prev_iso,
                "category": "achat",
                "amount": 200.0,
                "description": "SEED_HIST_V2 achat prev",
                "client_name": "SEED_HIST_V2",
            },
        )
        assert r.status_code in (200, 201)
        created.append(r.json()["id"])

        # Now fetch history + summary for each month
        rh = requests.get(
            f"{BASE_URL}/api/finance/pocket-history?months=12", headers=H
        )
        assert rh.status_code == 200
        hist = {m["month"]: m for m in rh.json()["months"]}

        for month_key in (_month_of(today), _month_of(prev)):
            rs = requests.get(
                f"{BASE_URL}/api/finance/summary?month={month_key}", headers=H
            )
            summary = rs.json()["current"]
            h = hist[month_key]
            assert round(h["pocket"], 2) == round(
                summary["net_in_pocket"], 2
            ), f"{month_key}: pocket={h['pocket']} vs summary={summary['net_in_pocket']}"
            assert round(h["ca"], 2) == round(summary["total_ca"], 2)
            assert round(h["taxes"], 2) == round(summary["total_taxes"], 2)
            assert round(h["achats"], 2) == round(summary["achats"], 2)

        # Sanity: current month pocket should include -100 achat impact
        # and materiel 800 * (1-0.135) = 692 → pocket delta ~= 692 - 100 = 592
        # (we don't have baseline pre-seed here — the summary comparison above
        # is the strong assertion.)
    finally:
        for eid in created:
            requests.delete(f"{BASE_URL}/api/finance/entries/{eid}", headers=H)
        _cleanup()
