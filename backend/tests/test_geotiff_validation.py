"""
Automated unit tests for GeoTIFF validation, CRS extraction, and spatial compatibility.
"""

import os
import pytest
import numpy as np
import rasterio
from rasterio.transform import from_origin
from app.geo.raster_validator import RasterValidator, GeoBounds


@pytest.fixture
def synthetic_geotiff_pair(tmp_path):
    """Creates a pair of valid co-registered synthetic GeoTIFFs (EPSG:32643)."""
    t1_path = os.path.join(tmp_path, "t1.tif")
    t2_path = os.path.join(tmp_path, "t2.tif")

    transform = from_origin(700000.0, 3100000.0, 10.0, 10.0)
    crs = "EPSG:32643"
    meta = {
        "driver": "GTiff",
        "height": 100,
        "width": 100,
        "count": 3,
        "dtype": "uint8",
        "crs": crs,
        "transform": transform,
    }

    data1 = np.ones((3, 100, 100), dtype=np.uint8) * 50
    data2 = np.ones((3, 100, 100), dtype=np.uint8) * 80

    with rasterio.open(t1_path, "w", **meta) as dst:
        dst.write(data1)
    with rasterio.open(t2_path, "w", **meta) as dst:
        dst.write(data2)

    return str(t1_path), str(t2_path)


@pytest.fixture
def non_overlapping_geotiff_pair(tmp_path):
    """Creates two GeoTIFFs with non-overlapping bounding boxes."""
    t1_path = os.path.join(tmp_path, "t1_west.tif")
    t2_path = os.path.join(tmp_path, "t2_east.tif")

    transform1 = from_origin(700000.0, 3100000.0, 10.0, 10.0)
    transform2 = from_origin(800000.0, 3100000.0, 10.0, 10.0)  # 100km east
    crs = "EPSG:32643"

    meta1 = {"driver": "GTiff", "height": 100, "width": 100, "count": 1, "dtype": "uint8", "crs": crs, "transform": transform1}
    meta2 = {"driver": "GTiff", "height": 100, "width": 100, "count": 1, "dtype": "uint8", "crs": crs, "transform": transform2}

    with rasterio.open(t1_path, "w", **meta1) as dst:
        dst.write(np.zeros((1, 100, 100), dtype=np.uint8))
    with rasterio.open(t2_path, "w", **meta2) as dst:
        dst.write(np.zeros((1, 100, 100), dtype=np.uint8))

    return str(t1_path), str(t2_path)


def test_inspect_valid_geotiff(synthetic_geotiff_pair):
    t1_path, _ = synthetic_geotiff_pair
    meta = RasterValidator.inspect_raster(t1_path)

    assert meta.is_georeferenced is True
    assert meta.crs_epsg == "EPSG:32643"
    assert meta.width == 100
    assert meta.height == 100
    assert meta.count == 3
    assert meta.bounds_wgs84 is not None
    assert meta.bounds_wgs84.min_lon < meta.bounds_wgs84.max_lon
    assert meta.bounds_wgs84.min_lat < meta.bounds_wgs84.max_lat


def test_validate_aligned_pair(synthetic_geotiff_pair):
    t1_path, t2_path = synthetic_geotiff_pair
    result = RasterValidator.validate_pair(t1_path, t2_path)

    assert result.valid is True
    assert result.georeferenced is True
    assert result.aligned is True
    assert result.source_crs == "EPSG:32643"
    assert len(result.errors) == 0


def test_reject_non_overlapping_pair(non_overlapping_geotiff_pair):
    t1_path, t2_path = non_overlapping_geotiff_pair
    result = RasterValidator.validate_pair(t1_path, t2_path)

    assert result.valid is False
    assert any("do not overlap" in err.lower() for err in result.errors)
