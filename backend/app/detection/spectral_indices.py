"""
GeoSentinel AI - Remote Sensing Spectral Index Change Detection Engines.
Implements:
1. NDVI Differencing (Normalized Difference Vegetation Index): (NIR - Red) / (NIR + Red)
2. NDBI Differencing (Normalized Difference Built-up Index): (SWIR1 - NIR) / (SWIR1 + NIR)
3. Urban Encroachment Multi-Index: Joint NDBI growth + NDVI depletion for 30m Landsat analysis.
"""

from typing import Any, Dict, Optional, Tuple
import time
import numpy as np
from app.detection.base import ChangeDetector, DetectionResult
from app.detection.filtering import MaskFilter


def compute_spectral_index(
    band_a: np.ndarray,
    band_b: np.ndarray,
    eps: float = 1e-6,
) -> np.ndarray:
    """
    Computes normalized difference index: (band_a - band_b) / (band_a + band_b + eps)
    Safe against divide-by-zero, clipped to [-1.0, 1.0].
    """
    num = band_a.astype(np.float32) - band_b.astype(np.float32)
    denom = band_a.astype(np.float32) + band_b.astype(np.float32) + eps
    idx = num / denom
    np.nan_to_num(idx, copy=False, nan=0.0, posinf=1.0, neginf=-1.0)
    return np.clip(idx, -1.0, 1.0)


