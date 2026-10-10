"""
Unit tests for tiled patch-based inference and score reconstruction.
"""

import numpy as np
from app.detection.tiling import TiledInferenceManager


def test_tiled_prediction_reconstruction():
    """Test that a large image is properly tiled, processed, and reconstructed."""
    h, w = 600, 700
    before = np.ones((h, w, 3), dtype=np.uint8) * 50
    after = before.copy()

    # Add change square in after image
    after[200:300, 300:400, :] = 200

    def mock_predict(b_patch, a_patch):
        # Mock patch detector computing normalized absolute diff
        diff = np.mean(np.abs(a_patch.astype(np.float32) - b_patch.astype(np.float32)), axis=-1) / 255.0
        return diff

    result_score = TiledInferenceManager.run_tiled_prediction(
        before=before,
        after=after,
        predict_fn=mock_predict,
        patch_size=256,
        overlap=32,
    )

    assert result_score.shape == (h, w)
    assert np.all(np.isfinite(result_score))
    # In the change patch
    assert result_score[250, 350] > 0.5
    # Outside the change patch
    assert result_score[50, 50] < 0.05
