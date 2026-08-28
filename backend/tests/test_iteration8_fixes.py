"""Iteration 8 tests: fixes for billing/status auth+ownership, stripe webhook malformed body,
auth/refresh with deleted user."""
import os
import time
import uuid

import pytest
import requests
from dotenv import dotenv_values
from pymongo import MongoClient

frontend_env = dotenv_values("/app/frontend/.env")
backend_env = dotenv_values("/app/backend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"
PASSWORD = "VexorTest123!"

MONGO_URL = os.environ.get("MONGO_URL") or backend_env.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME") or backend_env.get("DB_NAME")


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def auth(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def register(session, suffix=""):
    stamp = f"{int(time.time()*1000)}{suffix}{uuid.uuid4().hex[:4]}"
    email = f"TEST_it8_{stamp}@example.com"
    r = session.post(f"{API}/auth/register", json={
        "email": email, "password": PASSWORD, "username": f"TESTit8{stamp[-8:]}"
    })
    assert r.status_code == 200, f"register failed {r.status_code} {r.text[:300]}"
    data = r.json()
    data["email"] = email
    return data


@pytest.fixture(scope="module")
def owner(session):
    return register(session, "own")


@pytest.fixture(scope="module")
def intruder(session):
    return register(session, "int")


@pytest.fixture(scope="module")
def checkout_session_id(session, owner):
    r = session.post(f"{API}/billing/checkout", json={
        "lookup_key": "vexor_pulse_monthly", "origin_url": BASE_URL
    }, headers=auth(owner["access_token"]))
    assert r.status_code == 200, f"{r.status_code} {r.text[:400]}"
    sid = r.json()["session_id"]
    assert sid.startswith("cs_")
    return sid


# ---------- billing/status auth + ownership ----------
class TestBillingStatusOwnership:
    def test_status_requires_auth(self, session, checkout_session_id):
        r = requests.get(f"{API}/billing/status/{checkout_session_id}")
        assert r.status_code in (401, 403), f"expected 401/403 got {r.status_code} {r.text[:300]}"

    def test_status_other_user_404(self, session, checkout_session_id, intruder):
        r = session.get(f"{API}/billing/status/{checkout_session_id}",
                        headers=auth(intruder["access_token"]))
        assert r.status_code == 404, f"expected 404 got {r.status_code} {r.text[:300]}"

    def test_status_owner_200(self, session, checkout_session_id, owner):
        r = session.get(f"{API}/billing/status/{checkout_session_id}",
                        headers=auth(owner["access_token"]))
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        d = r.json()
        assert d["session_id"] == checkout_session_id
        assert d["tier"] == "pulse"
        assert d["payment_status"] in ("pending", "unpaid", "no_payment_required", "paid")
        assert "_id" not in d

    def test_status_invalid_token(self, session, checkout_session_id):
        r = requests.get(f"{API}/billing/status/{checkout_session_id}",
                         headers={"Authorization": "Bearer not.a.token"})
        assert r.status_code in (401, 403)


# ---------- webhook malformed bodies ----------
class TestWebhookMalformed:
    @pytest.mark.parametrize("body,ctype", [
        ("this-is-not-json", "text/plain"),
        ("", "application/json"),
        ("{not: valid json,,}", "application/json"),
        ("[1,2,3]", "application/json"),
    ])
    def test_malformed_body_returns_400(self, body, ctype):
        r = requests.post(f"{API}/stripe/webhook", data=body,
                          headers={"Content-Type": ctype, "stripe-signature": "t=1,v1=deadbeef"})
        assert r.status_code == 400, f"expected 400 got {r.status_code} for body={body!r} {r.text[:200]}"

    def test_malformed_body_no_signature(self):
        r = requests.post(f"{API}/stripe/webhook", data="garbage",
                          headers={"Content-Type": "application/json"})
        assert r.status_code == 400, f"expected 400 got {r.status_code} {r.text[:200]}"


# ---------- refresh with deleted user ----------
class TestRefreshDeletedUser:
    def test_refresh_after_user_deleted_returns_401(self, session):
        if not MONGO_URL or not DB_NAME:
            pytest.skip("MONGO_URL/DB_NAME unavailable")
        data = register(session, "del")
        refresh_token = data["refresh_token"]
        user_id = data["user"]["id"]

        client = MongoClient(MONGO_URL)
        try:
            res = client[DB_NAME].users.delete_one({"id": user_id})
            assert res.deleted_count == 1, "test user was not deleted from db"
        finally:
            client.close()

        r = session.post(f"{API}/auth/refresh", json={"refresh_token": refresh_token})
        assert r.status_code == 401, f"expected 401 got {r.status_code} {r.text[:300]}"
        assert "detail" in r.json()

    def test_refresh_happy_path_still_works(self, session):
        data = register(session, "ok")
        r = session.post(f"{API}/auth/refresh", json={"refresh_token": data["refresh_token"]})
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        body = r.json()
        assert body["access_token"] and body["refresh_token"]
        assert body["user"]["id"] == data["user"]["id"]
        # old refresh token now revoked
        again = session.post(f"{API}/auth/refresh", json={"refresh_token": data["refresh_token"]})
        assert again.status_code == 401

    def test_refresh_garbage_token(self, session):
        r = session.post(f"{API}/auth/refresh", json={"refresh_token": "abc.def.ghi"})
        assert r.status_code == 401
