"""Portal authentication via Microsoft OAuth (Office 365 work/school).

Single-user portal: only the email listed in PORTAL_ALLOWED_EMAIL can log in.
After successful Microsoft auth, a long-lived bearer token is issued and stored
in MongoDB. The React app presents this token via `Authorization: Bearer ...`.
"""
from __future__ import annotations

import os
import secrets
from datetime import datetime, timezone, timedelta

import msal
import requests

PORTAL_SCOPES = ["User.Read"]
SESSION_TTL_DAYS = 30


def _msal_app() -> msal.ConfidentialClientApplication:
    return msal.ConfidentialClientApplication(
        client_id=os.environ["MS_CLIENT_ID"],
        client_credential=os.environ["MS_CLIENT_SECRET"],
        authority=os.environ["MS_AUTHORITY"],
    )


def build_portal_auth_url(state: str) -> str:
    return _msal_app().get_authorization_request_url(
        scopes=PORTAL_SCOPES,
        redirect_uri=os.environ["PORTAL_REDIRECT_URI"],
        state=state,
        prompt="select_account",
    )


def exchange_code(code: str) -> dict:
    result = _msal_app().acquire_token_by_authorization_code(
        code=code,
        scopes=PORTAL_SCOPES,
        redirect_uri=os.environ["PORTAL_REDIRECT_URI"],
    )
    if "access_token" not in result:
        raise RuntimeError(result.get("error_description", str(result)))
    return result


def get_user_email(access_token: str) -> str:
    r = requests.get(
        "https://graph.microsoft.com/v1.0/me",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=15,
    )
    r.raise_for_status()
    data = r.json()
    return (data.get("mail") or data.get("userPrincipalName") or "").lower()


def gen_token() -> str:
    return secrets.token_urlsafe(48)


def gen_state() -> str:
    return secrets.token_urlsafe(24)


def expires_at_iso() -> str:
    return (datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS)).isoformat()


def is_session_active(session: dict) -> bool:
    exp = session.get("expires_at")
    if not exp:
        return False
    try:
        return datetime.fromisoformat(exp) > datetime.now(timezone.utc)
    except Exception:
        return False
