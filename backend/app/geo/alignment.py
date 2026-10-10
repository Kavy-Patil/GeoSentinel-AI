"""
GeoSentinel AI - Raster Alignment and Spatial Reprojection Service.
Aligns and co-registers bi-temporal satellite rasters onto a shared reference grid
using Rasterio warping and resampling utilities.
"""

from typing import Dict, Optional, Tuple, Any, List
import os
import numpy as np
import rasterio
from rasterio.warp import calculate_default_transform, reproject, Resampling
from rasterio.enums import Resampling as RResampling
from app.geo.raster_validator import RasterValidator, GeoBounds


class AlignmentError(Exception):
    """Raised when two rasters cannot be aligned or co-registered."""
    pass


class RasterAlignmentService:
    """
    Co-registration and grid alignment service for bi-temporal raster pairs.
    Uses T1 (Before) as the reference spatial grid.
    """

    @classmethod
    def align_pair(
        cls,
        before_path: str,
        after_path: str,
        output_dir: Optional[str] = None,
        resampling_method: Resampling = Resampling.bilinear,
    ) -> Dict[str, Any]:
        """
        Aligns the after raster to the before raster's spatial grid (CRS, dimensions, transform).
        Returns aligned numpy arrays, valid pixel mask, and output metadata.
        """
        val_result = RasterValidator.validate_pair(before_path, after_path)
        if not val_result.valid:
            raise AlignmentError(f"Raster pair validation failed: {'; '.join(val_result.errors)}")

        warnings: List[str] = list(val_result.warnings)

        with rasterio.open(before_path) as ref_src:
            ref_meta = ref_src.meta.copy()
            ref_crs = ref_src.crs
            ref_transform = ref_src.transform
            ref_width = ref_src.width
            ref_height = ref_src.height
            ref_count = ref_src.count
            ref_nodata = ref_src.nodata

            before_data = ref_src.read()

        with rasterio.open(after_path) as sec_src:
            sec_count = sec_src.count
            sec_nodata = sec_src.nodata

            if val_result.georeferenced and not val_result.aligned:
                # Reproject and resample after image to match before image grid
                aligned_after = np.zeros(
                    (sec_count, ref_height, ref_width),
                    dtype=sec_src.dtypes[0],
                )

                for band_idx in range(1, sec_count + 1):
                    reproject(
                        source=rasterio.band(sec_src, band_idx),
                        destination=aligned_after[band_idx - 1],
                        src_transform=sec_src.transform,
                        src_crs=sec_src.crs,
                        dst_transform=ref_transform,
                        dst_crs=ref_crs,
                        resampling=resampling_method,
                        dst_nodata=ref_nodata if ref_nodata is not None else sec_nodata,
                    )
                warnings.append(
                    f"After image reprojected from {sec_src.crs} to {ref_crs} using {resampling_method.name} resampling."
                )
            elif not val_result.georeferenced and (sec_src.width != ref_width or sec_src.height != ref_height):
                # Non-georeferenced resizing (e.g. pixel-space test fixtures)
                from PIL import Image
                aligned_after = np.zeros((sec_count, ref_height, ref_width), dtype=sec_src.dtypes[0])
                for b in range(sec_count):
                    band_img = Image.fromarray(sec_src.read(b + 1))
                    resized = band_img.resize((ref_width, ref_height), Image.Resampling.BILINEAR)
                    aligned_after[b] = np.array(resized)
                warnings.append(
                    f"Pixel dimensions resized from {sec_src.width}x{sec_src.height} to {ref_width}x{ref_height} in image space."
                )
            else:
                aligned_after = sec_src.read()

        # Compute valid pixel mask where both before and after contain non-nodata pixels
        mask_before = np.ones((ref_height, ref_width), dtype=bool)
        mask_after = np.ones((ref_height, ref_width), dtype=bool)

        if ref_nodata is not None:
            mask_before = ~np.any(before_data == ref_nodata, axis=0)

        if sec_nodata is not None:
            mask_after = ~np.any(aligned_after == sec_nodata, axis=0)

        valid_mask = mask_before & mask_after
        valid_pixel_pct = float((np.sum(valid_mask) / (ref_height * ref_width)) * 100.0)

        if valid_pixel_pct < 5.0:
            warnings.append(
                f"Low valid overlap: Only {valid_pixel_pct:.1f}% of pixels contain valid observation data in both rasters."
            )

        aligned_after_path = None
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
            aligned_after_path = os.path.join(output_dir, "after_aligned.tif")
            out_meta = ref_meta.copy()
            out_meta.update({
                "count": sec_count,
                "dtype": aligned_after.dtype,
                "nodata": ref_nodata,
            })
            with rasterio.open(aligned_after_path, "w", **out_meta) as dst:
                dst.write(aligned_after)

        return {
            "aligned": True,
            "georeferenced": val_result.georeferenced,
            "source_crs": val_result.source_crs,
            "width": ref_width,
            "height": ref_height,
            "before_bands": ref_count,
            "after_bands": sec_count,
            "valid_pixel_pct": round(valid_pixel_pct, 2),
            "overlap_bounds_wgs84": val_result.overlap_wgs84,
            "before_data": before_data,
            "after_data": aligned_after,
            "valid_mask": valid_mask,
            "aligned_after_path": aligned_after_path,
            "warnings": warnings,
        }
