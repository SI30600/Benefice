"""Finance tracking models + helpers.

Tracks revenue entries (presta / matériel / formation) per month, pending
client payments, and a manually-updated bank balance. Computes URSSAF/impôt
breakdown using exact French micro-entrepreneur rates (versement libératoire
BIC option).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Optional
from pydantic import BaseModel, Field, ConfigDict
import uuid

# Rates (must mirror frontend constants in Calculator.jsx)
RATE_URSSAF_PRESTA = 0.212
RATE_URSSAF_VENTE = 0.123
RATE_IMPOT_PRESTA = 0.017
RATE_IMPOT_VENTE = 0.01
RATE_FORMATION = 0.002

CATEGORIES = ("prestation", "materiel", "formation")
Category = Literal["prestation", "materiel", "formation"]


class FinanceEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str  # ISO date "YYYY-MM-DD"
    category: Category
    amount: float
    description: str = ""
    client_name: str = ""
    source: str = "manual"  # "manual" | "devis"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class FinanceEntryCreate(BaseModel):
    date: str
    category: Category
    amount: float
    description: str = ""
    client_name: str = ""


class PendingPayment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    amount: float
    note: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    paid: bool = False


class PendingPaymentCreate(BaseModel):
    client_name: str
    amount: float
    note: str = ""


class LbcPurchase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str
    amount: float
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class LbcPurchaseCreate(BaseModel):
    label: str
    amount: float


class AccountBalance(BaseModel):
    balance: float = 0
    cb_deferred: float = 0
    lbc_pending: float = 0
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


def compute_summary(entries: list[dict]) -> dict:
    presta = round(sum(e["amount"] for e in entries if e["category"] == "prestation"), 2)
    materiel = round(sum(e["amount"] for e in entries if e["category"] == "materiel"), 2)
    formation = round(sum(e["amount"] for e in entries if e["category"] == "formation"), 2)
    total_ca = round(presta + materiel + formation, 2)

    urssaf_presta = round(presta * RATE_URSSAF_PRESTA, 2)
    urssaf_materiel = round(materiel * RATE_URSSAF_VENTE, 2)
    # Pour la formation BNC, on considère le même taux URSSAF que les prestations
    urssaf_formation = round(formation * RATE_URSSAF_PRESTA, 2)

    impot_presta = round(presta * RATE_IMPOT_PRESTA, 2)
    impot_vente = round(materiel * RATE_IMPOT_VENTE, 2)
    impot_formation = round(formation * RATE_IMPOT_PRESTA, 2)

    cfp = round(total_ca * RATE_FORMATION, 2)

    total_urssaf = round(urssaf_presta + urssaf_materiel + urssaf_formation, 2)
    total_impot = round(impot_presta + impot_vente + impot_formation, 2)
    total_taxes = round(total_urssaf + total_impot + cfp, 2)
    net_after_taxes = round(total_ca - total_taxes, 2)

    last_entry = max(
        (e["date"] for e in entries),
        default=None,
    )

    return {
        "total_ca": total_ca,
        "presta": presta,
        "materiel": materiel,
        "formation": formation,
        "urssaf_presta": urssaf_presta,
        "urssaf_materiel": urssaf_materiel,
        "urssaf_formation": urssaf_formation,
        "impot_presta": impot_presta,
        "impot_vente": impot_vente,
        "impot_formation": impot_formation,
        "cfp": cfp,
        "total_urssaf": total_urssaf,
        "total_impot": total_impot,
        "total_taxes": total_taxes,
        "net_after_taxes": net_after_taxes,
        "last_entry_date": last_entry,
        "entries_count": len(entries),
    }
