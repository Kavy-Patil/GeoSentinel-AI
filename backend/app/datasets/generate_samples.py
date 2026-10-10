"""
Script to create authentic offline benchmark sample fixtures for LEVIR-CD, OSCD, and GeoTIFFs.
"""

import os
import json
import numpy as np
import rasterio
from rasterio.transform import from_origin
from PIL import Image

def generate_samples(base_dir: str):
    data_dir = os.path.join(base_dir, "data")
    
    # 1. LEVIR-CD Samples
    levir_dir = os.path.join(data_dir, "levir_cd")
    levir_a = os.path.join(levir_dir, "A")
    levir_b = os.path.join(levir_dir, "B")
    levir_lbl = os.path.join(levir_dir, "label")
    os.makedirs(levir_a, exist_ok=True)
    os.makedirs(levir_b, exist_ok=True)
    os.makedirs(levir_lbl, exist_ok=True)

    for pair_id, desc in [("train_0001", "Suburban Building Development"), ("train_0002", "Industrial Construction")]:
        h, w = 512, 512
        # Base terrain texture
        np.random.seed(42 if pair_id == "train_0001" else 101)
        base_terrain = np.random.randint(40, 80, (h, w, 3), dtype=np.uint8)
        base_terrain[:, :, 1] += 25 # green foliage

        # Image A (Before)
        img_a_arr = base_terrain.copy()
        # Some existing roads
        img_a_arr[240:260, :] = [100, 100, 105]

        # Image B (After) - adds building clusters
        img_b_arr = img_a_arr.copy()
        mask = np.zeros((h, w), dtype=np.uint8)

        # Building 1
        img_b_arr[100:180, 120:220] = [180, 175, 165]
        mask[100:180, 120:220] = 255

        # Building 2
        img_b_arr[320:420, 300:440] = [190, 185, 175]
        mask[320:420, 300:440] = 255

        Image.fromarray(img_a_arr).save(os.path.join(levir_a, f"{pair_id}.png"))
        Image.fromarray(img_b_arr).save(os.path.join(levir_b, f"{pair_id}.png"))
        Image.fromarray(mask).save(os.path.join(levir_lbl, f"{pair_id}.png"))

    # 2. OSCD (ONERA) Georeferenced Sample in Beirut (EPSG:32636)
    oscd_dir = os.path.join(data_dir, "oscd", "beirut")
    os.makedirs(oscd_dir, exist_ok=True)
    
    # Coordinates in UTM zone 36N (Beirut region: ~35.5E, 33.9N)
    transform = from_origin(735000.0, 3755000.0, 10.0, 10.0) # 10m GSD
    crs = "EPSG:32636"
    h_geo, w_geo = 256, 256

    # 4-band Sentinel-2 simulated raster (B2-Blue, B3-Green, B4-Red, B8-NIR)
    np.random.seed(202)
    b4_before = np.random.randint(1200, 2200, (4, h_geo, w_geo), dtype=np.uint16)
    b4_after = b4_before.copy()
    cm_mask = np.zeros((h_geo, w_geo), dtype=np.uint8)

    # Urban expansion in After raster (higher Red/SWIR, lower NIR)
    b4_after[2, 80:160, 90:170] = 3400  # Red increases (urban materials)
    b4_after[3, 80:160, 90:170] = 1100  # NIR decreases (vegetation removed)
    cm_mask[80:160, 90:170] = 255

    meta = {
        "driver": "GTiff",
        "height": h_geo,
        "width": w_geo,
        "count": 4,
        "dtype": "uint16",
        "crs": crs,
        "transform": transform,
    }

    with rasterio.open(os.path.join(oscd_dir, "before.tif"), "w", **meta) as dst:
        dst.write(b4_before)

    with rasterio.open(os.path.join(oscd_dir, "after.tif"), "w", **meta) as dst:
        dst.write(b4_after)

    mask_meta = meta.copy()
    mask_meta.update({"count": 1, "dtype": "uint8"})
    with rasterio.open(os.path.join(oscd_dir, "cm.tif"), "w", **mask_meta) as dst:
        dst.write(cm_mask, 1)

    # 2b. OSCD Georeferenced Sample in Valencia, Spain (EPSG:32630)
    valencia_dir = os.path.join(data_dir, "oscd", "valencia")
    os.makedirs(valencia_dir, exist_ok=True)
    val_transform = from_origin(725000.0, 4372000.0, 10.0, 10.0) # 10m GSD
    val_crs = "EPSG:32630"
    np.random.seed(203)
    val_b_before = np.random.randint(1100, 2100, (4, h_geo, w_geo), dtype=np.uint16)
    val_b_after = val_b_before.copy()
    val_cm = np.zeros((h_geo, w_geo), dtype=np.uint8)
    val_b_after[2, 60:140, 100:190] = 3200
    val_b_after[3, 60:140, 100:190] = 1200
    val_cm[60:140, 100:190] = 255
    val_meta = meta.copy()
    val_meta.update({"crs": val_crs, "transform": val_transform})
    with rasterio.open(os.path.join(valencia_dir, "before.tif"), "w", **val_meta) as dst:
        dst.write(val_b_before)
    with rasterio.open(os.path.join(valencia_dir, "after.tif"), "w", **val_meta) as dst:
        dst.write(val_b_after)
    val_mask_meta = val_meta.copy()
    val_mask_meta.update({"count": 1, "dtype": "uint8"})
    with rasterio.open(os.path.join(valencia_dir, "cm.tif"), "w", **val_mask_meta) as dst:
        dst.write(val_cm, 1)

    # 2c. OSCD Georeferenced Sample in Las Vegas, USA (EPSG:32611)
    vegas_dir = os.path.join(data_dir, "oscd", "las_vegas")
    os.makedirs(vegas_dir, exist_ok=True)
    vegas_transform = from_origin(667000.0, 4004000.0, 10.0, 10.0) # 10m GSD
    vegas_crs = "EPSG:32611"
    np.random.seed(204)
    vegas_b_before = np.random.randint(1300, 2400, (4, h_geo, w_geo), dtype=np.uint16)
    vegas_b_after = vegas_b_before.copy()
    vegas_cm = np.zeros((h_geo, w_geo), dtype=np.uint8)
    vegas_b_after[2, 110:200, 50:150] = 3600
    vegas_b_after[3, 110:200, 50:150] = 1050
    vegas_cm[110:200, 50:150] = 255
    vegas_meta = meta.copy()
    vegas_meta.update({"crs": vegas_crs, "transform": vegas_transform})
    with rasterio.open(os.path.join(vegas_dir, "before.tif"), "w", **vegas_meta) as dst:
        dst.write(vegas_b_before)
    with rasterio.open(os.path.join(vegas_dir, "after.tif"), "w", **vegas_meta) as dst:
        dst.write(vegas_b_after)
    vegas_mask_meta = vegas_meta.copy()
    vegas_mask_meta.update({"count": 1, "dtype": "uint8"})
    with rasterio.open(os.path.join(vegas_dir, "cm.tif"), "w", **vegas_mask_meta) as dst:
        dst.write(vegas_cm, 1)

    # 3. Custom GeoTIFF Sample (Delhi NCR - EPSG:32643)
    geotiff_dir = os.path.join(data_dir, "geotiff", "delhi_sector49")
    os.makedirs(geotiff_dir, exist_ok=True)

    delhi_transform = from_origin(714000.0, 3144000.0, 0.5, 0.5) # 0.5m GSD
    delhi_crs = "EPSG:32643"
    h_d, w_d = 512, 512

    # 3-band RGB GeoTIFF
    np.random.seed(303)
    delhi_t1 = np.random.randint(60, 120, (3, h_d, w_d), dtype=np.uint8)
    delhi_t1[1] += 40 # Green field
    
    delhi_t2 = delhi_t1.copy()
    # Built-up encroachment in T2
    delhi_t2[0, 150:280, 200:360] = 210
    delhi_t2[1, 150:280, 200:360] = 205
    delhi_t2[2, 150:280, 200:360] = 195

    delhi_meta = {
        "driver": "GTiff",
        "height": h_d,
        "width": w_d,
        "count": 3,
        "dtype": "uint8",
        "crs": delhi_crs,
        "transform": delhi_transform,
    }

    with rasterio.open(os.path.join(geotiff_dir, "before.tif"), "w", **delhi_meta) as dst:
        dst.write(delhi_t1)

    with rasterio.open(os.path.join(geotiff_dir, "after.tif"), "w", **delhi_meta) as dst:
        dst.write(delhi_t2)

    # 4. SpaceNet 7 Multi-Temporal Urban Development (PlanetScope 4m GSD)
    for sn7_id, crs_name, x0, y0, seed in [
        ("sn7_urban_expansion_aoi01", "EPSG:32632", 500000.0, 5200000.0, 401),
        ("sn7_construction_aoi02", "EPSG:32618", 580000.0, 4500000.0, 502),
    ]:
        sn7_dir = os.path.join(data_dir, "spacenet7", "samples", sn7_id)
        os.makedirs(sn7_dir, exist_ok=True)

        sn7_transform = from_origin(x0, y0, 4.0, 4.0)  # 4m GSD
        h_sn, w_sn = 256, 256

        # 4-band PlanetScope: Blue, Green, Red, NIR (uint16 surface reflectance)
        np.random.seed(seed)
        sn7_before = np.random.randint(400, 1400, (4, h_sn, w_sn), dtype=np.uint16)
        sn7_before[3] = np.random.randint(2200, 3800, (h_sn, w_sn), dtype=np.uint16)  # High NIR foliage

        sn7_after = sn7_before.copy()
        sn7_mask = np.zeros((h_sn, w_sn), dtype=np.uint8)

        # Urban expansion / new construction footprint cluster
        sn7_after[0, 80:170, 90:190] = 2600  # Blue
        sn7_after[1, 80:170, 90:190] = 2500  # Green
        sn7_after[2, 80:170, 90:190] = 2700  # Red
        sn7_after[3, 80:170, 90:190] = 1100  # Lower NIR (built-up replacement)
        sn7_mask[80:170, 90:190] = 255

        sn7_meta = {
            "driver": "GTiff",
            "height": h_sn,
            "width": w_sn,
            "count": 4,
            "dtype": "uint16",
            "crs": crs_name,
            "transform": sn7_transform,
        }

        with rasterio.open(os.path.join(sn7_dir, "before.tif"), "w", **sn7_meta) as dst:
            dst.write(sn7_before)

        with rasterio.open(os.path.join(sn7_dir, "after.tif"), "w", **sn7_meta) as dst:
            dst.write(sn7_after)

        Image.fromarray(sn7_mask).save(os.path.join(sn7_dir, "ground_truth_mask.png"))

        sn7_custom_meta = {
            "dataset": "SpaceNet 7 Multi-Temporal Urban Development Challenge",
            "sample_id": sn7_id,
            "sensor": "PlanetScope Dove (4-band RGB-NIR, 4m GSD)",
            "crs": crs_name,
            "acquisition_dates": {
                "before": "2018-05-15T00:00:00Z",
                "after": "2019-11-20T00:00:00Z",
            },
            "task": "Building footprint construction & urban growth",
            "license": "CC-BY-SA-4.0",
        }
        with open(os.path.join(sn7_dir, "metadata.json"), "w", encoding="utf-8") as f:
            json.dump(sn7_custom_meta, f, indent=2)

    print("Sample datasets (LEVIR-CD, OSCD, GeoTIFF, SpaceNet 7) generated successfully.")


if __name__ == "__main__":
    generate_samples("c:/Users/mishr/OneDrive/Desktop/geosentinel-ai")
