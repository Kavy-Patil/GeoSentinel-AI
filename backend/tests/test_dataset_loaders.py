"""
Tests for LEVIR-CD, OSCD dataset loaders, manifest registry, and API endpoints.
"""

import os
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_list_datasets_endpoint():
    response = client.get("/api/datasets")
    assert response.status_code == 200
    data = response.json()
    assert "datasets" in data
    assert len(data["datasets"]) >= 4
    dataset_ids = [d["id"] for d in data["datasets"]]
    assert "spacenet7" in dataset_ids
    assert "levir_cd" in dataset_ids
    assert "oscd" in dataset_ids
    assert "custom_geotiff" in dataset_ids


def test_load_spacenet7_sample():
    response = client.get("/api/datasets/spacenet7/samples/sn7_urban_expansion_aoi01")
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["georeferenced"] is True
    assert data["source_crs"] == "EPSG:32632"
    assert data["before_image_id"] is not None
    assert data["after_image_id"] is not None
    assert data["overlap_bounds_wgs84"] is not None


def test_list_levir_samples():
    response = client.get("/api/datasets/levir_cd/samples")
    assert response.status_code == 200
    data = response.json()
    assert data["dataset_id"] == "levir_cd"
    assert len(data["samples"]) >= 1


def test_load_levir_sample():
    response = client.get("/api/datasets/levir_cd/samples/train_0001")
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["georeferenced"] is False
    assert data["before_image_id"] is not None
    assert data["after_image_id"] is not None


def test_load_oscd_sample():
    for sample_id, expected_crs in [("beirut", "EPSG:32636"), ("valencia", "EPSG:32630"), ("las_vegas", "EPSG:32611")]:
        response = client.get(f"/api/datasets/oscd/samples/{sample_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["georeferenced"] is True
        assert data["source_crs"] == expected_crs
        assert data["overlap_bounds_wgs84"] is not None
        bounds = data["overlap_bounds_wgs84"]
        assert bounds["min_lon"] < bounds["max_lon"]
        assert bounds["min_lat"] < bounds["max_lat"]


def test_load_custom_geotiff_sample():
    response = client.get("/api/datasets/custom_geotiff/samples/delhi_sector49")
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["georeferenced"] is True
    assert data["source_crs"] == "EPSG:32643"
    assert data["width"] == 512
    assert data["height"] == 512


def test_upload_custom_geotiff_pair():
    # Test uploading two valid GeoTIFFs
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    before_path = os.path.join(base_dir, "data", "oscd", "beirut", "before.tif")
    after_path = os.path.join(base_dir, "data", "oscd", "beirut", "after.tif")
    
    with open(before_path, "rb") as f_before, open(after_path, "rb") as f_after:
        files = {
            "before_image": ("beirut_t1.tif", f_before, "image/tiff"),
            "after_image": ("beirut_t2.tif", f_after, "image/tiff"),
        }
        response = client.post("/api/imagery/validate", files=files)
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["georeferenced"] is True
        assert data["source_crs"] == "EPSG:32636"
        assert data["before_image_id"] is not None
        assert data["after_image_id"] is not None


def test_imagery_preview_and_metadata():
    # Load sample first to get image ID
    res = client.get("/api/datasets/levir_cd/samples/train_0001")
    img_id = res.json()["before_image_id"]

    # Test metadata
    meta_res = client.get(f"/api/imagery/{img_id}/metadata")
    assert meta_res.status_code == 200
    meta_data = meta_res.json()
    assert meta_data["width"] == 512
    assert meta_data["height"] == 512

    # Test preview
    preview_res = client.get(f"/api/imagery/{img_id}/preview")
    assert preview_res.status_code == 200
    assert preview_res.headers["content-type"] == "image/png"
