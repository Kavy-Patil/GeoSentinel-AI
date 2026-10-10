"""
Change detection algorithms package for GeoSentinel AI.
"""

from app.detection.base import ChangeDetector, DetectionResult
from app.detection.classical import ClassicalChangeDetector
from app.detection.pretrained import PretrainedChangeDetector
from app.detection.filtering import MaskFilter
from app.detection.registry import registry, DetectorRegistry

__all__ = [
    "ChangeDetector",
    "DetectionResult",
    "ClassicalChangeDetector",
    "PretrainedChangeDetector",
    "MaskFilter",
    "registry",
    "DetectorRegistry",
]
