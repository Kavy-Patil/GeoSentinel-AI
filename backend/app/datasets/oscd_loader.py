"""
GeoSentinel AI - OSCD (ONERA Satellite Change Detection) Dataset Loader.
Loads Sentinel-2 multispectral bi-temporal pairs with preserved UTM georeferencing.
"""

from typing import Dict, List, Optional, Any
import os
import numpy as np
import rasterio
from app.geo.raster_validator import RasterValidator


class OscdLoader:
    """Loader for ONERA Satellite Change Detection (OSCD) multispectral benchmark."""

    def __init__(self, dataset_dir: str):
        self.dataset_dir = dataset_dir

    def list_pairs(self) -> List[str]:
        """Lists available city / region pair directories in the OSCD folder."""
        if not os.path.exists(self.dataset_dir):
            return []
        pairs = [
            d for d in os.listdir(self.dataset_dir)
            if os.path.isdir(os.path.join(self.dataset_dir, d)) and not d.startswith(".")
        ]
        return sorted(pairs)

    def load_pair(self, pair_id: str) -> Dict[str, Any]:
        """
        Loads OSCD pair with Before/After GeoTIFFs, CRS, and ground truth mask.
        """
        pair_dir = os.path.join(self.dataset_dir, pair_id)
        if not os.path.exists(pair_dir):
            raise FileNotFoundError(f"OSCD pair '{pair_id}' not found at {pair_dir}")

        before_path = os.path.join(pair_dir, "before.tif")
        after_path = os.path.join(pair_dir, "after.tif")
        label_path = os.path.join(pair_dir, "cm.tif")

        if not os.path.exists(before_path) or not os.path.exists(after_path):
            raise FileNotFoundError(f"Incomplete OSCD pair files in {pair_dir}")

        val_result = RasterValidator.validate_pair(before_path, after_path)

        with rasterio.open(before_path) as src_a:
            data_a = src_a.read()
        with rasterio.open(after_path) as src_b:
            data_b = src_b.read()

        data_label = None
        if os.path.exists(label_path):
            with rasterio.open(label_path) as src_lbl:
                data_label = src_lbl.read(1)

        return {
            "pair_id": pair_id,
            "dataset": "OSCD (ONERA)",
            "before": data_a,
            "after": data_b,
            "ground_truth": data_label,
            "georeferenced": val_result.georeferenced,
            "source_crs": val_result.source_crs,
            "width": val_result.width,
            "height": val_result.height,
            "bands": val_result.bands,
            "bounds_wgs84": val_result.overlap_wgs84.to_dict() if val_result.overlap_wgs84 else None,
            "metadata": {
                "sensor": "Sentinel-2 MSI (Multispectral)",
                "spatial_resolution_gsd": "10m GSD (Visible/NIR)",
                "source_crs": val_result.source_crs,
                "before_path": before_path,
                "after_path": after_path,
                "label_path": label_path if os.path.exists(label_path) else None,
            },
        }
