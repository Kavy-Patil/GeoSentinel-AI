"""
GeoSentinel AI - Tiled Patch Inference Utility.
Enables change detection inference over large rasters by decomposing imagery
into overlapping patches, processing individual tiles, and seamlessly reassembling the score map.
"""

from typing import Callable, Optional, Tuple, Any
import numpy as np


class TiledInferenceManager:
    """
    Decomposes large raster arrays into overlapping tiles and reconstructs the composite prediction map.
    """

    @staticmethod
    def run_tiled_prediction(
        before: np.ndarray,
        after: np.ndarray,
        predict_fn: Callable[[np.ndarray, np.ndarray], np.ndarray],
        patch_size: int = 512,
        overlap: int = 64,
    ) -> np.ndarray:
        """
        Executes predict_fn over overlapping patches and blends scores using linear ramp weighting.

        Args:
            before: (H, W, C) or (H, W) array.
            after: (H, W, C) or (H, W) array.
            predict_fn: Function accepting (patch_before, patch_after) -> 2D (patch_H, patch_W) score map.
            patch_size: Square tile dimension (e.g. 256, 512).
            overlap: Overlap margin in pixels between adjacent patches.

        Returns:
            2D float32 array (H, W) of blended change scores in [0.0, 1.0].
        """
        h, w = before.shape[:2]

        if h <= patch_size and w <= patch_size:
            # Entire image fits in single patch
            return predict_fn(before, after)

        stride = patch_size - overlap
        if stride <= 0:
            stride = patch_size // 2

        # Accumulator for blended change scores and tile weights
        score_acc = np.zeros((h, w), dtype=np.float32)
        weight_acc = np.zeros((h, w), dtype=np.float32)

        # 2D linear blending window
        win_1d = np.ones(patch_size, dtype=np.float32)
        if overlap > 0:
            ramp = np.linspace(0.1, 1.0, overlap, dtype=np.float32)
            win_1d[:overlap] = ramp
            win_1d[-overlap:] = ramp[::-1]
        weight_window = np.outer(win_1d, win_1d)

        y_starts = list(range(0, h - patch_size + 1, stride))
        if len(y_starts) == 0 or y_starts[-1] + patch_size < h:
            y_starts.append(max(0, h - patch_size))

        x_starts = list(range(0, w - patch_size + 1, stride))
        if len(x_starts) == 0 or x_starts[-1] + patch_size < w:
            x_starts.append(max(0, w - patch_size))

        # Remove duplicate start points
        y_starts = sorted(list(set(y_starts)))
        x_starts = sorted(list(set(x_starts)))

        for y0 in y_starts:
            y1 = min(h, y0 + patch_size)
            tile_h = y1 - y0

            for x0 in x_starts:
                x1 = min(w, x0 + patch_size)
                tile_w = x1 - x0

                patch_before = before[y0:y1, x0:x1]
                patch_after = after[y0:y1, x0:x1]

                # Run inference on patch
                tile_score = predict_fn(patch_before, patch_after)

                # Trim weight window if tile is near edge
                w_tile = weight_window[:tile_h, :tile_w]

                score_acc[y0:y1, x0:x1] += tile_score * w_tile
                weight_acc[y0:y1, x0:x1] += w_tile

        # Normalize by accumulated weights
        safe_weight = np.where(weight_acc > 0, weight_acc, 1.0)
        reconstructed = score_acc / safe_weight

        return np.clip(reconstructed.astype(np.float32), 0.0, 1.0)
