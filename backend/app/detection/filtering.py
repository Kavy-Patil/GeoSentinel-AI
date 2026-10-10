"""
GeoSentinel AI - False-Positive Reduction, Hole Filling & Morphological Filtering Module.
Applies mathematical morphology, binary hole-filling, and connected-component analysis to filter
sensor noise, isolated single pixels, and registration artifacts from raw change masks.
"""

from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import cv2


class MaskFilter:
    """
    Morphological, topological, and hole-filling filter for satellite change masks.
    Removes salt-and-pepper noise and solidifies meaningful urban development footprints.
    """

    @staticmethod
    def apply_filters(
        raw_mask: np.ndarray,
        valid_mask: Optional[np.ndarray] = None,
        kernel_size: int = 3,
        min_component_size: int = 25,
        connectivity: int = 8,
        fill_holes: bool = True,
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Applies morphological opening, closing, hole-filling, and minimum connected-component filtering.

        Args:
            raw_mask: 2D boolean array (H, W) representing raw thresholded detections.
            valid_mask: 2D boolean array (H, W) representing valid observation pixels.
            kernel_size: Size of structuring element (e.g. 3, 5, 7).
            min_component_size: Minimum pixel area required to retain a connected change component.
            connectivity: 4 or 8 neighborhood connectivity for connected components.
            fill_holes: Whether to solid-fill internal pinholes inside detected development clusters.

        Returns:
            Tuple of (filtered_mask, filtering_statistics)
        """
        if raw_mask.ndim != 2:
            raise ValueError(f"raw_mask must be a 2D array, got shape {raw_mask.shape}")

        height, width = raw_mask.shape
        raw_pixels = int(np.sum(raw_mask))

        # 1. Enforce valid observation mask
        effective_raw = raw_mask.copy()
        invalid_pixels_removed = 0
        if valid_mask is not None:
            if valid_mask.shape != raw_mask.shape:
                raise ValueError(f"valid_mask shape {valid_mask.shape} does not match raw_mask shape {raw_mask.shape}")
            invalid_region = effective_raw & (~valid_mask)
            invalid_pixels_removed = int(np.sum(invalid_region))
            effective_raw &= valid_mask

        # 2. Morphological Structuring Element (Ellipse / Rectangle)
        kernel_size = max(1, kernel_size)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_size, kernel_size))

        # Convert to uint8 for OpenCV operations
        mask_u8 = (effective_raw > 0).astype(np.uint8)

        # 3. Morphological Opening (Aggressively eliminates isolated 1-2 pixel noise specks)
        opened = cv2.morphologyEx(mask_u8, cv2.MORPH_OPEN, kernel, iterations=1)
        morph_removed_pixels = int(np.sum((mask_u8 > 0) & (opened == 0)))

        # 4. Morphological Closing (Bridges small gaps between nearby building fragments)
        closed = cv2.morphologyEx(opened, cv2.MORPH_CLOSE, kernel, iterations=1)

        # 5. Binary Hole Filling (Solidifies development polygons by filling interior voids)
        if fill_holes:
            # Flood fill from border
            h_pad, w_pad = height + 2, width + 2
            flood_mask = np.zeros((h_pad, w_pad), np.uint8)
            im_floodfill = closed.copy()
            cv2.floodFill(im_floodfill, flood_mask, (0, 0), 255)
            # Invert floodfilled image to obtain holes
            im_floodfill_inv = cv2.bitwise_not(im_floodfill)
            # Combine original with filled holes
            filled = closed | (im_floodfill_inv > 0).astype(np.uint8)
        else:
            filled = closed

        # Re-enforce valid mask after closing/hole-filling
        if valid_mask is not None:
            filled &= valid_mask.astype(np.uint8)

        # 6. Connected Component Analysis (Filter small pixel clusters below min_component_size)
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
            filled, connectivity=connectivity
        )

        filtered_u8 = np.zeros_like(filled)
        rejection_log: List[Dict[str, Any]] = []
        kept_components = 0
        removed_components = 0
        small_component_pixels_removed = 0

        for label_idx in range(1, num_labels):
            area = int(stats[label_idx, cv2.CC_STAT_AREA])
            centroid_x = float(centroids[label_idx, 0])
            centroid_y = float(centroids[label_idx, 1])

            if area < min_component_size:
                removed_components += 1
                small_component_pixels_removed += area
                if len(rejection_log) < 20:
                    rejection_log.append({
                        "component_id": label_idx,
                        "area_pixels": area,
                        "centroid_px": (round(centroid_x, 1), round(centroid_y, 1)),
                        "reason": "below_minimum_pixel_area",
                        "threshold_applied": min_component_size,
                    })
            else:
                kept_components += 1
                filtered_u8[labels == label_idx] = 1

        filtered_mask = filtered_u8.astype(bool)
        final_change_pixels = int(np.sum(filtered_mask))

        stats_summary: Dict[str, Any] = {
            "raw_change_pixels": raw_pixels,
            "final_change_pixels": final_change_pixels,
            "raw_change_percentage": round((raw_pixels / (height * width)) * 100.0, 3) if height * width > 0 else 0.0,
            "final_change_percentage": round((final_change_pixels / (height * width)) * 100.0, 3) if height * width > 0 else 0.0,
            "kernel_size": kernel_size,
            "min_component_size": min_component_size,
            "connectivity": connectivity,
            "components_analyzed": max(0, num_labels - 1),
            "components_retained": kept_components,
            "components_suppressed": removed_components,
            "pixels_removed_by_invalid_mask": invalid_pixels_removed,
            "pixels_removed_by_morphology": morph_removed_pixels,
            "pixels_removed_by_min_area": small_component_pixels_removed,
            "sample_rejections": rejection_log,
        }

        return filtered_mask, stats_summary
