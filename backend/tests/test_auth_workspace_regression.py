"""Regression coverage for real auth, sessions, persistence, and authorization."""
import os
import uuid

import requests


BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")


def test_auth_session_and_workspace_persistence():
    suffix = uuid.uuid4().hex[:10]
    email = f"TEST_{suffix}@example.com"
    password = "TestPass123!"
    s = requests.Session()
    register = s.post(f"{BASE_URL}/api/auth/register", json={"email": email, "password": password, "username": f"test_{suffix}"}, timeout=20)
    assert register.status_code == 200, register.text
    tokens = register.json()
    assert isinstance(tokens["access_token"], str) and isinstance(tokens["refresh_token"], str)
    s.headers["Authorization"] = f"Bearer {tokens['access_token']}"

    me = s.get(f"{BASE_URL}/api/auth/me", timeout=20)
    assert me.status_code == 200 and me.json()["email"] == email.lower()
    communities = s.get(f"{BASE_URL}/api/communities", timeout=20)
    assert communities.status_code == 200 and len(communities.json()) == 1
    community_id = communities.json()[0]["id"]

    created = s.post(f"{BASE_URL}/api/communities", json={"name": f"TEST Community {suffix}", "description": "persist"}, timeout=20)
    assert created.status_code == 200 and created.json()["name"].startswith("TEST Community")
    new_community = created.json()["id"]
    channel = s.post(f"{BASE_URL}/api/communities/{new_community}/channels", json={"name": "testing", "kind": "text"}, timeout=20)
    assert channel.status_code == 200 and channel.json()["name"] == "testing"
    channel_id = channel.json()["id"]
    listed = s.get(f"{BASE_URL}/api/communities/{new_community}/channels", timeout=20)
    assert listed.status_code == 200 and any(item["id"] == channel_id for item in listed.json())
    messages = s.get(f"{BASE_URL}/api/channels/{channel_id}/messages", timeout=20)
    assert messages.status_code == 200 and isinstance(messages.json(), list)

    invite = s.post(f"{BASE_URL}/api/communities/{new_community}/invites", json={}, timeout=20)
    assert invite.status_code == 200 and isinstance(invite.json()["id"], str), invite.text
    report = s.post(f"{BASE_URL}/api/communities/{new_community}/reports", json={"target_user_id": "unknown", "reason": "TEST reason"}, timeout=20)
    assert report.status_code == 200 and report.json()["status"] == "open", report.text
    audit = s.get(f"{BASE_URL}/api/communities/{new_community}/audit-log", timeout=20)
    assert audit.status_code == 200 and any(item["action"] == "community.created" for item in audit.json())

    refreshed = s.post(f"{BASE_URL}/api/auth/refresh", json={"refresh_token": tokens["refresh_token"]}, timeout=20)
    assert refreshed.status_code == 200 and refreshed.json()["access_token"]
    logout = s.post(f"{BASE_URL}/api/auth/logout", json={"refresh_token": refreshed.json()["refresh_token"]}, timeout=20)
    assert logout.status_code == 200 and logout.json()["ok"] is True
    after_logout = s.post(f"{BASE_URL}/api/auth/refresh", json={"refresh_token": refreshed.json()["refresh_token"]}, timeout=20)
    assert after_logout.status_code == 401, after_logout.text


def test_recovery_demo_code_is_usable_or_has_verification_endpoint():
    email = f"TEST_recovery_{uuid.uuid4().hex[:10]}@example.com"
    old_password = "OldPass123!"
    new_password = "NewPass123!"
    register = requests.post(f"{BASE_URL}/api/auth/register", json={"email": email, "password": old_password}, timeout=20)
    assert register.status_code == 200, register.text
    response = requests.post(f"{BASE_URL}/api/auth/recovery/request", json={"email": email}, timeout=20)
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body.get("demo_code"), str) and len(body["demo_code"]) == 6
    verify = requests.post(f"{BASE_URL}/api/auth/recovery/verify", json={"email": email, "code": body["demo_code"], "new_password": new_password}, timeout=20)
    assert verify.status_code == 200 and verify.json()["ok"] is True, verify.text
    old_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": old_password}, timeout=20)
    assert old_login.status_code == 401, old_login.text
    new_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": new_password}, timeout=20)
    assert new_login.status_code == 200 and new_login.json()["access_token"], new_login.text