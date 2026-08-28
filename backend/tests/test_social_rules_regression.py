"""Regression coverage for friends, DMs, invites, and mandatory community rules."""
import os
import uuid

import requests
from dotenv import dotenv_values


_env = dotenv_values("/app/frontend/.env")
_base = os.environ.get("REACT_APP_BACKEND_URL") or _env.get("REACT_APP_BACKEND_URL")
if not _base:
    raise RuntimeError("REACT_APP_BACKEND_URL missing from env and /app/frontend/.env")
BASE_URL = _base.rstrip("/")


def register(suffix: str):
    response = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={"email": f"TEST_{suffix}@example.com", "password": "TestPass123!", "username": f"test_{suffix}"},
        timeout=20,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {body['access_token']}"
    return session, body


def test_friends_dm_invite_and_rules_enforcement_persist():
    suffix = uuid.uuid4().hex[:10]
    owner, owner_body = register(f"owner_{suffix}")
    guest, guest_body = register(f"guest_{suffix}")

    search = owner.get(f"{BASE_URL}/api/users/search", params={"q": f"test_guest_{suffix}"}, timeout=20)
    assert search.status_code == 200 and search.json()[0]["id"] == guest_body["user"]["id"]
    target_id = guest_body["user"]["id"]

    request = owner.post(f"{BASE_URL}/api/friends/{target_id}", timeout=20)
    assert request.status_code == 200 and request.json()["status"] == "pending"
    dm = owner.post(f"{BASE_URL}/api/dm/{target_id}", json={"text": "TEST persistent DM"}, timeout=20)
    assert dm.status_code == 200 and dm.json()["text"] == "TEST persistent DM"
    history = guest.get(f"{BASE_URL}/api/dm/{owner_body['user']['id']}", timeout=20)
    assert history.status_code == 200 and any(item["text"] == "TEST persistent DM" for item in history.json())

    community = owner.post(f"{BASE_URL}/api/communities", json={"name": f"TEST Rules {suffix}"}, timeout=20).json()
    community_id = community["id"]
    invite = owner.post(f"{BASE_URL}/api/communities/{community_id}/invites", json={}, timeout=20)
    assert invite.status_code == 200
    accepted = guest.post(f"{BASE_URL}/api/invites/{invite.json()['id']}/accept", timeout=20)
    assert accepted.status_code == 200 and accepted.json()["community_id"] == community_id

    rules = owner.put(f"{BASE_URL}/api/communities/{community_id}/rules", json={"rules": ["Be respectful"]}, timeout=20)
    assert rules.status_code == 200 and rules.json()["rules"] == ["Be respectful"]
    blocked = owner.get(f"{BASE_URL}/api/communities/{community_id}/channels", timeout=20)
    assert blocked.status_code == 403
    accepted_rules = owner.post(f"{BASE_URL}/api/communities/{community_id}/rules/accept", timeout=20)
    assert accepted_rules.status_code == 200 and accepted_rules.json()["accepted"] is True
    channels = owner.get(f"{BASE_URL}/api/communities/{community_id}/channels", timeout=20)
    assert channels.status_code == 200 and isinstance(channels.json(), list)
