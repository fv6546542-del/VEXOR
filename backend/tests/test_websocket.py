"""Regression checks for realtime room connection and message broadcast."""
import json
import os
import uuid

import pytest
import requests
from websockets.sync.client import connect
from websockets.exceptions import InvalidStatus


BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    pytest.skip("REACT_APP_BACKEND_URL is required", allow_module_level=True)
WS_BASE_URL = BASE_URL.rstrip("/").replace("https://", "wss://").replace("http://", "ws://")


def test_websocket_broadcasts_message_between_clients():
    room = f"TEST_{uuid.uuid4().hex}"
    base = BASE_URL.rstrip("/")
    username = f"test_ws_{uuid.uuid4().hex[:10]}"
    register = requests.post(f"{base}/api/auth/register", json={"email": f"TEST_ws_{uuid.uuid4().hex[:10]}@example.com", "password": "TestPass123!", "username": username}, timeout=20)
    assert register.status_code == 200, register.text
    token = register.json()["access_token"]
    url = f"{WS_BASE_URL}/api/ws/{room}?token={token}"
    with pytest.raises(InvalidStatus):
        with connect(f"{WS_BASE_URL}/api/ws/{room}", open_timeout=15):
            pass
    with connect(url, open_timeout=15) as first:
        first_presence = json.loads(first.recv(timeout=5))
        assert first_presence["type"] == "presence"
        with connect(url, open_timeout=15) as second:
            first.recv(timeout=5)
            second.recv(timeout=5)
            first.send(json.dumps({"type": "message", "text": "TEST_socket_message", "author": "QA"}))
            received = json.loads(second.recv(timeout=5))
            assert received["type"] == "message"
            assert received["text"] == "TEST_socket_message"
            assert received["author"] == username