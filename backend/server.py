from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone

from finance import (
    FinanceEntry, FinanceEntryCreate, PendingPayment, PendingPaymentCreate,
    AccountBalance, compute_summary, CATEGORIES,
    LbcPurchase, LbcPurchaseCreate,
    MonthlyCharge, MonthlyChargeCreate,
    RecurringRevenue, RecurringRevenueCreate,
    PaymentToPrepare, PaymentToPrepareCreate,
    StockItem, StockItemCreate,
    WifePayment, WifePaymentCreate,
)
from portal_auth import (
    build_portal_auth_url, exchange_code as portal_exchange_code,
    get_user_email, gen_token, gen_state as portal_gen_state,
    expires_at_iso, is_session_active,
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---- Portal auth dependency -------------------------------------------------

async def require_auth(authorization: Optional[str] = Header(None)):
    """Validate Bearer token issued by /auth/portal/callback."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Non authentifié")
    token = authorization[7:].strip()
    session = await db.portal_sessions.find_one({"token": token}, {"_id": 0})
    if not session or not is_session_active(session):
        raise HTTPException(status_code=401, detail="Session expirée")
    return session


# ---- Models -----------------------------------------------------------------

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


# ---- Portal auth flow -------------------------------------------------------

@api_router.get("/auth/portal/login")
async def portal_login():
    state = portal_gen_state()
    await db.portal_states.insert_one({"state": state, "created_at": now_iso()})
    url = build_portal_auth_url(state)
    return {"auth_url": url}


@api_router.get("/auth/portal/callback")
async def portal_callback(code: Optional[str] = None, state: Optional[str] = None,
                          error: Optional[str] = None, error_description: Optional[str] = None):
    spa_root = os.environ.get("FRONTEND_URL") or os.environ["PORTAL_REDIRECT_URI"].replace("/api/auth/portal/callback", "")

    if error:
        return RedirectResponse(f"{spa_root}/?portal_error={error}")
    if not code or not state:
        raise HTTPException(status_code=400, detail="code/state manquants")

    state_doc = await db.portal_states.find_one_and_delete({"state": state})
    if not state_doc:
        raise HTTPException(status_code=400, detail="state invalide")

    try:
        result = portal_exchange_code(code)
        email = get_user_email(result["access_token"])
    except Exception as e:
        return RedirectResponse(f"{spa_root}/?portal_error={str(e)[:80]}")

    allowed = (os.environ.get("PORTAL_ALLOWED_EMAIL") or "").lower()
    if not email or (allowed and email != allowed):
        return RedirectResponse(f"{spa_root}/?portal_error=email_non_autorise")

    token = gen_token()
    await db.portal_sessions.insert_one({
        "token": token,
        "email": email,
        "created_at": now_iso(),
        "expires_at": expires_at_iso(),
    })

    return RedirectResponse(f"{spa_root}/?portal_token={token}&email={email}")


@api_router.get("/auth/portal/me")
async def portal_me(session: dict = Depends(require_auth)):
    return {"email": session.get("email"), "expires_at": session.get("expires_at")}


@api_router.post("/auth/portal/logout")
async def portal_logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
        await db.portal_sessions.delete_one({"token": token})
    return {"logged_out": True}


# ---- Default routes ---------------------------------------------------------

@api_router.get("/")
async def root():
    return {"message": "Hello World"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.model_dump())
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    rows = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for r in rows:
        if isinstance(r['timestamp'], str):
            r['timestamp'] = datetime.fromisoformat(r['timestamp'])
    return rows


# ---- OneDrive: removed (deprecated — using local MongoDB storage) -----------


# ---- Finance: entries -------------------------------------------------------

@api_router.post("/finance/entries", response_model=FinanceEntry)
async def create_finance_entry(payload: FinanceEntryCreate, _=Depends(require_auth)):
    if payload.category not in CATEGORIES:
        raise HTTPException(status_code=400, detail="Catégorie invalide")
    entry = FinanceEntry(**payload.model_dump())
    await db.finance_entries.insert_one(entry.model_dump())
    return entry


@api_router.get("/finance/entries")
async def list_finance_entries(month: Optional[str] = None, _=Depends(require_auth)):
    """List entries; optional `month` filter as YYYY-MM."""
    query: Dict[str, Any] = {}
    if month:
        query["date"] = {"$regex": f"^{month}-"}
    rows = await db.finance_entries.find(query, {"_id": 0}).sort("date", -1).to_list(2000)
    return rows


@api_router.delete("/finance/entries/{entry_id}")
async def delete_finance_entry(entry_id: str, _=Depends(require_auth)):
    res = await db.finance_entries.delete_one({"id": entry_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entrée introuvable")
    return {"deleted": True}


class EntryUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None


@api_router.patch("/finance/entries/{entry_id}")
async def update_finance_entry(entry_id: str, body: EntryUpdate, _=Depends(require_auth)):
    update = {}
    if body.amount is not None:
        if body.amount < 0:
            raise HTTPException(status_code=400, detail="Montant invalide")
        update["amount"] = float(body.amount)
    if body.description is not None:
        update["description"] = body.description
    if body.category is not None:
        if body.category not in CATEGORIES:
            raise HTTPException(status_code=400, detail="Catégorie invalide")
        update["category"] = body.category
    if not update:
        raise HTTPException(status_code=400, detail="Aucun champ à modifier")
    res = await db.finance_entries.update_one({"id": entry_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entrée introuvable")
    return {"updated": True, **update}


@api_router.delete("/finance/entries/month/{month}")
async def reset_finance_month(month: str, _=Depends(require_auth)):
    """Supprime toutes les écritures finance d'un mois donné (YYYY-MM)."""
    if len(month) != 7 or month[4] != "-":
        raise HTTPException(status_code=400, detail="Format mois invalide (YYYY-MM)")
    res = await db.finance_entries.delete_many({"date": {"$regex": f"^{month}-"}})
    return {"deleted": res.deleted_count, "month": month}


@api_router.get("/finance/summary")
async def get_finance_summary(month: Optional[str] = None, _=Depends(require_auth)):
    """Summary of a month (default current). Returns current + previous month."""
    today = datetime.now(timezone.utc).date()
    if not month:
        month = today.strftime("%Y-%m")

    y, m = map(int, month.split("-"))
    prev_y, prev_m = (y - 1, 12) if m == 1 else (y, m - 1)
    prev_month = f"{prev_y:04d}-{prev_m:02d}"
    pp_y, pp_m = (prev_y - 1, 12) if prev_m == 1 else (prev_y, prev_m - 1)
    prev_prev_month = f"{pp_y:04d}-{pp_m:02d}"

    cur_rows = await db.finance_entries.find(
        {"date": {"$regex": f"^{month}-"}}, {"_id": 0}
    ).to_list(2000)
    prev_rows = await db.finance_entries.find(
        {"date": {"$regex": f"^{prev_month}-"}}, {"_id": 0}
    ).to_list(2000)
    prev_prev_rows = await db.finance_entries.find(
        {"date": {"$regex": f"^{prev_prev_month}-"}}, {"_id": 0}
    ).to_list(2000)

    return {
        "month": month,
        "previous_month": prev_month,
        "prev_prev_month": prev_prev_month,
        "current": compute_summary(cur_rows),
        "previous": compute_summary(prev_rows),
        "prev_prev": compute_summary(prev_prev_rows),
    }


# ---- Finance: pending payments ----------------------------------------------

@api_router.post("/finance/pending", response_model=PendingPayment)
async def create_pending_payment(payload: PendingPaymentCreate, _=Depends(require_auth)):
    pp = PendingPayment(**payload.model_dump())
    await db.pending_payments.insert_one(pp.model_dump())
    return pp


@api_router.get("/finance/pending")
async def list_pending_payments(_=Depends(require_auth)):
    rows = await db.pending_payments.find({"paid": False}, {"_id": 0}).sort("created_at", -1).to_list(500)
    total = round(sum(r.get("amount", 0) for r in rows), 2)
    return {"items": rows, "total": total, "count": len(rows)}


@api_router.delete("/finance/pending/{payment_id}")
async def delete_pending_payment(payment_id: str, _=Depends(require_auth)):
    res = await db.pending_payments.delete_one({"id": payment_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Paiement introuvable")
    return {"deleted": True}


class PendingCategoryUpdate(BaseModel):
    category: str


@api_router.patch("/finance/pending/{payment_id}")
async def update_pending_payment(payment_id: str, body: PendingCategoryUpdate, _=Depends(require_auth)):
    if body.category not in CATEGORIES:
        raise HTTPException(status_code=400, detail="Catégorie invalide")
    res = await db.pending_payments.update_one(
        {"id": payment_id}, {"$set": {"category": body.category}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Paiement introuvable")
    return {"updated": True, "category": body.category}


@api_router.post("/finance/pending/{payment_id}/confirm")
async def confirm_pending_payment(payment_id: str, _=Depends(require_auth)):
    """Convertit un paiement en attente en écriture CA et supprime le pending."""
    doc = await db.pending_payments.find_one({"id": payment_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Paiement introuvable")
    category = doc.get("category") or "prestation"
    if category not in CATEGORIES:
        category = "prestation"
    entry = FinanceEntry(
        date=datetime.now(timezone.utc).date().isoformat(),
        category=category,
        amount=float(doc.get("amount") or 0),
        description=f"Encaissement {doc.get('client_name', '')}{(' — ' + doc['note']) if doc.get('note') else ''}".strip(),
        client_name=doc.get("client_name", ""),
        source="pending",
    )
    await db.finance_entries.insert_one(entry.model_dump())
    await db.pending_payments.delete_one({"id": payment_id})

    # Mise à jour du solde réel : on ajoute le montant encaissé
    encaissed_amount = float(doc.get("amount") or 0)
    await db.account_balance.update_one(
        {"_id": BALANCE_DOC_ID},
        {"$inc": {"balance": encaissed_amount}, "$set": {"updated_at": now_iso()}},
        upsert=True,
    )

    # Auto-convert LBC purchases matching same client_name into "achat" entries
    # Mais SEULEMENT si le pending encaissé est "materiel" (les prestations n'ont pas d'achat associé)
    linked_purchases = []
    client_key = (doc.get("client_name") or "").strip().lower()
    if client_key and category == "materiel":
        matching = await db.lbc_purchases.find(
            {}, {"_id": 0}
        ).to_list(500)
        for lbc in matching:
            if (lbc.get("client_name") or "").strip().lower() == client_key:
                platform = lbc.get("platform") or "leboncoin"
                achat_entry = FinanceEntry(
                    date=datetime.now(timezone.utc).date().isoformat(),
                    category="achat",
                    amount=float(lbc.get("amount") or 0),
                    description=f"Achat {platform} — {lbc.get('label') or ''} ({doc.get('client_name', '')})".strip(),
                    client_name=doc.get("client_name", ""),
                    source="lbc_auto",
                )
                await db.finance_entries.insert_one(achat_entry.model_dump())
                await db.lbc_purchases.delete_one({"id": lbc["id"]})
                linked_purchases.append(achat_entry.model_dump())

    return {"encaisse": True, "entry": entry.model_dump(), "linked_purchases": linked_purchases}


# ---- Finance: account balance ----------------------------------------------

BALANCE_DOC_ID = "default"


@api_router.post("/finance/lbc-purchases", response_model=LbcPurchase)
async def create_lbc_purchase(payload: LbcPurchaseCreate, _=Depends(require_auth)):
    item = LbcPurchase(**payload.model_dump())
    await db.lbc_purchases.insert_one(item.model_dump())
    return item


@api_router.get("/finance/lbc-purchases")
async def list_lbc_purchases(_=Depends(require_auth)):
    rows = await db.lbc_purchases.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    total = round(sum(r.get("amount", 0) for r in rows), 2)
    return {"items": rows, "total": total, "count": len(rows)}


@api_router.delete("/finance/lbc-purchases/{purchase_id}")
async def delete_lbc_purchase(purchase_id: str, _=Depends(require_auth)):
    res = await db.lbc_purchases.delete_one({"id": purchase_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Achat introuvable")
    return {"deleted": True}


# ---- Finance: monthly recurring charges ------------------------------------

@api_router.post("/finance/monthly-charges", response_model=MonthlyCharge)
async def create_monthly_charge(payload: MonthlyChargeCreate, _=Depends(require_auth)):
    if payload.day_of_month < 1 or payload.day_of_month > 31:
        raise HTTPException(status_code=400, detail="Jour invalide (1-31)")
    item = MonthlyCharge(**payload.model_dump())
    await db.monthly_charges.insert_one(item.model_dump())
    return item


@api_router.get("/finance/monthly-charges")
async def list_monthly_charges(_=Depends(require_auth)):
    rows = await db.monthly_charges.find({}, {"_id": 0}).sort("day_of_month", 1).to_list(500)
    total = round(sum(r.get("amount", 0) for r in rows), 2)
    return {"items": rows, "total": total, "count": len(rows)}


@api_router.delete("/finance/monthly-charges/{charge_id}")
async def delete_monthly_charge(charge_id: str, _=Depends(require_auth)):
    res = await db.monthly_charges.delete_one({"id": charge_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Charge introuvable")
    return {"deleted": True}


# ---- Finance: recurring client revenues ------------------------------------

@api_router.post("/finance/recurring-revenues", response_model=RecurringRevenue)
async def create_recurring_revenue(payload: RecurringRevenueCreate, _=Depends(require_auth)):
    if payload.day_of_month < 1 or payload.day_of_month > 31:
        raise HTTPException(status_code=400, detail="Jour invalide (1-31)")
    item = RecurringRevenue(**payload.model_dump())
    await db.recurring_revenues.insert_one(item.model_dump())
    return item


@api_router.get("/finance/recurring-revenues")
async def list_recurring_revenues(_=Depends(require_auth)):
    rows = await db.recurring_revenues.find({}, {"_id": 0}).sort("day_of_month", 1).to_list(500)
    total = round(sum(r.get("amount", 0) for r in rows), 2)
    return {"items": rows, "total": total, "count": len(rows)}


@api_router.delete("/finance/recurring-revenues/{revenue_id}")
async def delete_recurring_revenue(revenue_id: str, _=Depends(require_auth)):
    res = await db.recurring_revenues.delete_one({"id": revenue_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Abonnement introuvable")
    return {"deleted": True}


@api_router.post("/finance/import-subscriptions")
async def import_subscriptions(month: Optional[str] = None, _=Depends(require_auth)):
    """Crée pour le mois donné les écritures CA manquantes correspondant aux abonnements clients.
    Utilise un id déterministe `sub-{revenue_id}-{YYYY-MM}` : pas de doublon si déjà importé.
    Si l'utilisateur supprime ensuite l'écriture, un nouvel import la recréera."""
    if not month:
        month = datetime.now(timezone.utc).date().isoformat()[:7]
    if len(month) != 7 or month[4] != "-":
        raise HTTPException(status_code=400, detail="Format mois invalide (YYYY-MM)")

    # Liste des abonnements à exclure de l'import mensuel (prépayés annuels, hors récurrent)
    EXCLUDED_LABELS = {"molto"}
    # Liste des abos pour lesquels la commission GoCardless Advanced doit être déduite
    # (abos dont le montant en BD est encore le brut — pour les autres c'est déjà ajusté)
    GC_FEE_LABELS = {"somnum"}

    def _gc_fee(amt: float) -> float:
        if amt <= 0:
            return 0.0
        return min(2.5, round(amt * 0.0125 + 0.2, 2))

    revenues = await db.recurring_revenues.find({}, {"_id": 0}).to_list(500)
    imported, skipped = [], []
    for r in revenues:
        label_norm = (r.get("label") or "").strip().lower()
        # Skip si label contient un terme exclu OU si abo marqué prépayé annuel
        if r.get("prepaid") or any(excl in label_norm for excl in EXCLUDED_LABELS):
            skipped.append(r.get("id"))
            continue
        sub_id = r.get("id")
        if not sub_id:
            continue
        det_id = f"sub-{sub_id}-{month}"
        existing = await db.finance_entries.find_one({"id": det_id}, {"_id": 0})
        if existing:
            skipped.append(det_id)
            continue
        # Date de l'écriture = jour du mois de l'abo (clamp si dépasse, ex: 31 en février)
        day = max(1, min(28, int(r.get("day_of_month") or 1)))
        try:
            entry_date = f"{month}-{day:02d}"
        except Exception:
            entry_date = f"{month}-01"
        gross = float(r.get("amount") or 0)
        apply_gc = any(g in label_norm for g in GC_FEE_LABELS)
        fee = _gc_fee(gross) if apply_gc else 0.0
        net = round(gross - fee, 2)
        desc_suffix = f" (net après commission GC −{fee:.2f}€)" if fee > 0 else ""
        entry = {
            "id": det_id,
            "date": entry_date,
            "category": "prestation",
            "amount": net,
            "description": f"Abonnement mensuel — {r.get('label', '')}".strip() + desc_suffix,
            "client_name": r.get("label", ""),
            "source": "subscription",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.finance_entries.insert_one(dict(entry))
        imported.append(entry)
    return {"imported": len(imported), "skipped": len(skipped), "month": month, "items": imported}


# ---- Finance: payments to prepare ------------------------------------------

@api_router.post("/finance/payments-to-prepare", response_model=PaymentToPrepare)
async def create_payment_to_prepare(payload: PaymentToPrepareCreate, _=Depends(require_auth)):
    item = PaymentToPrepare(**payload.model_dump())
    await db.payments_to_prepare.insert_one(item.model_dump())
    return item


@api_router.get("/finance/payments-to-prepare")
async def list_payments_to_prepare(_=Depends(require_auth)):
    rows = await db.payments_to_prepare.find({}, {"_id": 0}).sort("created_at", 1).to_list(500)
    total = round(sum(r.get("amount", 0) for r in rows), 2)
    return {"items": rows, "total": total, "count": len(rows)}


@api_router.delete("/finance/payments-to-prepare/{payment_id}")
async def delete_payment_to_prepare(payment_id: str, _=Depends(require_auth)):
    res = await db.payments_to_prepare.delete_one({"id": payment_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Paiement introuvable")
    return {"deleted": True}


# ---- Finance: stock items --------------------------------------------------

@api_router.post("/finance/stock", response_model=StockItem)
async def create_stock_item(payload: StockItemCreate, _=Depends(require_auth)):
    item = StockItem(**payload.model_dump())
    await db.stock_items.insert_one(item.model_dump())
    return item


@api_router.get("/finance/stock")
async def list_stock_items(_=Depends(require_auth)):
    rows = await db.stock_items.find({}, {"_id": 0}).sort("kind", 1).to_list(500)
    total_value = round(sum((r.get("quantity", 0) * r.get("unit_value", 0)) for r in rows), 2)
    total_qty = sum(r.get("quantity", 0) for r in rows)
    fixes = sum(r.get("quantity", 0) for r in rows if r.get("kind") == "fixe")
    portables = sum(r.get("quantity", 0) for r in rows if r.get("kind") == "portable")
    return {
        "items": rows,
        "total_value": total_value,
        "total_quantity": total_qty,
        "fixes": fixes,
        "portables": portables,
    }


@api_router.delete("/finance/stock/{item_id}")
async def delete_stock_item(item_id: str, _=Depends(require_auth)):
    res = await db.stock_items.delete_one({"id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article introuvable")
    return {"deleted": True}


# ---- Finance: wife payments (300€/mois dus) ---------------------------------

WIFE_MONTHLY_TARGET = 300.0


@api_router.post("/finance/wife-payments", response_model=WifePayment)
async def create_wife_payment(payload: WifePaymentCreate, _=Depends(require_auth)):
    item = WifePayment(**payload.model_dump())
    await db.wife_payments.insert_one(item.model_dump())
    return item


@api_router.get("/finance/wife-payments")
async def list_wife_payments(month: Optional[str] = None, _=Depends(require_auth)):
    if not month:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
    rows = await db.wife_payments.find(
        {"date": {"$regex": f"^{month}"}}, {"_id": 0}
    ).sort("date", 1).to_list(500)
    total = round(sum(r.get("amount", 0) for r in rows), 2)
    remaining = round(max(WIFE_MONTHLY_TARGET - total, 0), 2)
    return {
        "items": rows,
        "month": month,
        "target": WIFE_MONTHLY_TARGET,
        "paid": total,
        "remaining": remaining,
    }


@api_router.delete("/finance/wife-payments/{payment_id}")
async def delete_wife_payment(payment_id: str, _=Depends(require_auth)):
    res = await db.wife_payments.delete_one({"id": payment_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Versement introuvable")
    return {"deleted": True}


@api_router.get("/finance/balance")
async def get_balance(_=Depends(require_auth)):
    doc = await db.account_balance.find_one({"_id": BALANCE_DOC_ID}, {"_id": 0})
    if not doc:
        return {"balance": 0, "cb_deferred": 0, "lbc_pending": 0, "urssaf_handled_cycles": [], "updated_at": ""}
    doc.setdefault("cb_deferred", 0)
    doc.setdefault("lbc_pending", 0)
    doc.setdefault("urssaf_handled_cycles", [])
    return doc


@api_router.put("/finance/balance")
async def set_balance(body: AccountBalance, _=Depends(require_auth)):
    update = body.model_dump()
    update["updated_at"] = now_iso()
    await db.account_balance.update_one(
        {"_id": BALANCE_DOC_ID}, {"$set": update}, upsert=True
    )
    return update


class UrssafHandleBody(BaseModel):
    cycle: str  # "YYYY-MM" — the payment month (when the 4th-of-month withdrawal happens)
    amount: float
    action: str  # "consume" | "skip"
    source_month: str = ""  # "YYYY-MM" — the CA source (cycle-2)


@api_router.post("/finance/balance/urssaf-handle")
async def urssaf_handle(body: UrssafHandleBody, _=Depends(require_auth)):
    if body.action not in ("consume", "skip"):
        raise HTTPException(status_code=400, detail="Action invalide")
    doc = await db.account_balance.find_one({"_id": BALANCE_DOC_ID}, {"_id": 0}) or {}
    handled = doc.get("urssaf_handled_cycles", [])
    # If cycle already handled, reject (must undo first)
    if any(h.get("cycle") == body.cycle for h in handled):
        raise HTTPException(status_code=409, detail="Cycle déjà traité — annule avant de refaire")
    new_balance = float(doc.get("balance", 0))
    if body.action == "consume":
        new_balance = round(new_balance - body.amount, 2)
    handled.append({
        "cycle": body.cycle,
        "amount": body.amount,
        "action": body.action,
        "source_month": body.source_month,
        "date": now_iso(),
    })
    await db.account_balance.update_one(
        {"_id": BALANCE_DOC_ID},
        {"$set": {
            "balance": new_balance,
            "urssaf_handled_cycles": handled,
            "updated_at": now_iso(),
        }},
        upsert=True,
    )
    return {"balance": new_balance, "handled": handled[-1]}


class UrssafUndoBody(BaseModel):
    cycle: str


@api_router.post("/finance/balance/urssaf-undo")
async def urssaf_undo(body: UrssafUndoBody, _=Depends(require_auth)):
    doc = await db.account_balance.find_one({"_id": BALANCE_DOC_ID}, {"_id": 0}) or {}
    handled = doc.get("urssaf_handled_cycles", [])
    target = next((h for h in handled if h.get("cycle") == body.cycle), None)
    if not target:
        raise HTTPException(status_code=404, detail="Aucune déduction trouvée pour ce cycle")
    new_balance = float(doc.get("balance", 0))
    if target.get("action") == "consume":
        new_balance = round(new_balance + float(target.get("amount", 0)), 2)
    handled = [h for h in handled if h.get("cycle") != body.cycle]
    await db.account_balance.update_one(
        {"_id": BALANCE_DOC_ID},
        {"$set": {
            "balance": new_balance,
            "urssaf_handled_cycles": handled,
            "updated_at": now_iso(),
        }},
    )
    return {"balance": new_balance, "restored": target}


# ---- App wiring -------------------------------------------------------------

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
