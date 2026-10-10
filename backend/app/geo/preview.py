"""
GeoSentinel AI - Imagery Preview Generator and Radiometric Normalizer.
Converts multi-band raw satellite rasters (float32, uint16, int16, uint8)
into high-contrast 8-bit web PNG previews with percentile stretching.
"""

from typing import Optional, Tuple, Union
import os
import numpy as np
import rasterio
from PIL import Image


class PreviewGenerator:
    """Generates 8-bit display previews from GeoTIFF rasters and numpy arrays."""

    @staticmethod
    def normalize_band_8bit(
        band: np.ndarray,
        p_min: float = 2.0,
        p_max: float = 98.0,
        nodata: Optional[float] = None,
    ) -> np.ndarray:
        """
        Performs robust 2%-98% percentile min-max stretch on a single channel,
        masking out nodata and NaN/Inf values.
        """
        valid_mask = np.isfinite(band)
        if nodata is not None:
            valid_mask &= (band != nodata)

        if not np.any(valid_mask):
            return np.zeros(band.shape, dtype=np.uint8)

        valid_vals = band[valid_mask]
        v_min = float(np.percentile(valid_vals, p_min))
        v_max = float(np.percentile(valid_vals, p_max))

        if v_max <= v_min:
            v_min = float(np.min(valid_vals))
            v_max = float(np.max(valid_vals))

        if v_max <= v_min:
            # Uniform image
            scaled = np.zeros(band.shape, dtype=np.uint8)
            scaled[valid_mask] = 128
            return scaled

        stretched = (band - v_min) / (v_max - v_min)
        stretched = np.clip(stretched, 0.0, 1.0) * 255.0
        stretched[~valid_mask] = 0

        return stretched.astype(np.uint8)

    @classmethod
    def generate_preview_from_array(
        cls,
        data: np.ndarray,
        nodata: Optional[float] = None,
        band_indices: Optional[Tuple[int, int, int]] = None,
    ) -> Image.Image:
        """
        Converts a (C, H, W) or (H, W) numpy array to a PIL RGB Image.
        """
        if data.ndim == 2:
            # Single band grayscale -> RGB
            b8 = cls.normalize_band_8bit(data, nodata=nodata)
            rgb = np.stack([b8, b8, b8], axis=-1)
            return Image.fromarray(rgb, mode="RGB")

        bands = data.shape[0]

        if bands == 1:
            b8 = cls.normalize_band_8bit(data[0], nodata=nodata)
            rgb = np.stack([b8, b8, b8], axis=-1)
            return Image.fromarray(rgb, mode="RGB")

        if bands == 2:
            b1 = cls.normalize_band_8bit(data[0], nodata=nodata)
            b2 = cls.normalize_band_8bit(data[1], nodata=nodata)
            rgb = np.stack([b1, b2, b1], axis=-1)
            return Image.fromarray(rgb, mode="RGB")

        # Multi-band (>=3): Select 3 bands for true color preview
        if band_indices and len(band_indices) == 3:
            r_idx, g_idx, b_idx = band_indices
        else:
            # Default RGB channels (bands 0, 1, 2)
            r_idx, g_idx, b_idx = 0, 1, 2

        r8 = cls.normalize_band_8bit(data[r_idx], nodata=nodata)
        g8 = cls.normalize_band_8bit(data[g_idx], nodata=nodata)
        b8 = cls.normalize_band_8bit(data[b_idx], nodata=nodata)

        rgb = np.stack([r8, g8, b8], axis=-1)
        return Image.fromarray(rgb, mode="RGB")

    @classmethod
    def generate_preview_from_file(
        cls,
        filepath: str,
        output_png_path: Optional[str] = None,
        max_dimension: Optional[int] = 2048,
    ) -> Tuple[Image.Image, str]:
        """
        Reads a raster file, normalizes it, and saves an 8-bit web-ready PNG preview.
        """
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"File not found: {filepath}")

        with rasterio.open(filepath) as src:
            nodata = src.nodata
            # If raster is very large, decimate during read for fast preview
            if max_dimension and (src.width > max_dimension or src.height > max_dimension):
                scale = max(src.width / max_dimension, src.height / max_dimension)
                out_shape = (src.count, int(src.height / scale), int(src.width / scale))
                data = src.read(out_shape=out_shape, resampling=rasterio.enums.Resampling.bilinear)
            else:
                data = src.read()

        img = cls.generate_preview_from_array(data, nodata=nodata)

        if output_png_path:
            os.makedirs(os.path.dirname(output_png_path), exist_ok=True)
            img.save(output_png_path, format="PNG", optimize=True)
            return img, output_png_path

        return img, ""
