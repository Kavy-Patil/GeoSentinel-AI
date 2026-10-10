"""
Unit tests for raster reprojection, warping, nodata masking, and grid alignment.
"""

import os
import pytest
import numpy as np
import rasterio
from rasterio.transform import from_origin
from rasterio.warp import transform_bounds
from app.geo.alignment import RasterAlignmentService


@pytest.fixture
def misaligned_pair_different_crs(tmp_path):
    """Creates a pair with same geographic footprint but different CRS (EPSG:32643 vs EPSG:4326)."""
    t1_path = os.path.join(tmp_path, "t1_utm.tif")
    t2_path = os.path.join(tmp_path, "t2_wgs84.tif")

    # T1 in UTM zone 43N (Delhi region)
    transform1 = from_origin(700000.0, 3100000.0, 10.0, 10.0)
    meta1 = {
        "driver": "GTiff",
        "height": 100,
        "width": 100,
        "count": 1,
        "dtype": "uint8",
        "crs": "EPSG:32643",
        "transform": transform1,
    }
    with rasterio.open(t1_path, "w", **meta1) as dst:
        dst.write(np.ones((1, 100, 100), dtype=np.uint8) * 100)

    # Get exact WGS84 bounds of T1 to create overlapping T2
    b = transform_bounds("EPSG:32643", "EPSG:4326", 700000.0, 3099000.0, 701000.0, 3100000.0)
    # Origin at top-left (min_lon, max_lat)
    pixel_size = (b[2] - b[0]) / 100.0
    transform2 = from_origin(b[0], b[3], pixel_size, pixel_size)

    meta2 = {
        "driver": "GTiff",
        "height": 100,
        "width": 100,
        "count": 1,
        "dtype": "uint8",
        "crs": "EPSG:4326",
        "transform": transform2,
    }
    with rasterio.open(t2_path, "w", **meta2) as dst:
        dst.write(np.ones((1, 100, 100), dtype=np.uint8) * 150)

    return str(t1_path), str(t2_path)


def test_align_and_reproject_different_crs(misaligned_pair_different_crs):
    t1_path, t2_path = misaligned_pair_different_crs
    aligned_res = RasterAlignmentService.align_pair(t1_path, t2_path)

    assert aligned_res["aligned"] is True
    assert aligned_res["width"] == 100
    assert aligned_res["height"] == 100
    assert aligned_res["source_crs"] == "EPSG:32643"
    assert aligned_res["valid_mask"] is not None
    assert aligned_res["valid_mask"].shape == (100, 100)
    assert aligned_res["valid_pixel_pct"] > 50.0


def test_nodata_handling(tmp_path):
    t1_path = os.path.join(tmp_path, "nodata_t1.tif")
    t2_path = os.path.join(tmp_path, "nodata_t2.tif")

    transform = from_origin(700000.0, 3100000.0, 10.0, 10.0)
    meta = {
        "driver": "GTiff",
        "height": 50,
        "width": 50,
        "count": 1,
        "dtype": "uint8",
        "crs": "EPSG:32643",
        "transform": transform,
        "nodata": 0,
    }

    d1 = np.ones((1, 50, 50), dtype=np.uint8) * 10
    d1[0, :10, :] = 0  # top 10 rows nodata

    d2 = np.ones((1, 50, 50), dtype=np.uint8) * 20
    d2[0, :, :10] = 0  # left 10 cols nodata

    with rasterio.open(t1_path, "w", **meta) as dst:
        dst.write(d1)
    with rasterio.open(t2_path, "w", **meta) as dst:
        dst.write(d2)

    res = RasterAlignmentService.align_pair(str(t1_path), str(t2_path))
    mask = res["valid_mask"]

    # (0, 0) should be invalid
    assert mask[0, 0] == False
    # (25, 25) should be valid
    assert mask[25, 25] == True
    assert res["valid_pixel_pct"] < 100.0
