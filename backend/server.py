from fastapi import FastAPI, APIRouter, HTTPException, Body
from fastapi.responses import RedirectResponse, HTMLResponse
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

from onedrive import (
    build_auth_url, exchange_code_for_token, refresh_access_token,
    get_user_profile, append_devis_row, gen_state, now_iso,
)
from finance import (
    FinanceEntry, FinanceEntryCreate, PendingPayment, PendingPaymentCreate,
    AccountBalance, compute_summary, CATEGORIES,
)


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---- Models -----------------------------------------------------------------

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


class DevisPayload(BaseModel):
    """Payload sent by the React app when the user hits 'Save to OneDrive'."""
    date: str
    clientName: str = ""
    clientAddress: str = ""
    clientPostal: str = ""
    clientCity: str = ""
    clientPhone: str = ""
    clientEmail: str = ""
    machineType: str = "fixe"
    componentsDetail: str = ""
    partsCost: float = 0
    partsSale: float = 0
    partsShipping: float = 0
    licenseFee: float = 0
    officeFee: float = 0
    serviceFee: float = 0
    serviceLabel: str = ""
    travelLabel: str = ""
    travelAmount: float = 0
    totalBilled: float = 0
    lbcTax: float = 0
    urssafArticles: float = 0
    urssafPrestations: float = 0
    netProfit: float = 0
    margin: float = 0


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


# ---- OneDrive: OAuth flow ---------------------------------------------------

TOKENS_DOC_ID = "default"  # single-user app


async def _save_tokens(access_token: str, refresh_token: Optional[str], user_email: str):
    update = {
        "_id": TOKENS_DOC_ID,
        "access_token": access_token,
        "user_email": user_email,
        "updated_at": now_iso(),
    }
    if refresh_token:
        update["refresh_token"] = refresh_token
    await db.onedrive_tokens.update_one({"_id": TOKENS_DOC_ID}, {"$set": update}, upsert=True)


