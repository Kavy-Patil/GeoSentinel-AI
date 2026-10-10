"""
Test source manifest and reference land-cover baseline endpoints.
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_dataset_source_manifest():
    """Verify that /api/datasets/manifest returns all 6 integrated satellite sources and evidence layers."""
    res = client.get("/api/datasets/manifest")
    assert res.status_code == 200
    data = res.json()
    assert "total_sources" in data
    assert data["total_sources"] >= 6
    assert "sources" in data
    assert "attribution_statement" in data

    source_ids = [s["id"] for s in data["sources"]]
    assert "landsat-c2-l2" in source_ids
    assert "sentinel-2-l2a" in source_ids
    assert "ghsl-built-s" in source_ids
    assert "esa-worldcover" in source_ids
    assert "dynamic-world" in source_ids
    assert "iccd-benchmark" in source_ids

    # Validate Landsat C2 L2 metadata
    landsat = next(s for s in data["sources"] if s["id"] == "landsat-c2-l2")
    assert landsat["native_gsd_m"] == 30.0
    assert "Surface Reflectance" in landsat["radiometric_calibration"]
    assert "QA_PIXEL" in landsat["quality_mask"]


def test_city_reference_profile_pune():
    """Verify GHSL built-up trajectory and ESA WorldCover baseline for Pune."""
    res = client.get("/api/datasets/reference/pune")
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Pune"
    assert "ghsl_builtup_trajectory" in data
    assert len(data["ghsl_builtup_trajectory"]) >= 6
    assert "dominant_landcover_baseline" in data
    assert data["dominant_landcover_baseline"]["built_up"] > 0
    assert "growth_corridors" in data


def test_city_reference_profile_all_iccd_cities():
    """Verify reference profiles exist for all 5 ICCD cities: Pune, Agra, Kannur, Kargil, Ambala."""
    for cid in ["pune", "agra", "kannur", "kargil", "ambala"]:
        res = client.get(f"/api/datasets/reference/{cid}")
        assert res.status_code == 200, f"Failed for city {cid}"
        data = res.json()
        assert data["city_id"] == cid
