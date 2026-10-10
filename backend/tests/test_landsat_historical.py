"""
Unit and Integration tests for Historical Landsat (2000–2026) Collection 2 L2 Acquisition and Multi-Index Change Detection.
"""

import pytest
import numpy as np
from fastapi.testclient import TestClient
from app.main import app
from app.services.landsat_historical_service import LandsatHistoricalService
from app.detection.spectral_indices import (
    compute_spectral_index,
    SpectralIndexChangeDetector,
)
from app.detection.registry import registry

client = TestClient(app)


def test_spectral_index_calculation():
    """Verify normalized difference index calculation and bounding."""
    nir = np.array([[4000, 3000], [1500, 2000]], dtype=np.float32)
    red = np.array([[1000, 1000], [1500, 3000]], dtype=np.float32)

    ndvi = compute_spectral_index(nir, red)
    assert ndvi.shape == (2, 2)
    assert ndvi[0, 0] == pytest.approx((4000 - 1000) / (4000 + 1000), abs=1e-3)
    assert ndvi[1, 0] == pytest.approx(0.0, abs=1e-3)
    assert np.all(ndvi >= -1.0) and np.all(ndvi <= 1.0)


def test_landsat_surface_reflectance_scaling():
    """Verify USGS Collection 2 Level-2 Surface Reflectance scaling: DN * 0.0000275 - 0.2."""
    raw_dn = np.array([7273, 21818, 43636], dtype=np.uint16)
    refl = LandsatHistoricalService.scale_landsat_c2_surface_reflectance(raw_dn)
    assert refl[0] == pytest.approx(0.0, abs=0.01)  # 7273 * 0.0000275 - 0.2 approx 0.0
    assert refl[1] == pytest.approx(0.40, abs=0.01) # 21818 * 0.0000275 - 0.2 approx 0.40
    assert refl[2] == pytest.approx(1.0, abs=0.01)  # 43636 * 0.0000275 - 0.2 approx 1.0


def test_landsat_qa_pixel_bitmask():
    """Verify QA_PIXEL bitmask parsing."""
    # 0 = clear, 1 = fill, 8 = cloud (bit 3), 16 = shadow (bit 4)
    qa = np.array([[0, 1], [8, 16]], dtype=np.uint16)
    valid_mask = LandsatHistoricalService.parse_landsat_qa_pixel(qa)
    assert valid_mask[0, 0] is True or valid_mask[0, 0] == True
    assert valid_mask[0, 1] is False or valid_mask[0, 1] == False
    assert valid_mask[1, 0] is False or valid_mask[1, 0] == False
    assert valid_mask[1, 1] is False or valid_mask[1, 1] == False


def test_historical_timeline_endpoint():
    """Test /api/imagery/historical/timeline endpoint for Pune and Agra."""
    res_pune = client.get("/api/imagery/historical/timeline?city_id=pune")
    assert res_pune.status_code == 200
    data_pune = res_pune.json()
    assert data_pune["city_id"] == "pune"
    assert len(data_pune["timeline"]) == 7
    years = [item["year"] for item in data_pune["timeline"]]
    assert 2000 in years
    assert 2026 in years

    res_agra = client.get("/api/imagery/historical/timeline?city_id=agra")
    assert res_agra.status_code == 200
    data_agra = res_agra.json()
    assert data_agra["city_id"] == "agra"


def test_historical_search_endpoint():
    """Test /api/imagery/historical/search endpoint for 2000 vs 2026."""
    payload = {
        "city_id": "pune",
        "year_before": 2000,
        "year_after": 2026,
        "bbox": [73.72, 18.44, 73.96, 18.62],
        "max_cloud_cover": 20.0,
    }
    res = client.post("/api/imagery/historical/search", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["year_before"] == 2000
    assert data["year_after"] == 2026
    assert "before_scene" in data
    assert "after_scene" in data
    assert data["before_scene"]["platform"] == "Landsat-5 TM"
    assert "Landsat-9" in data["after_scene"]["platform"] or "Landsat-8" in data["after_scene"]["platform"]


def test_acquire_and_historical_urban_encroachment_job():
    """Test end-to-end historical acquisition and Multi-Index change detection."""
    # 1. Acquire Historical Pair
    acq_payload = {
        "city_id": "pune",
        "year_before": 2000,
        "year_after": 2026,
        "bbox": [73.72, 18.44, 73.96, 18.62],
        "location_name": "Pune Tech Corridor Historical",
    }
    acq_res = client.post("/api/imagery/historical/acquire", json=acq_payload)
    assert acq_res.status_code == 200
    acq_data = acq_res.json()
    assert acq_data["success"] is True
    b_id = acq_data["before_image_id"]
    a_id = acq_data["after_image_id"]
    assert acq_data["spatial_resolution"] == "30.0m GSD (Landsat Collection 2 Level-2)"

    # 2. Run Multi-Index Urban Encroachment Change Detection
    job_payload = {
        "before_image_id": b_id,
        "after_image_id": a_id,
        "method": "urban_encroachment",
        "threshold": 0.30,
        "kernel_size": 3,
        "min_component_size": 10,
    }
    job_res = client.post("/api/jobs", json=job_payload)
    assert job_res.status_code == 200
    job_data = job_res.json()
    assert job_data["status"] == "completed"
    assert job_data["method"] == "urban_encroachment"
    job_id = job_data["job_id"]

    # 3. Retrieve GeoJSON Results
    results_res = client.get(f"/api/jobs/{job_id}/results")
    assert results_res.status_code == 200
    results_data = results_res.json()
    assert results_data["is_georeferenced"] is True
    assert "geojson" in results_data
    features = results_data["geojson"]["features"]
    assert len(features) > 0
    assert results_data["summary"]["total_regions"] > 0
    assert results_data["summary"]["total_area_ha"] > 0
