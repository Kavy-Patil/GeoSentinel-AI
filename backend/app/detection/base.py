"""
GeoSentinel AI - Abstract Change Detector Interface and Base Protocols.
Defines shared input/output contracts for both Classical Computer Vision
and Pretrained Machine Learning change detection pathways.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, Optional, Tuple, Protocol
import numpy as np


@dataclass
class DetectionResult:
    """Standardized output structure for all change detection algorithms."""
    change_score: np.ndarray  # Float32 array in [0.0, 1.0] matching raster (H, W)
    raw_mask: np.ndarray       # Boolean array (H, W) where change_score >= threshold
    filtered_mask: np.ndarray  # Boolean array (H, W) after morphology & connected-component filtering
    method: str                # Name/identifier of the detector used
    parameters: Dict[str, Any] # Configuration parameters used for detection
    processing_time_ms: float  # Real execution time in milliseconds
    metadata: Dict[str, Any] = field(default_factory=dict)
    filtering_stats: Dict[str, Any] = field(default_factory=dict)


class ChangeDetector(ABC):
    """Abstract Base Class for all change detection models."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Returns detector name identifier."""
        pass

    @property
    @abstractmethod
    def is_available(self) -> bool:
        """Returns True if the detector and its dependencies/weights are ready."""
        pass

    @abstractmethod
    def predict(
        self,
        before: np.ndarray,
        after: np.ndarray,
        valid_mask: Optional[np.ndarray] = None,
        threshold: float = 0.5,
        **kwargs: Any,
    ) -> DetectionResult:
        """
        Executes change detection on two spatially aligned images.
        
        Args:
            before: Numpy array of shape (H, W, C) or (C, H, W) or (H, W).
            after: Numpy array of matching shape to before.
            valid_mask: Boolean array of shape (H, W) indicating usable observation pixels.
            threshold: Sensitivity threshold between 0.0 and 1.0.
            **kwargs: Detector-specific hyperparameters (e.g. kernel size, min component size).

        Returns:
            DetectionResult with float32 score map, binary masks, and runtime telemetry.
        """
        pass
