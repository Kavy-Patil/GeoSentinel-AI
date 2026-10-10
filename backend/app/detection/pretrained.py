"""
GeoSentinel AI - Pretrained Deep Learning Change Detection Module.
Provides architecture interface for loading verified bi-temporal change detection checkpoints
(e.g. ChangeFormer, BIT-CD) with tiled execution and truthful availability reporting.
"""

from typing import Any, Dict, Optional, Tuple
import os
import time
import numpy as np
from app.detection.base import ChangeDetector, DetectionResult
from app.detection.filtering import MaskFilter
from app.detection.tiling import TiledInferenceManager


class PretrainedChangeDetector(ChangeDetector):
    """
    Bi-Temporal Deep Learning Change Detector.
    Supports real checkpoint loading for transformer/CNN change detection models.
    """

    def __init__(
        self,
        model_name: str = "ChangeFormer",
        checkpoint_path: Optional[str] = None,
        device: str = "cpu",
    ):
        self.model_name = model_name
        self.checkpoint_path = checkpoint_path or os.path.join(
            os.path.dirname(__file__), "..", "..", "..", "data", "models", "changeformer_levircd.pth"
        )
        self.device = device
        self._model = None
        self._load_error: Optional[str] = None

        self._check_and_load_checkpoint()

    def _check_and_load_checkpoint(self) -> None:
        """Inspects checkpoint availability and attempts model initialization."""
        if not os.path.exists(self.checkpoint_path):
            self._load_error = f"Checkpoint file not found at '{self.checkpoint_path}'. Place weights in data/models/ to activate."
            return

        try:
            import torch
            # Checkpoint exists; load weights on configured device
            self._model = torch.load(self.checkpoint_path, map_location=self.device, weights_only=True)
            self._load_error = None
        except ImportError:
            self._load_error = "PyTorch (torch) is not installed in the runtime environment."
        except Exception as e:
            self._load_error = f"Failed to load checkpoint: {str(e)}"

    @property
    def name(self) -> str:
        return f"Pretrained AI ({self.model_name})"

    @property
    def is_available(self) -> bool:
        return self._model is not None and self._load_error is None

    @property
    def status_message(self) -> str:
        if self.is_available:
            return f"Operational ({self.model_name} on {self.device})"
        return self._load_error or "Checkpoint unavailable."

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
        Runs bi-temporal deep learning inference.
        """
        if not self.is_available:
            raise RuntimeError(
                f"Pretrained detector '{self.model_name}' is not available: {self._load_error}"
            )

        start_time = time.perf_counter()
        h, w = before.shape[:2]

        # Standard inference execution using loaded model
        # (When model is initialized, execute patch-based forward pass)
        try:
            import torch

            def patch_predict(b_patch: np.ndarray, a_patch: np.ndarray) -> np.ndarray:
                # Transform to tensor (1, 3, H, W)
                b_t = torch.from_numpy(b_patch.transpose(2, 0, 1)).float().unsqueeze(0) / 255.0
                a_t = torch.from_numpy(a_patch.transpose(2, 0, 1)).float().unsqueeze(0) / 255.0
                with torch.no_grad():
                    out = self._model(b_t.to(self.device), a_t.to(self.device))
                    probs = torch.softmax(out, dim=1)[:, 1, :, :].squeeze().cpu().numpy()
                return probs.astype(np.float32)

            change_score = TiledInferenceManager.run_tiled_prediction(
                before, after, patch_predict, patch_size=256, overlap=32
            )
        except Exception as e:
            raise RuntimeError(f"Deep learning forward pass failed: {str(e)}")

        if valid_mask is not None:
            change_score[~valid_mask] = 0.0

        raw_mask = (change_score >= threshold)
        if valid_mask is not None:
            raw_mask &= valid_mask

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
            method="deep_learning",
            parameters={
                "model": self.model_name,
                "threshold": threshold,
                "kernel_size": kernel_size,
                "min_component_size": min_component_size,
                "connectivity": connectivity,
            },
            processing_time_ms=round(elapsed_ms, 2),
            metadata={
                "device": self.device,
                "checkpoint": os.path.basename(self.checkpoint_path),
            },
            filtering_stats=filter_stats,
        )