class SpectralIndexChangeDetector(ChangeDetector):
    """
    Base class for physical remote-sensing index change detection (NDVI, NDBI, Urban Encroachment).
    """

    def __init__(self, index_type: str = "urban_encroachment"):
        self.index_type = index_type

    @property
    def name(self) -> str:
        names = {
            "ndvi_diff": "NDVI Vegetation Loss & Biomass Shift",
            "ndbi_diff": "NDBI Built-Up & Urban Expansion Index",
            "urban_encroachment": "Multi-Index Urban Encroachment (NDBI + NDVI)",
        }
        return names.get(self.index_type, f"Spectral Index ({self.index_type})")

    @property
    def is_available(self) -> bool:
        return True

    @staticmethod
    def _extract_bands(
        arr: np.ndarray,
    ) -> Dict[str, np.ndarray]:
        """
        Extracts spectral bands from multi-band raster (H, W, C) or (C, H, W).
        Standard order:
        4-band: [Red, Green, Blue, NIR]
        5-band / 6-band: [Red, Green, Blue, NIR, SWIR1, (SWIR2)]
        """
        if arr.ndim == 2:
            h, w = arr.shape
            red = green = blue = nir = swir1 = arr.astype(np.float32)
        elif arr.ndim == 3:
            if arr.shape[0] in [3, 4, 5, 6] and arr.shape[2] not in [3, 4, 5, 6]:
                arr = np.transpose(arr, (1, 2, 0))
            h, w, c = arr.shape
            arr_f = arr.astype(np.float32)
            if c == 1:
                red = green = blue = nir = swir1 = arr_f[:, :, 0]
            elif c == 3:
                red = arr_f[:, :, 0]
                green = arr_f[:, :, 1]
                blue = arr_f[:, :, 2]
                nir = red * 1.2  # Approximate NIR fallback
                swir1 = red * 1.1
            elif c == 4:
                # [Red, Green, Blue, NIR]
                red = arr_f[:, :, 0]
                green = arr_f[:, :, 1]
                blue = arr_f[:, :, 2]
                nir = arr_f[:, :, 3]
                swir1 = nir * 0.85
            else:
                # [Red, Green, Blue, NIR, SWIR1, ...]
                red = arr_f[:, :, 0]
                green = arr_f[:, :, 1]
                blue = arr_f[:, :, 2]
                nir = arr_f[:, :, 3]
                swir1 = arr_f[:, :, 4]
        else:
            raise ValueError(f"Invalid raster shape: {arr.shape}")

        return {
            "red": red,
            "green": green,
            "blue": blue,
            "nir": nir,
            "swir1": swir1,
            "shape": (h, w),
        }

    def predict(
        self,
        before: np.ndarray,
        after: np.ndarray,
        valid_mask: Optional[np.ndarray] = None,
        threshold: float = 0.35,
        kernel_size: int = 3,
        min_component_size: int = 20,
        connectivity: int = 8,
        **kwargs: Any,
    ) -> DetectionResult:
        """
        Calculates spectral change score and binary change mask.
        """
        start_time = time.perf_counter()

        b_bands = self._extract_bands(before)
        a_bands = self._extract_bands(after)

        if b_bands["shape"] != a_bands["shape"]:
            raise ValueError(
                f"Dimension mismatch between Before {b_bands['shape']} and After {a_bands['shape']}."
            )

        h, w = b_bands["shape"]

        # Compute Indices
        ndvi_before = compute_spectral_index(b_bands["nir"], b_bands["red"])
        ndvi_after = compute_spectral_index(a_bands["nir"], a_bands["red"])
        delta_ndvi = ndvi_after - ndvi_before

        ndbi_before = compute_spectral_index(b_bands["swir1"], b_bands["nir"])
        ndbi_after = compute_spectral_index(a_bands["swir1"], a_bands["nir"])
        delta_ndbi = ndbi_after - ndbi_before

        if self.index_type == "ndvi_diff":
            # Vegetation depletion: where delta_ndvi < 0
            # Normalize change score to [0.0, 1.0]
            change_score = np.clip(-delta_ndvi, 0.0, 1.0)

        elif self.index_type == "ndbi_diff":
            # Built-up increase: where delta_ndbi > 0
            change_score = np.clip(delta_ndbi, 0.0, 1.0)

        else:
            # Multi-Index Urban Encroachment:
            # High score when NDBI increases (new structures/impervious surfaces)
            # AND NDVI decreases (cleared farmland/trees)
            built_up_growth = np.clip(delta_ndbi, 0.0, 1.0)
            veg_loss = np.clip(-delta_ndvi, 0.0, 1.0)
            # Weighted joint index (60% NDBI increase + 40% NDVI loss)
            raw_score = 0.60 * built_up_growth + 0.40 * veg_loss
            # Radiometric normalization
            change_score = np.clip(raw_score * 1.5, 0.0, 1.0)

        # Apply valid mask
        if valid_mask is not None:
            if valid_mask.shape != (h, w):
                raise ValueError(f"valid_mask shape mismatch: {valid_mask.shape} vs ({h}, {w})")
            change_score[~valid_mask] = 0.0

        # Thresholding
        threshold = max(0.0, min(1.0, float(threshold)))
        raw_mask = change_score >= threshold
        if valid_mask is not None:
            raw_mask &= valid_mask

        # Morphological filtering
        filtered_mask, filter_stats = MaskFilter.apply_filters(
            raw_mask=raw_mask,
            valid_mask=valid_mask,
            kernel_size=kernel_size,
            min_component_size=min_component_size,
            connectivity=connectivity,
        )

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        return DetectionResult(
            change_score=change_score,
            raw_mask=raw_mask,
            filtered_mask=filtered_mask,
            method=self.index_type,
            parameters={
                "index_type": self.index_type,
                "threshold": threshold,
                "kernel_size": kernel_size,
                "min_component_size": min_component_size,
                "connectivity": connectivity,
            },
            processing_time_ms=round(elapsed_ms, 2),
            metadata={
                "grid_height": h,
                "grid_width": w,
                "mean_change_score": float(np.mean(change_score)),
                "max_change_score": float(np.max(change_score)) if change_score.size > 0 else 0.0,
                "mean_ndvi_before": float(np.mean(ndvi_before)),
                "mean_ndvi_after": float(np.mean(ndvi_after)),
                "mean_ndbi_before": float(np.mean(ndbi_before)),
                "mean_ndbi_after": float(np.mean(ndbi_after)),
            },
            filtering_stats=filter_stats,
        )
