"""
Automated unit tests for Classical Computer Vision Change Detection.
"""

import numpy as np
import pytest
from app.detection.classical import ClassicalChangeDetector


@pytest.fixture
def detector():
    return ClassicalChangeDetector()


def test_identical_images_zero_difference(detector):
    """Test that two identical images result in zero change detections."""
    h, w = 128, 128
    np.random.seed(42)
    img = np.random.randint(50, 200, (h, w, 3), dtype=np.uint8)

    result = detector.predict(before=img, after=img, threshold=0.1)

    assert result.change_score.shape == (h, w)
    assert np.all(result.change_score == 0.0)
    assert np.all(result.raw_mask == False)
    assert np.all(result.filtered_mask == False)
    assert result.processing_time_ms > 0.0


def test_localized_synthetic_change(detector):
    """Test that a distinct localized change region is detected correctly."""
    h, w = 100, 100
    before = np.ones((h, w, 3), dtype=np.uint8) * 50
    after = before.copy()

    # Add 20x20 bright change square in the center
    after[40:60, 40:60, :] = 250

    result = detector.predict(
        before=before,
        after=after,
        threshold=0.3,
        min_component_size=10,
    )

    assert result.change_score.shape == (h, w)
    assert result.change_score[50, 50] > 0.5
    assert result.change_score[10, 10] == 0.0
    assert result.filtered_mask[50, 50] == True
    assert result.filtered_mask[10, 10] == False
    # Center 20x20 = 400 pixels
    assert np.sum(result.filtered_mask) == 400


def test_invalid_pixels_excluded(detector):
    """Test that nodata / invalid pixels are excluded from change detection."""
    h, w = 60, 60
    before = np.ones((h, w, 3), dtype=np.uint8) * 10
    after = np.ones((h, w, 3), dtype=np.uint8) * 200  # Global change everywhere

    # Invalid mask for left half
    valid_mask = np.ones((h, w), dtype=bool)
    valid_mask[:, :30] = False

    result = detector.predict(
        before=before,
        after=after,
        valid_mask=valid_mask,
        threshold=0.2,
    )

    # Left half must have zero score and False mask
    assert np.all(result.change_score[:, :30] == 0.0)
    assert np.all(result.raw_mask[:, :30] == False)
    assert np.all(result.filtered_mask[:, :30] == False)

    # Right half must detect change
    assert np.all(result.raw_mask[:, 30:] == True)


def test_scores_finite_and_bounded(detector):
    """Test that change scores are strictly finite and bounded within [0.0, 1.0]."""
    h, w = 50, 50
    before = np.random.randn(h, w, 3).astype(np.float32)
    after = np.random.randn(h, w, 3).astype(np.float32)
    before[10, 10] = np.nan
    after[20, 20] = np.inf

    result = detector.predict(before=before, after=after, threshold=0.5)

    assert np.all(np.isfinite(result.change_score))
    assert np.all(result.change_score >= 0.0)
    assert np.all(result.change_score <= 1.0)
