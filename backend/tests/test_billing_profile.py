"""Iteration 7 tests: billing endpoints, tier fields, profile PATCH, community regression."""
import os
import time
import uuid

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"
PASSWORD = "VexorTest123!"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _register(session, suffix=""):
    stamp = f"{int(time.time()*1000)}{suffix}{uuid.uuid4().hex[:4]}"
    email = f"TEST_it7_{stamp}@example.com"
    resp = session.post(f"{API}/auth/register", json={
        "email": email, "password": PASSWORD, "username": f"TESTit7{stamp[-8:]}"
    })
    assert resp.status_code == 200, f"register failed {resp.status_code} {resp.text[:300]}"
    data = resp.json()
    assert "access_token" in data and "user" in data
    return data


@pytest.fixture(scope="module")
def user_a(session):
    return _register(session, "a")


@pytest.fixture(scope="module")
def user_b(session):
    return _register(session, "b")


def auth(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- billing/tiers ----------
class TestTiers:
    def test_tiers_public(self, session):
        r = session.get(f"{API}/billing/tiers")
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert isinstance(data.get("publishable_key"), str) and data["publishable_key"] != ""
        assert data["publishable_key"].startswith("pk_")
        ids = [t["id"] for t in data["tiers"]]
        assert ids == ["free", "pulse", "ignite"]
        prices = {t["id"]: t["price"] for t in data["tiers"]}
        assert prices == {"free": 0, "pulse": 14.99, "ignite": 39.99}
        limits = {t["id"]: t["community_limit"] for t in data["tiers"]}
        assert limits == {"free": 50, "pulse": 150, "ignite": 300}
        for t in data["tiers"]:
            assert len(t["features"]) >= 3


# ---------- register/me tier fields ----------
class TestTierFields:
    def test_register_returns_tier(self, user_a):
        u = user_a["user"]
        assert u["tier"] == "free"
        assert u["tier_name"] == "VEXOR Free"
        assert u["community_limit"] == 50
        assert u["bio"] == ""
        assert u["activity"] == ""
        assert u["subscription_status"] == "none"

    def test_auth_me_returns_tier(self, session, user_a):
        r = session.get(f"{API}/auth/me", headers=auth(user_a["access_token"]))
        assert r.status_code == 200, r.text[:300]
        u = r.json()
        assert u["tier"] == "free"
        assert u["tier_name"] == "VEXOR Free"
        assert u["community_limit"] == 50
        assert "bio" in u and "activity" in u
        assert "_id" not in u

    def test_billing_me(self, session, user_a):
        r = session.get(f"{API}/billing/me", headers=auth(user_a["access_token"]))
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["tier"] == "free"
        assert d["subscription_status"] == "none"

    def test_billing_me_requires_auth(self, session):
        r = session.get(f"{API}/billing/me")
        assert r.status_code == 401


# ---------- users/me PATCH ----------
class TestProfilePatch:
    def test_patch_profile_and_persist(self, session, user_a):
        token = user_a["access_token"]
        payload = {
            "bio": "TEST_bio linha",
            "activity": "Jogando VEXOR",
            "avatar_url": "https://example.com/a.png",
            "banner_url": "https://example.com/b.png",
        }
        r = session.patch(f"{API}/users/me", json=payload, headers=auth(token))
        assert r.status_code == 200, r.text[:300]
        u = r.json()
        for k, v in payload.items():
            assert u[k] == v
        # GET verify persistence
        g = session.get(f"{API}/auth/me", headers=auth(token))
        assert g.status_code == 200
        gu = g.json()
        for k, v in payload.items():
            assert gu[k] == v

    def test_patch_username_conflict(self, session, user_a, user_b):
        taken = user_b["user"]["username"]
        r = session.patch(f"{API}/users/me", json={"username": taken}, headers=auth(user_a["access_token"]))
        assert r.status_code == 409, f"expected 409 got {r.status_code} {r.text[:200]}"

    def test_patch_validation(self, session, user_a):
        r = session.patch(f"{API}/users/me", json={"bio": "x" * 400}, headers=auth(user_a["access_token"]))
        assert r.status_code == 422

    def test_patch_requires_auth(self, session):
        r = session.patch(f"{API}/users/me", json={"bio": "nope"})
        assert r.status_code == 401


# ---------- checkout ----------
class TestCheckout:
    def test_checkout_pulse(self, session, user_a):
        r = session.post(f"{API}/billing/checkout", json={
            "lookup_key": "vexor_pulse_monthly", "origin_url": BASE_URL
        }, headers=auth(user_a["access_token"]))
        assert r.status_code == 200, f"{r.status_code} {r.text[:400]}"
        d = r.json()
        assert d["checkout_url"].startswith("https://checkout.stripe.com/")
        assert d["session_id"].startswith("cs_")
        # status endpoint should find the transaction
        s = session.get(f"{API}/billing/status/{d['session_id']}", headers=auth(user_a["access_token"]))
        assert s.status_code == 200, s.text[:300]
        sd = s.json()
        assert sd["session_id"] == d["session_id"]
        assert sd["payment_status"] in ("pending", "unpaid", "no_payment_required", "paid")
        assert sd["tier"] == "pulse"

    def test_checkout_ignite(self, session, user_b):
        r = session.post(f"{API}/billing/checkout", json={
            "lookup_key": "vexor_ignite_monthly", "origin_url": BASE_URL
        }, headers=auth(user_b["access_token"]))
        assert r.status_code == 200, f"{r.status_code} {r.text[:400]}"
        assert r.json()["checkout_url"].startswith("https://checkout.stripe.com/")

    def test_checkout_invalid_lookup_key(self, session, user_a):
        r = session.post(f"{API}/billing/checkout", json={
            "lookup_key": "bogus_key", "origin_url": BASE_URL
        }, headers=auth(user_a["access_token"]))
        assert r.status_code == 400, f"expected 400 got {r.status_code} {r.text[:200]}"

    def test_checkout_requires_auth(self, session):
        r = session.post(f"{API}/billing/checkout", json={
            "lookup_key": "vexor_pulse_monthly", "origin_url": BASE_URL})
        assert r.status_code == 401

    def test_status_unknown_session(self, session, user_a):
        r = session.get(f"{API}/billing/status/cs_test_doesnotexist123", headers=auth(user_a["access_token"]))
        assert r.status_code == 404

    def test_portal_without_subscription(self, session):
        fresh = _register(session, "p")
        r = session.post(f"{API}/billing/portal", headers=auth(fresh["access_token"]))
        # no stripe_customer_id yet -> 400
        assert r.status_code == 400, f"expected 400 got {r.status_code} {r.text[:200]}"


# ---------- webhook ----------
class TestWebhook:
    def test_webhook_bad_signature(self, session):
        r = requests.post(f"{API}/stripe/webhook",
                          data='{"id":"evt_1","type":"checkout.session.completed","data":{"object":{"id":"cs_x"}}}',
                          headers={"Content-Type": "application/json", "stripe-signature": "t=1,v1=deadbeef"})
        assert r.status_code == 400, f"expected 400 got {r.status_code} {r.text[:300]}"

    def test_webhook_no_signature(self, session):
        r = requests.post(f"{API}/stripe/webhook",
                          data='{"id":"evt_1","type":"ping","data":{"object":{}}}',
                          headers={"Content-Type": "application/json"})
        assert r.status_code == 400, f"expected 400 got {r.status_code} {r.text[:300]}"


# ---------- community regression + tier limit ----------
class TestCommunityRegression:
    def test_create_and_list_community(self, session, user_a):
        token = user_a["access_token"]
        r = session.post(f"{API}/communities", json={"name": "TEST_it7 Guild", "description": "regressao"},
                         headers=auth(token))
        assert r.status_code == 200, r.text[:300]
        c = r.json()
        assert c["name"] == "TEST_it7 Guild"
        assert "_id" not in c
        lst = session.get(f"{API}/communities", headers=auth(token))
        assert lst.status_code == 200
        assert any(item["id"] == c["id"] for item in lst.json())
        # channels of default community
        ch = session.post(f"{API}/communities/{c['id']}/channels", json={"name": "TEST_canal", "kind": "text"},
                          headers=auth(token))
        assert ch.status_code == 200, ch.text[:300]
        chl = session.get(f"{API}/communities/{c['id']}/channels", headers=auth(token))
        assert chl.status_code == 200
        assert any(x["name"] == "TEST_canal" for x in chl.json())

    def test_login_and_refresh_regression(self, session, user_a):
        email = user_a["user"]["email"]
        lr = session.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
        assert lr.status_code == 200, lr.text[:300]
        assert lr.json()["user"]["tier"] == "free"
        rr = session.post(f"{API}/auth/refresh", json={"refresh_token": lr.json()["refresh_token"]})
        assert rr.status_code == 200, rr.text[:300]
        assert "access_token" in rr.json()

    def test_friends_and_dm_regression(self, session, user_a, user_b):
        ta, tb = user_a["access_token"], user_b["access_token"]
        ida, idb = user_a["user"]["id"], user_b["user"]["id"]
        r = session.post(f"{API}/friends/{idb}", headers=auth(ta))
        assert r.status_code in (200, 409), r.text[:200]
        dm = session.post(f"{API}/dm/{idb}", json={"text": "TEST_ola"}, headers=auth(ta))
        assert dm.status_code == 200, dm.text[:300]
        thread = session.get(f"{API}/dm/{ida}", headers=auth(tb))
        assert thread.status_code == 200
        assert any(m["text"] == "TEST_ola" for m in thread.json())
