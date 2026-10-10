"""
Unit tests for detector interface, registry, and availability discovery.
"""

import pytest
from app.detection.registry import registry
from app.detection.classical import ClassicalChangeDetector
from app.detection.pretrained import PretrainedChangeDetector


def test_registry_lookup():
    classical_det = registry.get_detector("classical")
    assert isinstance(classical_det, ClassicalChangeDetector)
    assert classical_det.is_available is True

    deep_det = registry.get_detector("deep_learning")
    assert isinstance(deep_det, PretrainedChangeDetector)


def test_registry_methods_listing():
    methods = registry.list_methods()
    assert len(methods) >= 2
    method_ids = [m["id"] for m in methods]
    assert "classical" in method_ids
    assert "deep_learning" in method_ids


def test_unavailable_pretrained_reports_truthfully():
    det = PretrainedChangeDetector(checkpoint_path="non_existent_weights.pth")
    assert det.is_available is False
    assert "not found" in det.status_message.lower()

    # Attempting prediction on unavailable detector raises RuntimeError
    with pytest.raises(RuntimeError) as exc_info:
        det.predict(None, None)
    assert "not available" in str(exc_info.value).lower()
