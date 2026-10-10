"""
GeoSentinel AI - Change Detection Service.
Orchestrates change detection job execution, raster asset rendering,
ground-truth validation metrics, and job lifecycle management.
"""

from typing import Any, Dict, List, Optional
import os
import uuid
import time
from datetime import datetime, timezone
import numpy as np
from PIL import Image
import cv2

from app.detection.registry import registry
from app.detection.base import DetectionResult
from app.services.imagery_service import ImageryService


class ChangeDetectionService:
    """Manages change detection job dispatch, status, and artifact generation."""

    def __init__(self, root_dir: str, imagery_service: ImageryService):
        self.root_dir = root_dir
        self.imagery_service = imagery_service
        self.jobs_dir = os.path.join(root_dir, "runtime", "jobs")
        os.makedirs(self.jobs_dir, exist_ok=True)

        # In-memory job registry
        self._jobs: Dict[str, Dict[str, Any]] = {}

    def create_and_execute_job(
        self,
        before_image_id: str,
        after_image_id: str,
        method: str = "classical",
        threshold: float = 0.5,
        kernel_size: int = 3,
        min_component_size: int = 25,
        ground_truth_array: Optional[np.ndarray] = None,
    ) -> Dict[str, Any]:
        """
        Dispatches and executes a synchronous change detection job.
        """
        job_id = f"job_{uuid.uuid4().hex[:10]}"
        created_at = datetime.now(timezone.utc).isoformat()

        job_entry: Dict[str, Any] = {
            "job_id": job_id,
            "status": "processing",
            "method": method,
            "created_at": created_at,
            "threshold": threshold,
            "kernel_size": kernel_size,
            "min_component_size": min_component_size,
            "before_image_id": before_image_id,
            "after_image_id": after_image_id,
            "error": None,
            "processing_time_ms": 0.0,
            "outputs": {},
            "stats": {},
            "evaluation": None,
        }
        self._jobs[job_id] = job_entry

        try:
            start_time = time.perf_counter()

            # 1. Retrieve and align raster pair
            before_path = self.imagery_service.get_image_path(before_image_id)
            after_path = self.imagery_service.get_image_path(after_image_id)

            align_res = self.imagery_service.validate_and_align_pair(before_image_id, after_image_id)
            if not align_res["valid"]:
                raise ValueError(f"Raster pair validation failed: {'; '.join(align_res.get('errors', []))}")

            # Read aligned arrays
            from app.geo.alignment import RasterAlignmentService
            align_data = RasterAlignmentService.align_pair(before_path, after_path)

            before_arr = align_data["before_data"]
            after_arr = align_data["after_data"]
            valid_mask = align_data["valid_mask"]

            # 2. Get detector
            detector = registry.get_detector(method)
            if not detector.is_available:
                raise RuntimeError(
                    f"Selected detector '{method}' is not available in the current environment."
                )

            # 3. Run prediction
            det_result: DetectionResult = detector.predict(
                before=before_arr,
                after=after_arr,
                valid_mask=valid_mask,
                threshold=threshold,
                kernel_size=kernel_size,
                min_component_size=min_component_size,
            )

            # 4. Save artifacts
            job_folder = os.path.join(self.jobs_dir, job_id)
            os.makedirs(job_folder, exist_ok=True)

            score_path = os.path.join(job_folder, "change_score.png")
            raw_mask_path = os.path.join(job_folder, "raw_mask.png")
            filtered_mask_path = os.path.join(job_folder, "filtered_mask.png")
            overlay_path = os.path.join(job_folder, "change_overlay.png")

            # A. Change Score Heatmap (0..255 colormapped)
            score_u8 = (det_result.change_score * 255.0).astype(np.uint8)
            heatmap = cv2.applyColorMap(score_u8, cv2.COLORMAP_TURBO)
            cv2.imwrite(score_path, heatmap)

            # B. Raw Binary Mask
            raw_u8 = (det_result.raw_mask.astype(np.uint8)) * 255
            cv2.imwrite(raw_mask_path, raw_u8)

            # C. Filtered Binary Mask
            filtered_u8 = (det_result.filtered_mask.astype(np.uint8)) * 255
            cv2.imwrite(filtered_mask_path, filtered_u8)

            # D. Transparent Orange Overlay (#FF8617) for web display
            h, w = det_result.filtered_mask.shape
            overlay_rgba = np.zeros((h, w, 4), dtype=np.uint8)
            # Orange: R=255, G=134, B=23, Alpha=190
            overlay_rgba[det_result.filtered_mask] = [255, 134, 23, 190]
            Image.fromarray(overlay_rgba, mode="RGBA").save(overlay_path, format="PNG")

            # 5. Polygon Vectorization & Geospatial Telemetry
            meta = self.imagery_service.get_metadata(before_image_id)
            transform_affine = meta.transform if meta.transform else None
            crs_str = meta.crs_wkt or (f"EPSG:{meta.crs_epsg}" if meta.crs_epsg else None)
            is_georeferenced = meta.is_georeferenced

            # Calculate nominal pixel size in meters
            pixel_size_m = 10.0
            crs_code = str(meta.crs_epsg or "").replace("EPSG:", "").strip()
            if crs_code == "4326" or (meta.crs_wkt and "GEOGCS" in meta.crs_wkt and "PROJCS" not in meta.crs_wkt):
                # Geographic CRS (coordinates in degrees)
                if meta.resolution and len(meta.resolution) >= 2:
                    deg_x = abs(float(meta.resolution[0]))
                    # At ~20°N latitude (India), 1 deg lon ~ 104,000m
                    est_m = deg_x * 104000.0
                    pixel_size_m = est_m if 1.0 <= est_m <= 1000.0 else 30.0
                else:
                    pixel_size_m = 30.0
            elif meta.resolution and len(meta.resolution) >= 2:
                res_val = abs(float(meta.resolution[0]))
                if res_val > 0.5:
                    pixel_size_m = res_val

            from app.detection.vectorizer import PolygonVectorizer
            import json

            vector_res = PolygonVectorizer.vectorize_change_mask(
                mask=det_result.filtered_mask,
                change_score=det_result.change_score,
                transform_affine=transform_affine,
                crs_str=crs_str,
                pixel_size_meters=pixel_size_m,
                min_area_m2=50.0,
            )

            geojson_path = os.path.join(job_folder, "features.geojson")
            with open(geojson_path, "w", encoding="utf-8") as f:
                json.dump(vector_res, f, indent=2)

            total_ms = (time.perf_counter() - start_time) * 1000.0

            # 6. Ground truth evaluation (if available)
            eval_metrics = None
            if ground_truth_array is not None and ground_truth_array.shape == det_result.filtered_mask.shape:
                gt_bool = (ground_truth_array > 0)
                pred_bool = det_result.filtered_mask

                tp = int(np.sum(pred_bool & gt_bool))
                fp = int(np.sum(pred_bool & (~gt_bool)))
                fn = int(np.sum((~pred_bool) & gt_bool))
                tn = int(np.sum((~pred_bool) & (~gt_bool)))

                precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
                recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
                iou = float(tp / (tp + fp + fn)) if (tp + fp + fn) > 0 else 0.0
                f1 = float(2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

                eval_metrics = {
                    "true_positives": tp,
                    "false_positives": fp,
                    "false_negatives": fn,
                    "true_negatives": tn,
                    "precision": round(precision, 4),
                    "recall": round(recall, 4),
                    "f1_score": round(f1, 4),
                    "iou": round(iou, 4),
                }

            valid_pixels_count = int(np.sum(valid_mask))
            aoi_area_m2 = float(valid_pixels_count * (pixel_size_m ** 2))
            aoi_area_ha = round(aoi_area_m2 / 10000.0, 2)
            aoi_area_km2 = round(aoi_area_m2 / 1_000_000.0, 3)

            gross_expansion_m2 = float(vector_res["summary"]["total_area_m2"])
            gross_expansion_ha = float(vector_res["summary"]["total_area_ha"])
            gross_expansion_km2 = round(gross_expansion_m2 / 1_000_000.0, 4)
            growth_rate_pct = round((gross_expansion_m2 / aoi_area_m2 * 100.0), 2) if aoi_area_m2 > 0 else 0.0

            # 7. Update job entry
            job_entry.update({
                "status": "completed",
                "is_georeferenced": is_georeferenced,
                "bounds_wgs84": meta.bounds_wgs84.to_dict() if meta.bounds_wgs84 else None,
                "processing_time_ms": round(total_ms, 2),
                "detector_time_ms": det_result.processing_time_ms,
                "outputs": {
                    "change_score_url": f"/api/jobs/{job_id}/images/change_score",
                    "raw_mask_url": f"/api/jobs/{job_id}/images/raw_mask",
                    "filtered_mask_url": f"/api/jobs/{job_id}/images/filtered_mask",
                    "change_overlay_url": f"/api/jobs/{job_id}/images/change_overlay",
                    "results_url": f"/api/jobs/{job_id}/results",
                    "export_url": f"/api/jobs/{job_id}/export",
                    "before_preview_url": f"/api/imagery/{before_image_id}/preview",
                    "after_preview_url": f"/api/imagery/{after_image_id}/preview",
                },
                "stats": {
                    "total_pixels": int(h * w),
                    "valid_pixels": valid_pixels_count,
                    "raw_changed_pixels": det_result.filtering_stats.get("raw_change_pixels", 0),
                    "filtered_changed_pixels": det_result.filtering_stats.get("final_change_pixels", 0),
                    "raw_change_pct": det_result.filtering_stats.get("raw_change_percentage", 0.0),
                    "filtered_change_pct": det_result.filtering_stats.get("final_change_percentage", 0.0),
                    "pixel_size_m": round(pixel_size_m, 2),
                    "aoi_area_ha": aoi_area_ha,
                    "aoi_area_km2": aoi_area_km2,
                    "gross_expansion_m2": gross_expansion_m2,
                    "gross_expansion_ha": gross_expansion_ha,
                    "gross_expansion_km2": gross_expansion_km2,
                    "growth_rate_pct": growth_rate_pct,
                    "components_retained": det_result.filtering_stats.get("components_retained", 0),
                    "components_suppressed": det_result.filtering_stats.get("components_suppressed", 0),
                },
                "geojson": vector_res,
                "summary": {
                    **vector_res["summary"],
                    "aoi_area_ha": aoi_area_ha,
                    "aoi_area_km2": aoi_area_km2,
                    "gross_expansion_km2": gross_expansion_km2,
                    "growth_rate_pct": growth_rate_pct,
                    "confirmed_count": 0,
                    "rejected_count": 0,
                    "unreviewed_count": vector_res["summary"]["total_regions"],
                },
                "filtering_details": det_result.filtering_stats,
                "evaluation": eval_metrics,
            })

            return job_entry

        except Exception as e:
            job_entry["status"] = "failed"
            job_entry["error"] = str(e)
            return job_entry

    def get_job(self, job_id: str) -> Dict[str, Any]:
        """Retrieves job status and metadata."""
        if job_id not in self._jobs:
            raise KeyError(f"Job '{job_id}' not found.")
        return self._jobs[job_id]

    def get_job_results(self, job_id: str) -> Dict[str, Any]:
        """Returns the full vector polygon results and summary for a job."""
        job = self.get_job(job_id)
        if job.get("status") != "completed":
            raise ValueError(f"Job '{job_id}' is not in completed state.")

        return {
            "job_id": job_id,
            "status": job["status"],
            "method": job["method"],
            "is_georeferenced": job.get("is_georeferenced", False),
            "geojson": job.get("geojson", {}),
            "summary": job.get("summary", {}),
            "bounds_wgs84": job.get("bounds_wgs84"),
            "created_at": job["created_at"],
            "processing_time_ms": job.get("processing_time_ms", 0.0),
        }

    def update_region_status(
        self, job_id: str, region_id: str, review_status: str, notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Updates human verification status for a specific detected change polygon."""
        job = self.get_job(job_id)
        geojson = job.get("geojson", {})
        features = geojson.get("features", [])

        found = False
        for feat in features:
            if feat.get("properties", {}).get("region_id") == region_id or feat.get("id") == region_id:
                feat["properties"]["review_status"] = review_status
                if notes is not None:
                    feat["properties"]["notes"] = notes
                found = True
                break

        if not found:
            raise KeyError(f"Region '{region_id}' not found in job '{job_id}'.")

        # Recalculate review counts
        confirmed = sum(1 for f in features if f["properties"].get("review_status") == "confirmed")
        rejected = sum(1 for f in features if f["properties"].get("review_status") == "false_positive")
        unreviewed = sum(1 for f in features if f["properties"].get("review_status") == "unreviewed")

        job["summary"]["confirmed_count"] = confirmed
        job["summary"]["rejected_count"] = rejected
        job["summary"]["unreviewed_count"] = unreviewed

        # Update disk file
        job_folder = os.path.join(self.jobs_dir, job_id)
        geojson_path = os.path.join(job_folder, "features.geojson")
        with open(geojson_path, "w", encoding="utf-8") as f:
            import json
            json.dump(geojson, f, indent=2)

        return {
            "job_id": job_id,
            "region_id": region_id,
            "review_status": review_status,
            "notes": notes,
            "summary": job["summary"],
        }

    def get_job_geojson_path(self, job_id: str) -> str:
        """Returns path to saved GeoJSON file for export."""
        job_folder = os.path.join(self.jobs_dir, job_id)
        path = os.path.join(job_folder, "features.geojson")
        if not os.path.exists(path):
            raise FileNotFoundError(f"GeoJSON export file for job '{job_id}' not found.")
        return path

    def get_job_image_path(self, job_id: str, kind: str) -> str:
        """Retrieves local artifact path for a given job and image kind."""
        job_folder = os.path.join(self.jobs_dir, job_id)
        kind_map = {
            "change_score": "change_score.png",
            "raw_mask": "raw_mask.png",
            "filtered_mask": "filtered_mask.png",
            "change_overlay": "change_overlay.png",
        }

        if kind not in kind_map:
            raise KeyError(f"Unknown image kind '{kind}'. Valid kinds: {list(kind_map.keys())}")

        path = os.path.join(job_folder, kind_map[kind])
        if not os.path.exists(path):
            raise FileNotFoundError(f"Artifact '{kind}' for job '{job_id}' not found.")
        return path

