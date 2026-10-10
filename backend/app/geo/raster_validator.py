"""
GeoSentinel AI - Raster Validation & Spatial Metadata Extraction Service.
Inspects raster datasets, validates CRS, affine transforms, bounds, resolutions,
and checks spatial co-registration between bi-temporal imagery pairs.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
import os
import rasterio
from rasterio.warp import transform_bounds
from rasterio.crs import CRS
import numpy as np


@dataclass
class GeoBounds:
    min_lon: float
    min_lat: float
    max_lon: float
    max_lat: float

    def to_dict(self) -> Dict[str, float]:
        return {
            "min_lon": self.min_lon,
            "min_lat": self.min_lat,
            "max_lon": self.max_lon,
            "max_lat": self.max_lat,
        }

    def to_leaflet_bounds(self) -> List[List[float]]:
        """Returns [[min_lat, min_lon], [max_lat, max_lon]] for Leaflet."""
        return [[self.min_lat, self.min_lon], [self.max_lat, self.max_lon]]


@dataclass
class RasterMetadata:
    filename: str
    width: int
    height: int
    count: int
    dtypes: List[str]
    crs_epsg: Optional[str]
    crs_wkt: Optional[str]
    is_georeferenced: bool
    transform: List[float]
    resolution: Tuple[float, float]
    bounds_native: Optional[List[float]]
    bounds_wgs84: Optional[GeoBounds]
    nodata: Optional[float]
    driver: str


@dataclass
class ValidationResult:
    valid: bool
    georeferenced: bool
    aligned: bool
    source_crs: Optional[str]
    width: int
    height: int
    bands: int
    before_metadata: Optional[RasterMetadata]
    after_metadata: Optional[RasterMetadata]
    overlap_wgs84: Optional[GeoBounds]
    valid_pixel_pct: float
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)


class RasterValidator:
    """Validator for single rasters and bi-temporal raster pairs."""

    @staticmethod
    def inspect_raster(filepath: str) -> RasterMetadata:
        """
        Extracts comprehensive spatial and structural metadata from a raster file.
        Does not fabricate CRS or geographic coordinates if none exist.
        """
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Raster file not found: {filepath}")

        with rasterio.open(filepath) as src:
            is_georeferenced = bool(src.crs and not src.transform.is_identity)
            
            crs_epsg = None
            crs_wkt = None
            bounds_native = None
            bounds_wgs84 = None

            if src.crs:
                try:
                    if src.crs.is_epsg_code:
                        crs_epsg = f"EPSG:{src.crs.to_epsg()}"
                    else:
                        crs_epsg = str(src.crs)
                    crs_wkt = src.crs.to_wkt()
                except Exception:
                    crs_epsg = str(src.crs)

            if is_georeferenced:
                b = src.bounds
                bounds_native = [b.left, b.bottom, b.right, b.top]
                try:
                    # Convert native bounds to WGS84 (EPSG:4326)
                    wgs84_bounds = transform_bounds(src.crs, "EPSG:4326", b.left, b.bottom, b.right, b.top)
                    bounds_wgs84 = GeoBounds(
                        min_lon=float(wgs84_bounds[0]),
                        min_lat=float(wgs84_bounds[1]),
                        max_lon=float(wgs84_bounds[2]),
                        max_lat=float(wgs84_bounds[3]),
                    )
                except Exception:
                    # If bounds transformation fails, leave bounds_wgs84 as None
                    bounds_wgs84 = None

            res_x, res_y = src.res if hasattr(src, "res") else (abs(src.transform.a), abs(src.transform.e))

            return RasterMetadata(
                filename=os.path.basename(filepath),
                width=src.width,
                height=src.height,
                count=src.count,
                dtypes=[str(dtype) for dtype in src.dtypes],
                crs_epsg=crs_epsg,
                crs_wkt=crs_wkt,
                is_georeferenced=is_georeferenced,
                transform=list(src.transform)[:6],
                resolution=(float(res_x), float(res_y)),
                bounds_native=bounds_native,
                bounds_wgs84=bounds_wgs84,
                nodata=float(src.nodata) if src.nodata is not None else None,
                driver=src.driver,
            )

    @classmethod
    def validate_pair(cls, before_path: str, after_path: str) -> ValidationResult:
        """
        Validates a pair of bi-temporal rasters for change detection compatibility.
        """
        warnings = []
        errors = []

        try:
            meta_before = cls.inspect_raster(before_path)
        except Exception as e:
            return ValidationResult(
                valid=False,
                georeferenced=False,
                aligned=False,
                source_crs=None,
                width=0,
                height=0,
                bands=0,
                before_metadata=None,
                after_metadata=None,
                overlap_wgs84=None,
                valid_pixel_pct=0.0,
                errors=[f"Failed to read Before raster: {str(e)}"],
            )

        try:
            meta_after = cls.inspect_raster(after_path)
        except Exception as e:
            return ValidationResult(
                valid=False,
                georeferenced=False,
                aligned=False,
                source_crs=meta_before.crs_epsg,
                width=meta_before.width,
                height=meta_before.height,
                bands=meta_before.count,
                before_metadata=meta_before,
                after_metadata=None,
                overlap_wgs84=None,
                valid_pixel_pct=0.0,
                errors=[f"Failed to read After raster: {str(e)}"],
            )

        # Check georeferencing compatibility
        both_georeferenced = meta_before.is_georeferenced and meta_after.is_georeferenced
        one_georeferenced = meta_before.is_georeferenced != meta_after.is_georeferenced

        if one_georeferenced:
            warnings.append(
                "Georeferencing mismatch: One image is georeferenced while the other is in pixel space. Fallback to pixel space."
            )

        georeferenced = both_georeferenced
        aligned = True
        overlap_wgs84 = None

        if georeferenced:
            # Check CRS alignment
            if meta_before.crs_epsg != meta_after.crs_epsg:
                warnings.append(
                    f"CRS mismatch: Before is {meta_before.crs_epsg}, After is {meta_after.crs_epsg}. Reprojection to Before CRS will be applied."
                )
                aligned = False

            # Check geographic footprint overlap in WGS84
            if meta_before.bounds_wgs84 and meta_after.bounds_wgs84:
                b1 = meta_before.bounds_wgs84
                b2 = meta_after.bounds_wgs84

                min_lon = max(b1.min_lon, b2.min_lon)
                max_lon = min(b1.max_lon, b2.max_lon)
                min_lat = max(b1.min_lat, b2.min_lat)
                max_lat = min(b1.max_lat, b2.max_lat)

                if min_lon < max_lon and min_lat < max_lat:
                    overlap_wgs84 = GeoBounds(
                        min_lon=min_lon,
                        min_lat=min_lat,
                        max_lon=max_lon,
                        max_lat=max_lat,
                    )
                else:
                    errors.append("Rasters do not overlap geographically. Cannot perform change detection.")
                    return ValidationResult(
                        valid=False,
                        georeferenced=True,
                        aligned=False,
                        source_crs=meta_before.crs_epsg,
                        width=meta_before.width,
                        height=meta_before.height,
                        bands=meta_before.count,
                        before_metadata=meta_before,
                        after_metadata=meta_after,
                        overlap_wgs84=None,
                        valid_pixel_pct=0.0,
                        warnings=warnings,
                        errors=errors,
                    )
            else:
                overlap_wgs84 = meta_before.bounds_wgs84

            # Check transform and pixel resolution
            if meta_before.transform != meta_after.transform or (meta_before.width != meta_after.width or meta_before.height != meta_after.height):
                aligned = False
                warnings.append("Pixel dimensions or affine grid differ. Resampling to reference grid required.")
        else:
            # Non-georeferenced pair (e.g. LEVIR-CD benchmark)
            if (meta_before.width != meta_after.width) or (meta_before.height != meta_after.height):
                warnings.append(
                    f"Image dimension mismatch: Before is {meta_before.width}x{meta_before.height}, After is {meta_after.width}x{meta_after.height}."
                )
                aligned = False

        # Band count comparison
        if meta_before.count != meta_after.count:
            warnings.append(
                f"Band count difference: Before has {meta_before.count} bands, After has {meta_after.count} bands."
            )

        return ValidationResult(
            valid=len(errors) == 0,
            georeferenced=georeferenced,
            aligned=aligned,
            source_crs=meta_before.crs_epsg if georeferenced else None,
            width=meta_before.width,
            height=meta_before.height,
            bands=meta_before.count,
            before_metadata=meta_before,
            after_metadata=meta_after,
            overlap_wgs84=overlap_wgs84 or (meta_before.bounds_wgs84 if georeferenced else None),
            valid_pixel_pct=100.0,
            warnings=warnings,
            errors=errors,
        )
