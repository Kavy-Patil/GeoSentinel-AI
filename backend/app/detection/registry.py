"""
GeoSentinel AI - Detector Registry.
Manages available change detection algorithms and dispatches prediction requests.
"""

from typing import Dict, List, Optional, Any
from app.detection.base import ChangeDetector
from app.detection.classical import ClassicalChangeDetector
from app.detection.pretrained import PretrainedChangeDetector
from app.detection.spectral_indices import SpectralIndexChangeDetector


class DetectorRegistry:
    """Central registry for change detection engines."""

    def __init__(self):
        self._detectors: Dict[str, ChangeDetector] = {
            "classical": ClassicalChangeDetector(),
            "urban_encroachment": SpectralIndexChangeDetector("urban_encroachment"),
            "ndvi_diff": SpectralIndexChangeDetector("ndvi_diff"),
            "ndbi_diff": SpectralIndexChangeDetector("ndbi_diff"),
            "deep_learning": PretrainedChangeDetector(),
        }

    def get_detector(self, method: str) -> ChangeDetector:
        """Retrieves a detector instance by method name."""
        method_key = method.lower().strip()
        if method_key not in self._detectors:
            raise KeyError(
                f"Unknown detection method '{method}'. Available methods: {list(self._detectors.keys())}"
            )
        return self._detectors[method_key]

    def list_methods(self) -> List[Dict[str, Any]]:
        """Returns metadata and live availability for all registered methods."""
        return [
            {
                "id": "urban_encroachment",
                "name": "Multi-Index Urban Encroachment (NDBI + NDVI 30m Landsat)",
                "available": True,
                "type": "remote_sensing_multi_index",
                "hardware": "CPU",
                "description": "Combines SWIR/NIR built-up index increase with Red/NIR vegetation depletion for robust 2000–2026 historical expansion detection.",
            },
            {
                "id": "ndbi_diff",
                "name": "NDBI Built-Up Index Differencing (SWIR1 - NIR)",
                "available": True,
                "type": "spectral_index",
                "hardware": "CPU",
                "description": "Normalized Difference Built-up Index measuring infrastructure growth, paved surfaces, and construction footprints.",
            },
            {
                "id": "ndvi_diff",
                "name": "NDVI Vegetation Loss Index (NIR - Red)",
                "available": True,
                "type": "spectral_index",
                "hardware": "CPU",
                "description": "Normalized Difference Vegetation Index measuring forest clearing, agricultural conversion, and green cover depletion.",
            },
            {
                "id": "classical",
                "name": "Classical Computer Vision (Spectral Differencing & Morphology)",
                "available": True,
                "type": "spectral_differencing",
                "hardware": "CPU",
                "description": "Normalized absolute RGB/multispectral differencing with mathematical morphology and connected-component filtering.",
            },
            {
                "id": "deep_learning",
                "name": "Pretrained AI (ChangeFormer Transformer)",
                "available": self._detectors["deep_learning"].is_available,
                "type": "deep_learning_siamese",
                "hardware": "CPU / CUDA",
                "description": "Bi-temporal transformer-based building change detector trained on high-resolution satellite imagery.",
                "status": (
                    "Operational"
                    if self._detectors["deep_learning"].is_available
                    else "Weights not loaded (Optional - Place checkpoint in data/models/)"
                ),
            },
        ]

    def get_available_method_ids(self) -> List[str]:
        """Returns list of IDs for methods that are currently operational."""
        return [
            method_id
            for method_id, det in self._detectors.items()
            if det.is_available
        ]


# Singleton instance
registry = DetectorRegistry()
