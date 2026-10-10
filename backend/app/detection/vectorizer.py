"""
GeoSentinel AI - Polygon Vectorization, Boundary Smoothing & Geospatial Development Analytics.
Converts filtered binary change masks into georeferenced GeoJSON vector polygons with smoothed boundaries,
true ground area calculation (m², ha, km²), severity classification, and spatial centroid telemetry.
"""

from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import rasterio
from rasterio.features import shapes
import shapely
from shapely.geometry import shape, mapping, Polygon, MultiPolygon
from shapely.ops import transform
import pyproj

from app.schemas import RegionSeverity, RegionPriority, ReviewStatus


class PolygonVectorizer:
    """Converts 2D binary change masks into validated, smoothed GeoJSON polygon features."""

    @staticmethod
    def vectorize_change_mask(
        mask: np.ndarray,
        change_score: Optional[np.ndarray] = None,
        transform_affine: Optional[List[float]] = None,
        crs_str: Optional[str] = None,
        pixel_size_meters: float = 10.0,
        min_area_m2: float = 100.0,
        simplification_tolerance: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Vectorizes filtered change mask into smoothed GeoJSON FeatureCollection.

        Args:
            mask: 2D numpy boolean or uint8 mask (H, W) where True/1 = change.
            change_score: 2D float array (H, W) in range [0, 1].
            transform_affine: 6-element list [a, b, c, d, e, f] or Affine object.
            crs_str: Source CRS (e.g. 'EPSG:32643' or 'EPSG:4326').
            pixel_size_meters: Nominal resolution if native projection is non-metric.
            min_area_m2: Minimum polygon area threshold to retain (filters out tiny specks).
            simplification_tolerance: Tolerance for Douglas-Peucker boundary smoothing.

        Returns:
            GeoJSON FeatureCollection dict with development metrics and summary stats.
        """
        empty_summary = {
            "total_regions": 0,
            "total_area_m2": 0.0,
            "total_area_ha": 0.0,
            "total_area_km2": 0.0,
            "largest_region_area_m2": 0.0,
            "average_region_area_m2": 0.0,
            "critical_count": 0,
            "high_count": 0,
            "medium_count": 0,
            "low_count": 0,
            "confirmed_count": 0,
            "rejected_count": 0,
            "unreviewed_count": 0,
        }

        if mask is None or np.sum(mask) == 0:
            return {
                "type": "FeatureCollection",
                "features": [],
                "summary": empty_summary,
            }

        mask_u8 = (mask > 0).astype(np.uint8)
        h, w = mask_u8.shape

        # Build Affine transform
        if transform_affine and len(transform_affine) >= 6:
            aff = rasterio.Affine(*transform_affine[:6])
        else:
            aff = rasterio.Affine.identity()

        # Coordinate transformer to EPSG:4326 (WGS84 lon/lat) if georeferenced
        to_wgs84 = None
        native_is_projected = False
        is_geographic = False

        if crs_str:
            try:
                src_crs = pyproj.CRS.from_user_input(crs_str)
                dst_crs = pyproj.CRS.from_epsg(4326)
                native_is_projected = src_crs.is_projected
                is_geographic = src_crs.is_geographic

                if src_crs != dst_crs:
                    proj = pyproj.Transformer.from_crs(src_crs, dst_crs, always_xy=True)
                    to_wgs84 = proj.transform
            except Exception:
                to_wgs84 = None

        # Determine sensible simplification tolerance for boundary smoothing
        if simplification_tolerance is None:
            if is_geographic:
                simplification_tolerance = 0.00008  # Approx 8-9m in degrees
            elif native_is_projected:
                simplification_tolerance = 2.0  # 2 meters in projected space
            else:
                simplification_tolerance = 0.5  # 0.5 pixel in pixel-space

        features: List[Dict[str, Any]] = []
        total_area = 0.0
        region_areas: List[float] = []

        severity_counts = {
            RegionSeverity.CRITICAL.value: 0,
            RegionSeverity.HIGH.value: 0,
            RegionSeverity.MEDIUM.value: 0,
            RegionSeverity.LOW.value: 0,
        }

        # Extract polygon shapes using rasterio
        raw_shapes = shapes(mask_u8, mask=mask_u8, transform=aff)

        region_idx = 1
        for geom_dict, val in raw_shapes:
            if val != 1:
                continue

            try:
                geom = shape(geom_dict)
                if not geom.is_valid:
                    geom = geom.buffer(0)
                if geom.is_empty:
                    continue

                # Apply boundary smoothing (Douglas-Peucker simplification)
                if simplification_tolerance > 0:
                    smoothed_geom = geom.simplify(simplification_tolerance, preserve_topology=True)
                    if smoothed_geom.is_valid and not smoothed_geom.is_empty:
                        geom = smoothed_geom

                # Calculate real ground area in m²
                if native_is_projected:
                    area_m2 = float(geom.area)
                else:
                    # Non-metric or pixel space
                    pixel_count = float(geom.area) / (aff.a * abs(aff.e)) if (aff.a != 1.0 and aff.e != 1.0) else float(geom.area)
                    area_m2 = pixel_count * (pixel_size_meters ** 2)

                # Filter out small specks below minimum area
                if area_m2 < min_area_m2:
                    continue

                # Compute magnitude within polygon
                magnitude = 0.5
                if change_score is not None:
                    minx, miny, maxx, maxy = geom.bounds
                    inv_aff = ~aff
                    px_min, py_max = inv_aff * (minx, miny) if hasattr(inv_aff, "__mul__") else (0, 0)
                    px_max, py_min = inv_aff * (maxx, maxy) if hasattr(inv_aff, "__mul__") else (w, h)

                    c_px_min = max(0, min(w - 1, int(min(px_min, px_max))))
                    c_px_max = max(0, min(w, int(max(px_min, px_max)) + 1))
                    c_py_min = max(0, min(h - 1, int(min(py_min, py_max))))
                    c_py_max = max(0, min(h, int(max(py_min, py_max)) + 1))

                    sub_score = change_score[c_py_min:c_py_max, c_px_min:c_px_max]
                    if sub_score.size > 0:
                        magnitude = float(np.mean(sub_score))

                # Reproject geometry to WGS84 lon/lat if transform exists
                wgs_geom = geom
                if to_wgs84 is not None:
                    wgs_geom = transform(to_wgs84, geom)

                centroid = wgs_geom.centroid
                centroid_lon = float(centroid.x)
                centroid_lat = float(centroid.y)

                # Assign Severity & Priority
                if area_m2 >= 10000 or magnitude >= 0.80:
                    sev = RegionSeverity.CRITICAL.value
                    prio = RegionPriority.URGENT.value
                    dev_label = "Major Development Cluster"
                elif area_m2 >= 3000 or magnitude >= 0.65:
                    sev = RegionSeverity.HIGH.value
                    prio = RegionPriority.HIGH.value
                    dev_label = "Substantial Urban Construction"
                elif area_m2 >= 800 or magnitude >= 0.40:
                    sev = RegionSeverity.MEDIUM.value
                    prio = RegionPriority.MEDIUM.value
                    dev_label = "Moderate Built-Up Expansion"
                else:
                    sev = RegionSeverity.LOW.value
                    prio = RegionPriority.LOW.value
                    dev_label = "Localized Expansion"

                severity_counts[sev] += 1
                total_area += area_m2
                region_areas.append(area_m2)

                region_id = f"dev_{region_idx:03d}"
                region_idx += 1

                feature = {
                    "type": "Feature",
                    "id": region_id,
                    "geometry": mapping(wgs_geom),
                    "properties": {
                        "region_id": region_id,
                        "area_m2": round(area_m2, 2),
                        "area_ha": round(area_m2 / 10000.0, 3),
                        "area_km2": round(area_m2 / 1000000.0, 4),
                        "magnitude": round(magnitude, 3),
                        "severity": sev,
                        "priority": prio,
                        "development_label": dev_label,
                        "confidence": round(min(1.0, magnitude * 1.15), 2),
                        "review_status": ReviewStatus.UNREVIEWED.value,
                        "centroid_lon": round(centroid_lon, 6),
                        "centroid_lat": round(centroid_lat, 6),
                    },
                }
                features.append(feature)

            except Exception:
                continue

        # Sort features by area descending so largest development areas are first
        features.sort(key=lambda f: f["properties"]["area_m2"], reverse=True)

        # Summary statistics
        largest_area = max(region_areas) if region_areas else 0.0
        avg_area = (total_area / len(region_areas)) if region_areas else 0.0

        summary = {
            "total_regions": len(features),
            "total_area_m2": round(total_area, 2),
            "total_area_ha": round(total_area / 10000.0, 3),
            "total_area_km2": round(total_area / 1000000.0, 4),
            "largest_region_area_m2": round(largest_area, 2),
            "average_region_area_m2": round(avg_area, 2),
            "critical_count": severity_counts[RegionSeverity.CRITICAL.value],
            "high_count": severity_counts[RegionSeverity.HIGH.value],
            "medium_count": severity_counts[RegionSeverity.MEDIUM.value],
            "low_count": severity_counts[RegionSeverity.LOW.value],
            "confirmed_count": 0,
            "rejected_count": 0,
            "unreviewed_count": len(features),
        }

        return {
            "type": "FeatureCollection",
            "features": features,
            "summary": summary,
        }
