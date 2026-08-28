"""Iteration 9 — Emergent-managed Google Auth endpoint (POST /api/auth/google/session)."""
import os
import uuid

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL is missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestGoogleSessionEndpoint:
    def test_invalid_session_id_returns_401(self, client):
        r = client.post(f"{API}/auth/google/session", json={"session_id": "xyzinvalid"}, timeout=30)
        assert r.status_code == 401, f"expected 401, got {r.status_code}: {r.text[:300]}"
        body = r.json()
        assert "detail" in body
        assert isinstance(body["detail"], str) and len(body["detail"]) > 0

    def test_random_uuid_session_id_returns_401(self, client):
        r = client.post(f"{API}/auth/google/session", json={"session_id": str(uuid.uuid4())}, timeout=30)
        assert r.status_code == 401, f"expected 401, got {r.status_code}: {r.text[:300]}"

    def test_missing_body_returns_422(self, client):
        r = client.post(f"{API}/auth/google/session", data="", timeout=30)
        assert r.status_code == 422, f"expected 422, got {r.status_code}: {r.text[:300]}"

    def test_wrong_field_returns_422(self, client):
        r = client.post(f"{API}/auth/google/session", json={"sessionId": "abc"}, timeout=30)
        assert r.status_code == 422, f"expected 422, got {r.status_code}: {r.text[:300]}"

    def test_empty_session_id_does_not_500(self, client):
        r = client.post(f"{API}/auth/google/session", json={"session_id": ""}, timeout=30)
        assert r.status_code in (400, 401, 422), f"unexpected {r.status_code}: {r.text[:300]}"

    def test_huge_session_id_does_not_500(self, client):
        r = client.post(f"{API}/auth/google/session", json={"session_id": "a" * 4000}, timeout=30)
        assert r.status_code in (400, 401, 422, 431), f"unexpected {r.status_code}: {r.text[:300]}"

    def test_invalid_session_sets_no_cookie(self, client):
        r = requests.post(f"{API}/auth/google/session", json={"session_id": "invalidsession123"}, timeout=30)
        assert r.status_code == 401
        assert "session_token" not in r.cookies


class TestGoogleFlowDoesNotBreakPasswordAuth:
    def test_register_login_me_still_work(self, client):
        email = f"TEST_it9_{uuid.uuid4().hex[:8]}@example.com"
        password = "VexorTest123!"
        reg = client.post(f"{API}/auth/register", json={
            "email": email, "password": password, "username": f"it9{uuid.uuid4().hex[:6]}"
        }, timeout=30)
        assert reg.status_code == 200, reg.text[:300]
        data = reg.json()
        assert "access_token" in data and "refresh_token" in data
        assert data["user"]["email"] == email.lower()
        assert data["user"]["tier"] == "free"

        me = client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {data['access_token']}"}, timeout=30)
        assert me.status_code == 200
        assert me.json()["email"] == email.lower()
        assert "password_hash" not in me.json()
        assert "_id" not in me.json()

        logout = client.post(f"{API}/auth/logout", json={"refresh_token": data["refresh_token"]}, timeout=30)
        assert logout.status_code == 200
        assert logout.json().get("ok") is True

    def test_me_with_only_session_cookie(self, client):
        """Docs (auth_testing.md) claim a cookie fallback on /auth/me. Verify actual behaviour."""
        r = requests.get(f"{API}/auth/me", cookies={"session_token": "test_session_bogus"}, timeout=30)
        assert r.status_code in (401, 403), f"unexpected {r.status_code}: {r.text[:200]}"


class TestMascotAsset:
    def test_mascot_png_served(self):
        r = requests.get(f"{BASE_URL}/mascot/vexor-mascot.png", timeout=30)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/")
        assert len(r.content) > 1000
