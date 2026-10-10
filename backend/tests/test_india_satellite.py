"""
Unit and Integration tests for India-Focused Satellite Acquisition and Vector Engine.
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_india_boundaries_endpoint():
    res_adm1 = client.get("/api/india/boundaries?level=adm1")
    assert res_adm1.status_code == 200
    data = res_adm1.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) > 0

    res_adm0 = client.get("/api/india/boundaries?level=adm0")
    assert res_adm0.status_code == 200


def test_india_places_endpoint():
    res = client.get("/api/india/places")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 5
    names = [p["name"] for p in data["places"]]
    assert "Agra" in names
    assert "Kannur" in names
    assert "Pune" in names
    assert "Kargil" in names
    assert "Ambala" in names
    # Verify research metadata fields
    pune_place = next(p for p in data["places"] if p["id"] == "pune")
    assert pune_place["total_pairs"] == 235
    assert pune_place["change_instances"] == 343
    assert pune_place["local_samples_available"] == 1



def test_stac_search_india_valid():
    payload = {
        "bbox": [73.70, 18.50, 73.85, 18.62],
        "date_range_start": "2024-01-01",
        "date_range_end": "2024-12-31",
        "max_cloud_cover": 20.0,
        "limit": 5,
    }
    res = client.post("/api/imagery/search", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["scenes"]) > 0


def test_stac_search_outside_india_rejected():
    payload = {
        "bbox": [-122.5, 37.7, -122.3, 37.8],  # San Francisco
        "max_cloud_cover": 20.0,
    }
    res = client.post("/api/imagery/search", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is False
    assert "outside India" in data["error"]


def test_acquire_and_detect_pune_satellite():
    # 1. Acquire
    acq_payload = {
        "before_scene_id": "S2A_MSIL2A_20240312",
        "after_scene_id": "S2A_MSIL2A_20241229",
        "bbox": [73.70, 18.50, 73.85, 18.62],
        "location_name": "Pune Hinjawadi Corridor",
    }
    acq_res = client.post("/api/imagery/acquire", json=acq_payload)
    assert acq_res.status_code == 200
    acq_data = acq_res.json()
    assert acq_data["success"] is True
    b_id = acq_data["before_image_id"]
    a_id = acq_data["after_image_id"]

    # 2. Run Change Detection
    job_payload = {
        "before_image_id": b_id,
        "after_image_id": a_id,
        "method": "classical",
        "threshold": 0.40,
        "kernel_size": 3,
        "min_component_size": 15,
    }
    job_res = client.post("/api/jobs", json=job_payload)
    assert job_res.status_code == 200
    job_data = job_res.json()
    job_id = job_data["job_id"]

    # 3. Retrieve Vector Results
    results_res = client.get(f"/api/jobs/{job_id}/results")
    assert results_res.status_code == 200
    results_data = results_res.json()
    assert results_data["is_georeferenced"] is True
    assert "geojson" in results_data
    assert "features" in results_data["geojson"]
    features = results_data["geojson"]["features"]
    assert len(features) > 0

    first_feat = features[0]
    assert "properties" in first_feat
    assert "area_m2" in first_feat["properties"]
    assert "severity" in first_feat["properties"]
    assert "centroid_lon" in first_feat["properties"]

    # 4. Test Human Verification PATCH
    region_id = first_feat["properties"]["region_id"]
    patch_res = client.patch(
        f"/api/jobs/{job_id}/regions/{region_id}",
        json={"review_status": "confirmed", "notes": "Verified urban expansion site"},
    )
    assert patch_res.status_code == 200
    patch_data = patch_res.json()
    assert patch_data["review_status"] == "confirmed"
    assert patch_data["summary"]["confirmed_count"] == 1

    # 5. Test GeoJSON Export
    export_res = client.get(f"/api/jobs/{job_id}/export")
    assert export_res.status_code == 200
    assert export_res.headers["content-type"] == "application/geo+json"
