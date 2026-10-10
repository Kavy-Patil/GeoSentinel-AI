"""
GeoSentinel AI - Imagery Management Service.
Handles safe upload staging, unique image registration, validation,
preview generation, and spatial metadata queries.
"""

from typing import Dict, Optional, Tuple, Any, List
import os
import uuid
import shutil
from fastapi import UploadFile, HTTPException, status
from app.geo.raster_validator import RasterValidator, RasterMetadata, ValidationResult, GeoBounds
from app.geo.preview import PreviewGenerator
from app.geo.alignment import RasterAlignmentService
from app.datasets.manifest import DatasetManifest


class ImageryService:
    """Service for managing raster assets, preview generation, and bi-temporal validation."""

    def __init__(self, root_dir: str):
        self.root_dir = root_dir
        self.data_dir = os.path.join(root_dir, "data")
        self.runtime_dir = os.path.join(root_dir, "runtime")
        self.uploads_dir = os.path.join(self.runtime_dir, "uploads")
        self.previews_dir = os.path.join(self.runtime_dir, "previews")
        self.aligned_dir = os.path.join(self.runtime_dir, "aligned")

        os.makedirs(self.uploads_dir, exist_ok=True)
        os.makedirs(self.previews_dir, exist_ok=True)
        os.makedirs(self.aligned_dir, exist_ok=True)

        self.manifest = DatasetManifest(self.data_dir)
        # In-memory registry mapping image_id -> filepath
        self._image_registry: Dict[str, str] = {}
        # Mapping image_id -> preview_path
        self._preview_registry: Dict[str, str] = {}
        # Mapping pair_id -> validation dict
        self._validation_cache: Dict[str, Dict[str, Any]] = {}

    async def stage_upload(self, file: UploadFile) -> str:
        """
        Saves an uploaded raster file into safe temporary runtime storage.
        Assigns a unique image ID.
        """
        image_id = f"img_{uuid.uuid4().hex[:12]}"
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in [".tif", ".tiff", ".png", ".jpg", ".jpeg"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format '{ext}'. Supported formats: .tif, .tiff, .png, .jpg, .jpeg",
            )

        destination_path = os.path.join(self.uploads_dir, f"{image_id}{ext}")
        
        try:
            with open(destination_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to stage uploaded file: {str(e)}",
            )

        self._image_registry[image_id] = destination_path
        return image_id

    def register_file(self, filepath: str) -> str:
        """Registers an existing server-side file and returns an image ID."""
        image_id = f"img_{uuid.uuid4().hex[:12]}"
        self._image_registry[image_id] = filepath
        return image_id

    def get_image_path(self, image_id: str) -> str:
        """Resolves image ID to local file path."""
        path = self._image_registry.get(image_id)
        if not path or not os.path.exists(path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Image resource '{image_id}' not found.",
            )
        return path

    def get_preview_path(self, image_id: str) -> str:
        """
        Retrieves or generates on-demand 8-bit web PNG preview for an image ID.
        """
        if image_id in self._preview_registry and os.path.exists(self._preview_registry[image_id]):
            return self._preview_registry[image_id]

        source_path = self.get_image_path(image_id)
        preview_path = os.path.join(self.previews_dir, f"{image_id}_preview.png")

        try:
            _, out_path = PreviewGenerator.generate_preview_from_file(source_path, preview_path)
            self._preview_registry[image_id] = out_path
            return out_path
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate preview for '{image_id}': {str(e)}",
            )

    def get_metadata(self, image_id: str) -> RasterMetadata:
        """Inspects and returns structural and geospatial metadata."""
        source_path = self.get_image_path(image_id)
        try:
            return RasterValidator.inspect_raster(source_path)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to read raster metadata for '{image_id}': {str(e)}",
            )

    def validate_and_align_pair(self, before_id: str, after_id: str) -> Dict[str, Any]:
        """
        Validates bi-temporal raster pair, checks spatial co-registration,
        generates previews, and caches the result.
        """
        before_path = self.get_image_path(before_id)
        after_path = self.get_image_path(after_id)

        # 1. Validation
        val_result = RasterValidator.validate_pair(before_path, after_path)
        if not val_result.valid:
            return {
                "valid": False,
                "georeferenced": val_result.georeferenced,
                "aligned": False,
                "source_crs": val_result.source_crs,
                "width": val_result.width,
                "height": val_result.height,
                "bands": val_result.bands,
                "before_image_id": before_id,
                "after_image_id": after_id,
                "overlap_bounds_wgs84": None,
                "valid_pixel_pct": 0.0,
                "warnings": val_result.warnings,
                "errors": val_result.errors,
            }

        # 2. Alignment & Reprojection
        pair_out_dir = os.path.join(self.aligned_dir, f"{before_id}_{after_id}")
        alignment_info = RasterAlignmentService.align_pair(before_path, after_path, output_dir=pair_out_dir)

        # 3. Ensure previews exist
        self.get_preview_path(before_id)
        self.get_preview_path(after_id)

        response = {
            "valid": True,
            "georeferenced": val_result.georeferenced,
            "aligned": alignment_info["aligned"],
            "source_crs": val_result.source_crs,
            "width": alignment_info["width"],
            "height": alignment_info["height"],
            "bands": alignment_info["before_bands"],
            "before_image_id": before_id,
            "after_image_id": after_id,
            "overlap_bounds_wgs84": val_result.overlap_wgs84.to_dict() if val_result.overlap_wgs84 else None,
            "valid_pixel_pct": alignment_info["valid_pixel_pct"],
            "warnings": alignment_info["warnings"],
            "errors": [],
        }

        pair_key = f"{before_id}_{after_id}"
        self._validation_cache[pair_key] = response
        return response

    def stage_dataset_sample(self, dataset_id: str, sample_id: str) -> Dict[str, Any]:
        """
        Prepares a registered sample pair from LEVIR-CD, OSCD, or GeoTIFF catalogs
        for instant viewing and validation in the dashboard.
        """
        if dataset_id == "levir_cd":
            pair = self.manifest.levir_loader.load_pair(sample_id)
            path_a = pair["metadata"]["before_path"]
            path_b = pair["metadata"]["after_path"]
            id_a = self.register_file(path_a)
            id_b = self.register_file(path_b)
            return self.validate_and_align_pair(id_a, id_b)

        elif dataset_id == "spacenet7":
            pair = self.manifest.spacenet_loader.load_pair(sample_id)
            path_a = pair["before_path"]
            path_b = pair["after_path"]
            id_a = self.register_file(path_a)
            id_b = self.register_file(path_b)
            return self.validate_and_align_pair(id_a, id_b)

        elif dataset_id == "oscd":
            pair = self.manifest.oscd_loader.load_pair(sample_id)
            path_a = pair["metadata"]["before_path"]
            path_b = pair["metadata"]["after_path"]
            id_a = self.register_file(path_a)
            id_b = self.register_file(path_b)
            return self.validate_and_align_pair(id_a, id_b)

        elif dataset_id == "custom_geotiff":
            # Sample Delhi NCR GeoTIFF
            sample_dir = os.path.join(self.data_dir, "geotiff", "delhi_sector49")
            path_a = os.path.join(sample_dir, "before.tif")
            path_b = os.path.join(sample_dir, "after.tif")
            id_a = self.register_file(path_a)
            id_b = self.register_file(path_b)
            return self.validate_and_align_pair(id_a, id_b)

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )
