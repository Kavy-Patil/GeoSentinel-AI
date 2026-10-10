"""
Automated unit tests for morphological filtering and false-positive reduction.
"""

import numpy as np
import pytest
from app.detection.filtering import MaskFilter


def test_morphology_removes_isolated_salt_noise():
    """Test that morphological opening suppresses 1-pixel isolated noise."""
    mask = np.zeros((100, 100), dtype=bool)

    # 1. Add isolated single pixel noise
    mask[10, 10] = True
    mask[20, 80] = True
    mask[75, 25] = True

    # 2. Add real solid change patch (15x15)
    mask[40:55, 40:55] = True

    filtered, stats = MaskFilter.apply_filters(
        raw_mask=mask,
        kernel_size=3,
        min_component_size=10,
    )

    # Isolated pixels should be eliminated
    assert filtered[10, 10] == False
    assert filtered[20, 80] == False
    assert filtered[75, 25] == False

    # Solid patch should remain
    assert np.all(filtered[41:54, 41:54] == True)
    assert stats["components_retained"] == 1


def test_connected_component_size_filtering():
    """Test that components below min_component_size are rejected and logged."""
    mask = np.zeros((100, 100), dtype=bool)

    # Small component: 3x3 = 9 pixels
    mask[10:13, 10:13] = True

    # Large component: 10x10 = 100 pixels
    mask[50:60, 50:60] = True

    filtered, stats = MaskFilter.apply_filters(
        raw_mask=mask,
        kernel_size=1,  # Bypass morphology to test connected component size directly
        min_component_size=50,
    )

    # Small component filtered out
    assert np.all(filtered[10:13, 10:13] == False)
    # Large component retained
    assert np.all(filtered[50:60, 50:60] == True)

    assert stats["components_retained"] == 1
    assert stats["components_suppressed"] == 1
    assert stats["pixels_removed_by_min_area"] == 9