async def _get_valid_access_token() -> tuple[str, str]:
    """Return (access_token, user_email) — refreshing if needed."""
    doc = await db.onedrive_tokens.find_one({"_id": TOKENS_DOC_ID})
    if not doc:
        raise HTTPException(status_code=401, detail="OneDrive non connecté")
    refresh_token = doc.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Token de rafraîchissement manquant — reconnecte OneDrive")
    try:
        result = refresh_access_token(refresh_token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Échec du rafraîchissement: {e}") from e
    new_access = result["access_token"]
    new_refresh = result.get("refresh_token") or refresh_token
    await _save_tokens(new_access, new_refresh, doc.get("user_email", ""))
    return new_access, doc.get("user_email", "")


@api_router.get("/auth/onedrive/login")
async def onedrive_login():
    state = gen_state()
    await db.onedrive_states.insert_one({"state": state, "created_at": now_iso()})
    url = build_auth_url(state)
    return {"auth_url": url}


@api_router.get("/auth/onedrive/callback")
async def onedrive_callback(code: Optional[str] = None, state: Optional[str] = None,
                            error: Optional[str] = None, error_description: Optional[str] = None):
    if error:
        return HTMLResponse(
            f"<h2>Erreur Microsoft</h2><p>{error}: {error_description}</p>",
            status_code=400,
        )
    if not code or not state:
        raise HTTPException(status_code=400, detail="code/state manquants")

    state_doc = await db.onedrive_states.find_one_and_delete({"state": state})
    if not state_doc:
        raise HTTPException(status_code=400, detail="state invalide")

    try:
        result = exchange_code_for_token(code)
    except Exception as e:
        return HTMLResponse(f"<h2>Erreur</h2><pre>{e}</pre>", status_code=400)

    user_email = ""
    try:
        profile = get_user_profile(result["access_token"])
        user_email = profile.get("userPrincipalName") or profile.get("mail") or ""
    except Exception:
        pass

    await _save_tokens(result["access_token"], result.get("refresh_token"), user_email)

    # Bounce user back to the SPA
    backend_url = os.environ.get("MS_REDIRECT_URI", "")
    spa_url = backend_url.replace("/api/auth/onedrive/callback", "/?onedrive=connected")
    if not spa_url.startswith("http"):
        spa_url = "/?onedrive=connected"
    return RedirectResponse(spa_url)


@api_router.get("/auth/onedrive/status")
async def onedrive_status():
    doc = await db.onedrive_tokens.find_one({"_id": TOKENS_DOC_ID}, {"_id": 0})
    if not doc:
        return {"connected": False}
    return {
        "connected": True,
        "user_email": doc.get("user_email", ""),
        "updated_at": doc.get("updated_at", ""),
    }


@api_router.post("/auth/onedrive/disconnect")
async def onedrive_disconnect():
    await db.onedrive_tokens.delete_one({"_id": TOKENS_DOC_ID})
    return {"connected": False}


@api_router.post("/onedrive/save-devis")
async def save_devis(payload: DevisPayload = Body(...)):
    access_token, user_email = await _get_valid_access_token()

    row = [
        payload.date,
        payload.clientName,
        payload.clientAddress,
        payload.clientPostal,
        payload.clientCity,
        payload.clientPhone,
        payload.clientEmail,
        payload.machineType,
        payload.componentsDetail,
        payload.partsCost,
        payload.partsSale,
        payload.partsShipping,
        payload.licenseFee,
        payload.officeFee,
        payload.serviceLabel,
        payload.serviceFee,
        payload.travelLabel,
        payload.travelAmount,
        payload.totalBilled,
        payload.lbcTax,
        payload.urssafArticles,
        payload.urssafPrestations,
        payload.netProfit,
        payload.margin,
    ]

    file_path = os.environ.get("ONEDRIVE_FILE_PATH", "BeneficeNet/devis-clients.xlsx")
    try:
        result = append_devis_row(access_token, file_path, row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur OneDrive: {e}") from e

    # Auto-feed Finance ledger : create entries from this devis
    materiel_amount = round(
        float(payload.partsSale or 0)
        + float(payload.licenseFee or 0)
        + float(payload.officeFee or 0),
        2,
    )
    presta_amount = round(float(payload.serviceFee or 0) + float(payload.travelAmount or 0), 2)
    auto_entries = []
    if materiel_amount > 0:
        auto_entries.append({
            "id": str(uuid.uuid4()),
            "date": payload.date or datetime.now(timezone.utc).date().isoformat(),
            "category": "materiel",
            "amount": materiel_amount,
            "description": f"Devis {payload.clientName} — pièces + Windows",
            "client_name": payload.clientName,
            "source": "devis",
            "created_at": now_iso(),
        })
    if presta_amount > 0:
        auto_entries.append({
            "id": str(uuid.uuid4()),
            "date": payload.date or datetime.now(timezone.utc).date().isoformat(),
            "category": "prestation",
            "amount": presta_amount,
            "description": f"Devis {payload.clientName} — {payload.serviceLabel or 'service'}",
            "client_name": payload.clientName,
            "source": "devis",
            "created_at": now_iso(),
        })
    if auto_entries:
        await db.finance_entries.insert_many(auto_entries)

    return {
        "success": True,
        "file_path": file_path,
        "user_email": user_email,
        "web_url": result.get("webUrl"),
        "auto_finance_entries": len(auto_entries),
    }


# ---- Finance: entries -------------------------------------------------------

@api_router.post("/finance/entries", response_model=FinanceEntry)
async def create_finance_entry(payload: FinanceEntryCreate):
    if payload.category not in CATEGORIES:
        raise HTTPException(status_code=400, detail="Catégorie invalide")
    entry = FinanceEntry(**payload.model_dump())
    await db.finance_entries.insert_one(entry.model_dump())
    return entry


@api_router.get("/finance/entries")
async def list_finance_entries(month: Optional[str] = None):
    """List entries; optional `month` filter as YYYY-MM."""
    query: Dict[str, Any] = {}
    if month:
        query["date"] = {"$regex": f"^{month}-"}
    rows = await db.finance_entries.find(query, {"_id": 0}).sort("date", -1).to_list(2000)
    return rows


@api_router.delete("/finance/entries/{entry_id}")
async def delete_finance_entry(entry_id: str):
    res = await db.finance_entries.delete_one({"id": entry_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entrée introuvable")
    return {"deleted": True}


@api_router.get("/finance/summary")
async def get_finance_summary(month: Optional[str] = None):
    """Summary of a month (default current). Returns current + previous month."""
    today = datetime.now(timezone.utc).date()
    if not month:
        month = today.strftime("%Y-%m")

    y, m = map(int, month.split("-"))
    prev_y, prev_m = (y - 1, 12) if m == 1 else (y, m - 1)
    prev_month = f"{prev_y:04d}-{prev_m:02d}"

    cur_rows = await db.finance_entries.find(
        {"date": {"$regex": f"^{month}-"}}, {"_id": 0}
    ).to_list(2000)
    prev_rows = await db.finance_entries.find(
        {"date": {"$regex": f"^{prev_month}-"}}, {"_id": 0}
    ).to_list(2000)

    return {
        "month": month,
        "previous_month": prev_month,
        "current": compute_summary(cur_rows),
        "previous": compute_summary(prev_rows),
    }


# ---- Finance: pending payments ----------------------------------------------

@api_router.post("/finance/pending", response_model=PendingPayment)
async def create_pending_payment(payload: PendingPaymentCreate):
    pp = PendingPayment(**payload.model_dump())
    await db.pending_payments.insert_one(pp.model_dump())
    return pp


@api_router.get("/finance/pending")
async def list_pending_payments():
    rows = await db.pending_payments.find({"paid": False}, {"_id": 0}).sort("created_at", -1).to_list(500)
    total = round(sum(r.get("amount", 0) for r in rows), 2)
    return {"items": rows, "total": total, "count": len(rows)}


@api_router.delete("/finance/pending/{payment_id}")
async def delete_pending_payment(payment_id: str):
    res = await db.pending_payments.delete_one({"id": payment_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Paiement introuvable")
    return {"deleted": True}


# ---- Finance: account balance ----------------------------------------------

BALANCE_DOC_ID = "default"


@api_router.get("/finance/balance")
async def get_balance():
    doc = await db.account_balance.find_one({"_id": BALANCE_DOC_ID}, {"_id": 0})
    if not doc:
        return {"balance": 0, "cb_deferred": 0, "updated_at": ""}
    doc.setdefault("cb_deferred", 0)
    return doc


@api_router.put("/finance/balance")
async def set_balance(body: AccountBalance):
    update = body.model_dump()
    update["updated_at"] = now_iso()
    await db.account_balance.update_one(
        {"_id": BALANCE_DOC_ID}, {"$set": update}, upsert=True
    )
    return update


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
