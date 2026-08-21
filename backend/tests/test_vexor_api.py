"""Regression checks for VEXOR API health and status persistence."""
import os
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://vexor-dev.preview.emergentagent.com").rstrip("/")


def test_api_root_is_available():
    response = requests.get(f"{BASE_URL}/api/", timeout=10)
    assert response.status_code == 200
    assert response.json().get("message") == "Hello World"


def test_status_create_and_list():
    response = requests.post(f"{BASE_URL}/api/status", json={"client_name": "TEST_vexor"}, timeout=10)
    assert response.status_code == 200
    created = response.json()
    assert created["client_name"] == "TEST_vexor"
    assert isinstance(created["id"], str)

    listed = requests.get(f"{BASE_URL}/api/status", timeout=10)
    assert listed.status_code == 200
    assert any(item["id"] == created["id"] and item["client_name"] == "TEST_vexor" for item in listed.json())