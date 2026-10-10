"""
GeoSentinel AI - SpaceNet 7 Multi-Temporal Urban Development Dataset Loader.
Loads georeferenced PlanetScope monthly satellite imagery (4m GSD), UTM CRS,
affine transforms, and building footprint change ground-truth masks.
"""

from typing import Dict, List, Optional, Any
import os
import json
import numpy as np
import rasterio
from PIL import Image

from app.geo.raster_validator import RasterValidator, RasterMetadata


class SpaceNet7Loader:
    """Loader for SpaceNet 7 Multi-Temporal Urban Development Challenge dataset."""

    def __init__(self, dataset_dir: str):
        self.dataset_dir = dataset_dir
        self.samples_dir = os.path.join(dataset_dir, "samples")
        os.makedirs(self.samples_dir, exist_ok=True)

    def list_pairs(self) -> List[str]:
        """Returns list of available SpaceNet 7 sample AOI pair IDs."""
        if not os.path.exists(self.samples_dir):
            return []
        
        aoi_folders = [
            f for f in os.listdir(self.samples_dir)
            if os.path.isdir(os.path.join(self.samples_dir, f))
            and os.path.exists(os.path.join(self.samples_dir, f, "before.tif"))
            and os.path.exists(os.path.join(self.samples_dir, f, "after.tif"))
        ]
        return sorted(aoi_folders)

    def load_pair(self, pair_id: str) -> Dict[str, Any]:
        """
        Loads a specific SpaceNet 7 bi-temporal urban development pair.

        Returns:
            Dictionary with filepaths, metadata, ground-truth array, and geographic bounds.
        """
        pair_folder = os.path.join(self.samples_dir, pair_id)
        before_path = os.path.join(pair_folder, "before.tif")
        after_path = os.path.join(pair_folder, "after.tif")
        mask_path = os.path.join(pair_folder, "ground_truth_mask.png")
        meta_path = os.path.join(pair_folder, "metadata.json")

        if not os.path.exists(before_path) or not os.path.exists(after_path):
            raise FileNotFoundError(f"SpaceNet 7 sample '{pair_id}' missing before or after GeoTIFF.")

        # Read raster metadata
        before_meta = RasterValidator.inspect_raster(before_path)
        after_meta = RasterValidator.inspect_raster(after_path)

        # Read ground truth mask if available
        gt_array = None
        if os.path.exists(mask_path):
            try:
                gt_img = Image.open(mask_path).convert("L")
                gt_array = np.array(gt_img, dtype=np.uint8)
            except Exception:
                gt_array = None

        # Read custom metadata if available
        custom_meta = {}
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    custom_meta = json.load(f)
            except Exception:
                custom_meta = {}

        return {
            "dataset_id": "spacenet7",
            "pair_id": pair_id,
            "before_path": before_path,
            "after_path": after_path,
            "mask_path": mask_path if os.path.exists(mask_path) else None,
            "ground_truth": gt_array,
            "before_metadata": before_meta,
            "after_metadata": after_meta,
            "is_georeferenced": before_meta.is_georeferenced,
            "crs_epsg": before_meta.crs_epsg,
            "bounds_wgs84": before_meta.bounds_wgs84.to_dict() if before_meta.bounds_wgs84 else None,
            "resolution": list(before_meta.resolution) if before_meta.resolution else [4.0, 4.0],
            "sensor": custom_meta.get("sensor", "PlanetScope Planet Dove (4m GSD)"),
            "acquisition_dates": custom_meta.get("acquisition_dates", {
                "before": "2018-05-15T00:00:00Z",
                "after": "2019-11-20T00:00:00Z",
            }),
            "source": "SpaceNet 7 (PlanetScope / Radiant Earth)",
            "license": "CC-BY-SA-4.0",
        }
