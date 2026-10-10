"""
Integration tests for Stage 3 Change Detection API endpoints.
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_methods_endpoint():
    response = client.get("/api/methods")
    assert response.status_code == 200
    data = response.json()
    assert "methods" in data
    assert any(m["id"] == "classical" for m in data["methods"])


def test_create_and_execute_job_on_levir_sample():
    # 1. Stage LEVIR-CD sample
    stage_res = client.get("/api/datasets/levir_cd/samples/train_0001")
    assert stage_res.status_code == 200
    b_id = stage_res.json()["before_image_id"]
    a_id = stage_res.json()["after_image_id"]

    # 2. Dispatch change detection job
    job_payload = {
        "before_image_id": b_id,
        "after_image_id": a_id,
        "method": "classical",
        "threshold": 0.35,
        "kernel_size": 3,
        "min_component_size": 20,
        "dataset_id": "levir_cd",
        "sample_id": "train_0001",
    }
    create_res = client.post("/api/jobs", json=job_payload)
    assert create_res.status_code == 200
    job_data = create_res.json()

    assert job_data["job_id"].startswith("job_")
    assert job_data["status"] == "completed"
    assert job_data["method"] == "classical"
    assert job_data["processing_time_ms"] > 0.0
    assert "filtered_mask_url" in job_data["outputs"]

    # Check evaluation metrics
    if job_data.get("evaluation"):
        assert "iou" in job_data["evaluation"]
        assert "precision" in job_data["evaluation"]
        assert "recall" in job_data["evaluation"]

    # 3. Retrieve generated artifacts
    job_id = job_data["job_id"]
    mask_res = client.get(f"/api/jobs/{job_id}/images/filtered_mask")
    assert mask_res.status_code == 200
    assert mask_res.headers["content-type"] == "image/png"

    overlay_res = client.get(f"/api/jobs/{job_id}/images/change_overlay")
    assert overlay_res.status_code == 200
    assert overlay_res.headers["content-type"] == "image/png"

    # 4. Get full results
    results_res = client.get(f"/api/jobs/{job_id}/results")
    assert results_res.status_code == 200
    assert results_res.json()["status"] == "completed"
