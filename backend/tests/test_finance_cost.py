"""Backend tests: entry cost feature creates 'achat' entry and affects net_in_pocket."""
import os
import requests
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://profit-calculator-65.preview.emergentagent.com").rstrip("/")
TOKEN = "TEST_TOKEN_DO_NOT_USE_IN_PROD"
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
MONTH = datetime.now().strftime("%Y-%m")
TODAY = datetime.now().strftime("%Y-%m-%d")


def _cleanup():
    # remove any TEST_ entries we may have created
    r = requests.get(f"{BASE_URL}/api/finance/entries?month={MONTH}", headers=H)
    if r.status_code == 200:
        for e in r.json():
            if e.get("client_name", "").startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/finance/entries/{e['id']}", headers=H)


def test_auth_required():
    r = requests.get(f"{BASE_URL}/api/finance/summary?month={MONTH}")
    assert r.status_code == 401


def test_summary_shape_includes_achats_and_net_in_pocket():
    r = requests.get(f"{BASE_URL}/api/finance/summary?month={MONTH}", headers=H)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "current" in data
    cur = data["current"]
    assert "achats" in cur
    assert "net_in_pocket" in cur
    assert "net_after_taxes" in cur


def test_entry_with_cost_creates_achat_and_impacts_pocket():
    _cleanup()
    # baseline summary
    r0 = requests.get(f"{BASE_URL}/api/finance/summary?month={MONTH}", headers=H)
    assert r0.status_code == 200
    base = r0.json()["current"]
    base_ca = base["total_ca"]
    base_achats = base["achats"]
    base_pocket = base["net_in_pocket"]

    # Create prestation entry 680€
    r1 = requests.post(f"{BASE_URL}/api/finance/entries", headers=H, json={
        "date": TODAY, "category": "prestation", "amount": 680.0,
        "description": "TEST cost", "client_name": "TEST_CostClient"
    })
    assert r1.status_code in (200, 201), r1.text
    presta_id = r1.json()["id"]

    # Create achat entry 450€ (simulates coût matériel)
    r2 = requests.post(f"{BASE_URL}/api/finance/entries", headers=H, json={
        "date": TODAY, "category": "achat", "amount": 450.0,
        "description": "Coût matériel — TEST", "client_name": "TEST_CostClient"
    })
    assert r2.status_code in (200, 201), r2.text
    achat_id = r2.json()["id"]

    # Verify both persisted
    r3 = requests.get(f"{BASE_URL}/api/finance/entries?month={MONTH}", headers=H)
    assert r3.status_code == 200
    ids = {e["id"] for e in r3.json()}
    assert presta_id in ids
    assert achat_id in ids

    # Verify summary
    r4 = requests.get(f"{BASE_URL}/api/finance/summary?month={MONTH}", headers=H)
    cur = r4.json()["current"]
    assert round(cur["total_ca"] - base_ca, 2) == 680.0, cur
    assert round(cur["achats"] - base_achats, 2) == 450.0, cur
    # Expected pocket delta: 680 * (1 - 0.231) - 450 ~= 522.92 - 450 = 72.92
    delta_pocket = round(cur["net_in_pocket"] - base_pocket, 2)
    # Tolerance: taxes computed at 21.2+1.7+0.2 = 23.1% ~= 522.92 net
    assert 70.0 <= delta_pocket <= 76.0, f"unexpected pocket delta {delta_pocket}"

    # cleanup
    requests.delete(f"{BASE_URL}/api/finance/entries/{presta_id}", headers=H)
    requests.delete(f"{BASE_URL}/api/finance/entries/{achat_id}", headers=H)


def test_materiel_with_cost_pocket_calculation():
    _cleanup()
    r0 = requests.get(f"{BASE_URL}/api/finance/summary?month={MONTH}", headers=H)
    base = r0.json()["current"]
    base_pocket = base["net_in_pocket"]

    r1 = requests.post(f"{BASE_URL}/api/finance/entries", headers=H, json={
        "date": TODAY, "category": "materiel", "amount": 680.0,
        "description": "TEST mat", "client_name": "TEST_MatClient"
    })
    assert r1.status_code in (200, 201)
    mid = r1.json()["id"]
    r2 = requests.post(f"{BASE_URL}/api/finance/entries", headers=H, json={
        "date": TODAY, "category": "achat", "amount": 450.0,
        "description": "Coût matériel — TEST", "client_name": "TEST_MatClient"
    })
    aid = r2.json()["id"]

    r4 = requests.get(f"{BASE_URL}/api/finance/summary?month={MONTH}", headers=H)
    cur = r4.json()["current"]
    # Expected pocket delta for materiel: 680 * (1 - 0.135) - 450 = 588.20 - 450 = 138.20
    delta_pocket = round(cur["net_in_pocket"] - base_pocket, 2)
    assert 135.0 <= delta_pocket <= 141.0, f"unexpected materiel delta {delta_pocket}"

    requests.delete(f"{BASE_URL}/api/finance/entries/{mid}", headers=H)
    requests.delete(f"{BASE_URL}/api/finance/entries/{aid}", headers=H)
