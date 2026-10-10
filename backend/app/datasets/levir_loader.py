"""
GeoSentinel AI - LEVIR-CD Dataset Loader.
Loads bi-temporal optical RGB pairs and ground-truth building change masks.
LEVIR-CD operates in pixel-coordinate mode (non-georeferenced).
"""

from typing import Dict, List, Optional, Any
import os
import numpy as np
from PIL import Image


class LevirLoader:
    """Loader for LEVIR-CD building change benchmark dataset."""

    def __init__(self, dataset_dir: str):
        self.dataset_dir = dataset_dir
        self.samples_dir_a = os.path.join(dataset_dir, "A")
        self.samples_dir_b = os.path.join(dataset_dir, "B")
        self.samples_dir_label = os.path.join(dataset_dir, "label")

    def list_pairs(self) -> List[str]:
        """Lists available pair IDs in the dataset directory."""
        if not os.path.exists(self.samples_dir_a):
            return []
        files = [
            os.path.splitext(f)[0]
            for f in os.listdir(self.samples_dir_a)
            if f.lower().endswith((".png", ".jpg", ".jpeg", ".tif"))
        ]
        return sorted(files)

    def load_pair(self, pair_id: str) -> Dict[str, Any]:
        """
        Loads Before (A), After (B), and Ground Truth (label) rasters.
        Returns numpy arrays (H, W, C) for images and (H, W) for label.
        """
        path_a = self._find_image(self.samples_dir_a, pair_id)
        path_b = self._find_image(self.samples_dir_b, pair_id)
        path_label = self._find_image(self.samples_dir_label, pair_id) if os.path.exists(self.samples_dir_label) else None

        if not path_a or not path_b:
            raise FileNotFoundError(f"LEVIR-CD pair '{pair_id}' incomplete. Missing T1 or T2 image.")

        img_a = Image.open(path_a).convert("RGB")
        img_b = Image.open(path_b).convert("RGB")

        arr_a = np.array(img_a)
        arr_b = np.array(img_b)

        arr_label = None
        if path_label and os.path.exists(path_label):
            label_img = Image.open(path_label).convert("L")
            arr_label = np.array(label_img)

        return {
            "pair_id": pair_id,
            "dataset": "LEVIR-CD",
            "before": arr_a,
            "after": arr_b,
            "ground_truth": arr_label,
            "georeferenced": False,
            "source_crs": None,
            "width": arr_a.shape[1],
            "height": arr_a.shape[0],
            "bands": arr_a.shape[2] if arr_a.ndim == 3 else 1,
            "metadata": {
                "sensor": "Google Earth High-Resolution Optical",
                "spatial_resolution_gsd": "0.5m",
                "acquisition_mode": "Pixel Space (Non-georeferenced)",
                "before_path": path_a,
                "after_path": path_b,
                "label_path": path_label,
            },
        }

    def _find_image(self, directory: str, pair_id: str) -> Optional[str]:
        if not os.path.exists(directory):
            return None
        for ext in [".png", ".jpg", ".jpeg", ".tif", ".tiff"]:
            candidate = os.path.join(directory, f"{pair_id}{ext}")
            if os.path.exists(candidate):
                return candidate
        return None
