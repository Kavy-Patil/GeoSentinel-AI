"""
Tests for GeoSentinel AI Stage 3 Backend Health.
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check_stage3():
    """Verify that GET /api/health responds with 200 OK and Stage 3 payload."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["project"] == "GeoSentinel AI"
    assert data["stage"] == 3
    assert "available_methods" in data
    assert "classical" in data["available_methods"]
    assert "available_datasets" in data
    assert "levir_cd" in data["available_datasets"]
