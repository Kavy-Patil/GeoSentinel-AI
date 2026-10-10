"""
GeoSentinel AI - Classical Computer Vision Change Detection Pipeline.
Implements spectral differencing, consistent radiometric scaling, configurable thresholding,
and mathematical morphological false-positive suppression.
"""

from typing import Any, Dict, Optional, Tuple, Union
import time
import numpy as np
from app.detection.base import ChangeDetector, DetectionResult
from app.detection.filtering import MaskFilter


class ClassicalChangeDetector(ChangeDetector):
    """
    Classical spectral difference change detector.
    Does not require deep learning weights or GPU hardware.
    """

    def __init__(self, mode: str = "mean_abs_diff"):
        """
        Args:
            mode: 'mean_abs_diff' (normalized RGB L1), 'euclidean_norm' (spectral vector L2), or 'luminance'.
        """
        self.mode = mode

    @property
    def name(self) -> str:
        return f"Classical Spectral Differencing ({self.mode})"

    @property
    def is_available(self) -> bool:
        return True

    @staticmethod
    def _standardize_input(
        img: np.ndarray,
    ) -> Tuple[np.ndarray, Tuple[int, int]]:
        """
        Standardizes input array to float32 (H, W, C) in range [0.0, 1.0].
        """
        if img.ndim == 2:
            # (H, W) -> (H, W, 1)
            h, w = img.shape
            img = img[:, :, np.newaxis]
        elif img.ndim == 3:
            if img.shape[0] in [1, 2, 3, 4] and img.shape[2] not in [1, 2, 3, 4]:
                # (C, H, W) -> (H, W, C)
                img = np.transpose(img, (1, 2, 0))
            h, w = img.shape[:2]
        else:
            raise ValueError(f"Unsupported image array dimensions: {img.ndim}D")

        # Convert to float32 and normalize
        arr = img.astype(np.float32)

        # Replace non-finite values with 0.0
        np.nan_to_num(arr, copy=False, nan=0.0, posinf=1.0, neginf=0.0)

        # Scale based on data type or maximum value
        if arr.size > 0:
            max_val = float(np.max(arr))
            if max_val > 255.0:
                # 16-bit optical surface reflectance (Sentinel-2 / Landsat L2A)
                arr = arr / 4000.0
            elif max_val > 1.0:
                # 8-bit raster
                arr = arr / 255.0
            arr = np.clip(arr, 0.0, 1.0)

        return arr, (h, w)

    def predict(
        self,
        before: np.ndarray,
        after: np.ndarray,
        valid_mask: Optional[np.ndarray] = None,
        threshold: float = 0.5,
        kernel_size: int = 3,
        min_component_size: int = 25,
        connectivity: int = 8,
        **kwargs: Any,
    ) -> DetectionResult:
        """
        Executes classical bi-temporal change detection.
        """
        start_time = time.perf_counter()

        # 1. Standardize inputs and validate shapes
        arr_before, shape_before = self._standardize_input(before)
        arr_after, shape_after = self._standardize_input(after)

        if shape_before != shape_after:
            raise ValueError(
                f"Dimension mismatch between Before {shape_before} and After {shape_after} rasters."
            )

        height, width = shape_before

        # Ensure channel count alignment
        min_channels = min(arr_before.shape[2], arr_after.shape[2])
        if min_channels == 0:
            raise ValueError("Input images have 0 channels.")
        b_slice = arr_before[:, :, :min_channels]
        a_slice = arr_after[:, :, :min_channels]

        # 2. Difference Map Calculation
        if self.mode == "euclidean_norm":
            diff = np.sqrt(np.sum((a_slice - b_slice) ** 2, axis=-1)) / np.sqrt(min_channels)
        elif self.mode == "luminance" and min_channels >= 3:
            # ITU-R BT.601 luminance differencing
            lum_before = 0.299 * b_slice[:, :, 0] + 0.587 * b_slice[:, :, 1] + 0.114 * b_slice[:, :, 2]
            lum_after = 0.299 * a_slice[:, :, 0] + 0.587 * a_slice[:, :, 1] + 0.114 * a_slice[:, :, 2]
            diff = np.abs(lum_after - lum_before)
        else:
            # Default: Normalized Absolute RGB Difference
            diff = np.mean(np.abs(a_slice - b_slice), axis=-1)

        change_score = np.clip(diff.astype(np.float32), 0.0, 1.0)

        # Mask invalid observation pixels
        if valid_mask is not None:
            if valid_mask.shape != (height, width):
                raise ValueError(
                    f"valid_mask shape {valid_mask.shape} does not match image grid ({height}, {width})"
                )
            change_score[~valid_mask] = 0.0

        # 3. Thresholding
        threshold = max(0.0, min(1.0, float(threshold)))
        raw_mask = (change_score >= threshold)
        if valid_mask is not None:
            raw_mask &= valid_mask

        # 4. False-Positive Filtering (Morphology + Connected Components)
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
            method="classical",
            parameters={
                "mode": self.mode,
                "threshold": threshold,
                "kernel_size": kernel_size,
                "min_component_size": min_component_size,
                "connectivity": connectivity,
            },
            processing_time_ms=round(elapsed_ms, 2),
            metadata={
                "grid_height": height,
                "grid_width": width,
                "channels_evaluated": min_channels,
                "mean_change_score": float(np.mean(change_score)),
                "max_change_score": float(np.max(change_score)) if change_score.size > 0 else 0.0,
            },
            filtering_stats=filter_stats,
        )
