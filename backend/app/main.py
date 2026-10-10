"""
FastAPI Backend Application for GeoSentinel AI - Stage 3 Change Detection Engine
"""

import os
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, status, Query, Body
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import (
    HealthStatus,
    DatasetListResponse,
    DatasetSamplesResponse,
    DatasetSampleSummary,
    ImageryValidationResponse,
    RasterMetadataResponse,
    GeoBoundsSchema,
    JobCreateRequest,
    JobResponse,
    ErrorResponse,
)
from app.services.imagery_service import ImageryService
from app.services.change_detection_service import ChangeDetectionService
from app.detection.registry import registry

app = FastAPI(
    title="GeoSentinel AI API",
    description="Bi-Temporal Satellite Change Detection Platform Backend",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Initialize paths and services
project_root = Path(__file__).resolve().parent.parent.parent
imagery_service = ImageryService(str(project_root))
detection_service = ChangeDetectionService(str(project_root), imagery_service)

# Allowed CORS origins
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get(
    "/api/health",
    response_model=HealthStatus,
    summary="Health check and engine status",
    tags=["Health"],
)
async def get_health() -> HealthStatus:
    """
    Returns operational status of GeoSentinel AI backend in Stage 3.
    """
    return HealthStatus(
        status="ok",
        project="GeoSentinel AI",
        stage=3,
        available_methods=registry.get_available_method_ids(),
        available_datasets=["levir_cd", "oscd", "custom_geotiff"],
    )


@app.get(
    "/api/methods",
    summary="List available detection methods and status",
    tags=["Detection"],
)
async def list_detection_methods():
    """
    Returns live operational status and descriptions for all registered detection algorithms.
    """
    return {"methods": registry.list_methods()}


@app.get(
    "/api/kaggle/status",
    summary="Check Kaggle API authentication status and registered datasets",
    tags=["Kaggle"],
)
async def get_kaggle_status():
    """
    Returns Kaggle API authentication health, credential file presence, and registered dataset slugs.
    """
    from app.datasets.kaggle_downloader import KaggleDatasetManager
    auth = KaggleDatasetManager.check_kaggle_auth()
    datasets = KaggleDatasetManager.list_registered_kaggle_datasets()
    return {"auth": auth, "datasets": datasets}


@app.post(
    "/api/kaggle/download",
    summary="Download selective dataset sample from Kaggle",
    tags=["Kaggle"],
)
async def download_kaggle_dataset(request: Dict[str, Any] = Body(...)):
    """
    Downloads dataset files from Kaggle if authenticated.
    """
    dataset_id = request.get("dataset_id", "spacenet7")
    target_dir = os.path.join(project_root, "data", dataset_id)

    from app.datasets.kaggle_downloader import KaggleDatasetManager
    result = KaggleDatasetManager.download_dataset_sample(dataset_id, target_dir)
    return result


@app.get(
    "/api/datasets/manifest",
    summary="Retrieve authoritative multi-source dataset and land-cover evidence manifest",
    tags=["Datasets"],
)
async def get_dataset_manifest():
    """
    Returns full metadata for all integrated satellite sources (Landsat-C2-L2, Sentinel-2-L2A,
    GHSL GHS-BUILT-S 100m, ESA WorldCover 10m, Dynamic World, and ICCD Benchmark).
    """
    from app.services.reference_landcover_service import ReferenceLandCoverService
    return ReferenceLandCoverService.get_source_manifest()


@app.get(
    "/api/datasets/reference/{city_id}",
    summary="Retrieve GHSL historical built-up trajectory and ESA WorldCover baseline for an Indian city",
    tags=["Datasets"],
)
async def get_city_reference_profile(city_id: str):
    """
    Returns GHSL built-up trajectory (2000–2025) and baseline land cover percentages.
    """
    from app.services.reference_landcover_service import ReferenceLandCoverService
    profile = ReferenceLandCoverService.get_city_reference(city_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reference profile for city '{city_id}' not found.",
        )
    return profile


@app.get(
    "/api/datasets",
    response_model=DatasetListResponse,
    summary="List available satellite datasets",
    tags=["Datasets"],
)
async def list_datasets() -> DatasetListResponse:
    datasets = imagery_service.manifest.get_available_datasets()
    return DatasetListResponse(datasets=datasets)


@app.get(
    "/api/datasets/{dataset_id}/samples",
    response_model=DatasetSamplesResponse,
    summary="List available samples for a dataset",
    tags=["Datasets"],
)
async def list_dataset_samples(dataset_id: str) -> DatasetSamplesResponse:
    samples_data = imagery_service.manifest.list_samples(dataset_id)
    summaries = [
        DatasetSampleSummary(
            sample_id=s["sample_id"],
            name=s["name"],
            category=s["category"],
            georeferenced=s["georeferenced"],
            dimensions=s["dimensions"],
        )
        for s in samples_data
    ]
    return DatasetSamplesResponse(dataset_id=dataset_id, samples=summaries)


@app.get(
    "/api/datasets/{dataset_id}/samples/{sample_id}",
    response_model=ImageryValidationResponse,
    summary="Load and validate a dataset sample pair",
    tags=["Datasets"],
)
async def load_dataset_sample(dataset_id: str, sample_id: str) -> ImageryValidationResponse:
    try:
        val_result = imagery_service.stage_dataset_sample(dataset_id, sample_id)
        return ImageryValidationResponse(**val_result)
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load sample '{sample_id}': {str(e)}",
        )


@app.post(
    "/api/imagery/validate",
    response_model=ImageryValidationResponse,
    summary="Upload and validate two custom GeoTIFF / raster images",
    tags=["Imagery"],
)
async def validate_imagery(
    before_image: UploadFile = File(..., description="Before acquisition raster (T1)"),
    after_image: UploadFile = File(..., description="After acquisition raster (T2)"),
) -> ImageryValidationResponse:
    before_id = await imagery_service.stage_upload(before_image)
    after_id = await imagery_service.stage_upload(after_image)
    val_result = imagery_service.validate_and_align_pair(before_id, after_id)
    return ImageryValidationResponse(**val_result)


@app.get(
    "/api/imagery/{image_id}/preview",
    summary="Retrieve generated 8-bit web PNG preview",
    tags=["Imagery"],
)
async def get_imagery_preview(image_id: str):
    preview_path = imagery_service.get_preview_path(image_id)
    return FileResponse(preview_path, media_type="image/png")


@app.get(
    "/api/imagery/{image_id}/metadata",
    response_model=RasterMetadataResponse,
    summary="Retrieve structural and geospatial metadata for an image",
    tags=["Imagery"],
)
async def get_imagery_metadata(image_id: str) -> RasterMetadataResponse:
    meta = imagery_service.get_metadata(image_id)
    bounds_wgs84_schema = None
    if meta.bounds_wgs84:
        bounds_wgs84_schema = GeoBoundsSchema(**meta.bounds_wgs84.to_dict())

    return RasterMetadataResponse(
        filename=meta.filename,
        width=meta.width,
        height=meta.height,
        count=meta.count,
        dtypes=meta.dtypes,
        crs_epsg=meta.crs_epsg,
        crs_wkt=meta.crs_wkt,
        is_georeferenced=meta.is_georeferenced,
        transform=meta.transform,
        resolution=list(meta.resolution),
        bounds_native=meta.bounds_native,
        bounds_wgs84=bounds_wgs84_schema,
        nodata=meta.nodata,
        driver=meta.driver,
    )


# --- Stage 3 Change Detection Job Processing ---

@app.post(
    "/api/jobs",
    response_model=JobResponse,
    summary="Create and execute a change detection analysis job",
    tags=["Detection"],
)
async def create_job(request: JobCreateRequest) -> JobResponse:
    """
    Executes change detection comparison between two staged rasters using
    the selected algorithm (classical or pretrained AI) and applies morphological filtering.
    """
    gt_array = None
    if request.dataset_id and request.sample_id:
        try:
            sample_details = imagery_service.manifest.get_sample_details(request.dataset_id, request.sample_id)
            gt_array = sample_details.get("ground_truth")
        except Exception:
            gt_array = None

    job_result = detection_service.create_and_execute_job(
        before_image_id=request.before_image_id,
        after_image_id=request.after_image_id,
        method=request.method,
        threshold=request.threshold,
        kernel_size=request.kernel_size,
        min_component_size=request.min_component_size,
        ground_truth_array=gt_array,
    )

    if job_result["status"] == "failed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=job_result.get("error", "Change detection job failed."),
        )

    return JobResponse(**job_result)


@app.get(
    "/api/jobs/{job_id}",
    response_model=JobResponse,
    summary="Get change detection job status and telemetry",
    tags=["Detection"],
)
async def get_job_status(job_id: str) -> JobResponse:
    """
    Returns execution status, runtime in milliseconds, parameters, and artifact links.
    """
    try:
        job = detection_service.get_job(job_id)
        return JobResponse(**job)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )


@app.get(
    "/api/jobs/{job_id}/images/{kind}",
    summary="Retrieve generated mask or score heatmap for a job",
    tags=["Detection"],
)
async def get_job_image(job_id: str, kind: str):
    """
    Serves generated artifact PNGs:
    - `change_score`: Colormapped change heatmap
    - `raw_mask`: Raw binary change mask
    - `filtered_mask`: Morphologically filtered change mask
    - `change_overlay`: Transparent orange (#FF8617) overlay for web display
    """
    try:
        image_path = detection_service.get_job_image_path(job_id, kind)
        return FileResponse(image_path, media_type="image/png")
    except (KeyError, FileNotFoundError) as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


# --- Stage 4 India-Focused Satellite Discovery & Vector Analysis Endpoints ---

@app.get(
    "/api/india/boundaries",
    summary="Retrieve India ADM0 and ADM1 GeoJSON boundaries",
    tags=["India"],
)
async def get_india_boundaries(level: str = Query(default="adm1", description="adm0 or adm1")):
    """
    Returns official GeoJSON boundaries from geoBoundaries (Runfola et al., 2020).
    """
    adm_dir = os.path.join(project_root, "data", "india", "boundaries")
    if level == "adm0":
        filename = "india_adm0.geojson"
    else:
        filename = "india_states_simplified.geojson"
    
    filepath = os.path.join(adm_dir, filename)
    if not os.path.exists(filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"India boundary file '{filename}' not found on server.",
        )
    return FileResponse(filepath, media_type="application/geo+json")


@app.get(
    "/api/india/places",
    summary="Retrieve verified Indian cities and urban corridor gazetteer",
    tags=["India"],
)
async def get_india_places():
    """
    Returns verified Indian urban corridors, coordinates, and bounding boxes.
    """
    places_path = os.path.join(project_root, "data", "india", "places.json")
    if not os.path.exists(places_path):
        return {"total": 0, "places": []}
    
    import json
    with open(places_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    places_list = data["places"] if isinstance(data, dict) and "places" in data else (data if isinstance(data, list) else [])
    return {"total": len(places_list), "places": places_list}


@app.post(
    "/api/imagery/search",
    summary="Search Sentinel-2 L2A STAC scenes over Indian coordinates",
    tags=["Imagery"],
)
async def search_satellite_imagery(request: Dict[str, Any] = Body(...)):
    """
    Queries Element 84 Earth Search STAC API for Sentinel-2 L2A scenes with cloud filtering.
    """
    from app.services.stac_satellite_service import StacSatelliteService
    stac_service = StacSatelliteService(
        data_dir=os.path.join(project_root, "data"),
        runtime_dir=os.path.join(project_root, "runtime"),
    )

    bbox = request.get("bbox", [73.70, 18.50, 73.85, 18.62])
    min_lon, min_lat, max_lon, max_lat = bbox[0], bbox[1], bbox[2], bbox[3]

    start_date = request.get("date_range_start", "2024-01-01")
    end_date = request.get("date_range_end", "2025-01-01")
    max_cloud = float(request.get("max_cloud_cover", 25.0))
    limit = int(request.get("limit", 10))

    result = stac_service.search_scenes(
        min_lon=min_lon,
        min_lat=min_lat,
        max_lon=max_lon,
        max_lat=max_lat,
        start_date=start_date,
        end_date=end_date,
        max_cloud_cover=max_cloud,
        limit=limit,
    )
    return result


@app.post(
    "/api/imagery/acquire",
    summary="Acquire Sentinel-2 scenes for bi-temporal change detection",
    tags=["Imagery"],
)
async def acquire_satellite_imagery(request: Dict[str, Any] = Body(...)):
    """
    Acquires and windows the chosen Sentinel-2 scene pair and registers them as image assets.
    """
    from app.services.stac_satellite_service import StacSatelliteService
    stac_service = StacSatelliteService(
        data_dir=os.path.join(project_root, "data"),
        runtime_dir=os.path.join(project_root, "runtime"),
    )

    bbox = request.get("bbox", [73.70, 18.50, 73.85, 18.62])
    before_scene_id = request.get("before_scene_id", "S2A_MSIL2A_20240312")
    after_scene_id = request.get("after_scene_id", "S2A_MSIL2A_20241229")
    location_name = request.get("location_name", "Selected India Region")

    acq_res = stac_service.acquire_scene_pair(
        before_scene_id=before_scene_id,
        after_scene_id=after_scene_id,
        min_lon=bbox[0],
        min_lat=bbox[1],
        max_lon=bbox[2],
        max_lat=bbox[3],
    )

    before_id = imagery_service.register_file(acq_res["before_path"])
    after_id = imagery_service.register_file(acq_res["after_path"])

    val_res = imagery_service.validate_and_align_pair(before_id, after_id)

    meta_before = imagery_service.get_metadata(before_id)
    bounds_schema = meta_before.bounds_wgs84.to_dict() if meta_before.bounds_wgs84 else {
        "min_lon": bbox[0], "min_lat": bbox[1], "max_lon": bbox[2], "max_lat": bbox[3]
    }

    return {
        "success": True,
        "location_name": location_name,
        "before_image_id": before_id,
        "after_image_id": after_id,
        "before_preview_url": f"/api/imagery/{before_id}/preview",
        "after_preview_url": f"/api/imagery/{after_id}/preview",
        "acquisition_dates": acq_res["acquisition_dates"],
        "bounds_wgs84": bounds_schema,
        "validation": val_res,
        "message": f"Successfully staged georeferenced Sentinel-2 L2A pair for {location_name}.",
    }


# --- Historical Landsat Collection 2 (2000–2026) Endpoints ---

@app.get(
    "/api/imagery/historical/timeline",
    summary="Retrieve available historical satellite milestone years for a city",
    tags=["Historical Landsat"],
)
async def get_historical_timeline(city_id: str = Query(default="pune")):
    """
    Returns available historical milestone observations (2000, 2005, 2010, 2015, 2020, 2025, 2026)
    from Landsat-5 TM, Landsat-7 ETM+, Landsat-8 OLI, and Landsat-9 OLI-2.
    """
    from app.services.landsat_historical_service import LandsatHistoricalService
    historical_service = LandsatHistoricalService(
        data_dir=os.path.join(project_root, "data"),
        runtime_dir=os.path.join(project_root, "runtime"),
    )
    timeline = historical_service.get_timeline_years(city_id)
    return {
        "city_id": city_id,
        "collection": "landsat-c2-l2",
        "available_years": [2000, 2005, 2010, 2015, 2020, 2025, 2026],
        "timeline": timeline,
    }


@app.post(
    "/api/imagery/historical/search",
    summary="Search Landsat C2 L2 scenes across historical years (2000–2026)",
    tags=["Historical Landsat"],
)
async def search_historical_imagery(request: Dict[str, Any] = Body(...)):
    """
    Searches Microsoft Planetary Computer & Earth Search for Landsat Collection 2 Level-2 surface reflectance observations.
    """
    from app.services.landsat_historical_service import LandsatHistoricalService
    historical_service = LandsatHistoricalService(
        data_dir=os.path.join(project_root, "data"),
        runtime_dir=os.path.join(project_root, "runtime"),
    )

    city_id = request.get("city_id", "pune")
    year_before = int(request.get("year_before", 2000))
    year_after = int(request.get("year_after", 2026))
    bbox = request.get("bbox", [73.70, 18.45, 73.95, 18.62])
    max_cloud = float(request.get("max_cloud_cover", 25.0))

    result = historical_service.search_historical_scenes(
        city_id=city_id,
        year_before=year_before,
        year_after=year_after,
        min_lon=bbox[0],
        min_lat=bbox[1],
        max_lon=bbox[2],
        max_lat=bbox[3],
        max_cloud_cover=max_cloud,
    )
    return result


@app.post(
    "/api/imagery/historical/acquire",
    summary="Acquire and stage historical Landsat C2 L2 GeoTIFF pair (30m GSD)",
    tags=["Historical Landsat"],
)
async def acquire_historical_imagery(request: Dict[str, Any] = Body(...)):
    """
    Stages calibrated 30m multi-band Landsat rasters for the selected historical years,
    aligns them to a shared projection, and registers image IDs for change detection.
    """
    from app.services.landsat_historical_service import LandsatHistoricalService
    historical_service = LandsatHistoricalService(
        data_dir=os.path.join(project_root, "data"),
        runtime_dir=os.path.join(project_root, "runtime"),
    )

    city_id = request.get("city_id", "pune")
    year_before = int(request.get("year_before", 2000))
    year_after = int(request.get("year_after", 2026))
    bbox = request.get("bbox", [73.70, 18.45, 73.95, 18.62])
    location_name = request.get("location_name", f"{city_id.capitalize()} ({year_before} vs {year_after})")

    acq_res = historical_service.acquire_historical_pair(
        city_id=city_id,
        year_before=year_before,
        year_after=year_after,
        min_lon=bbox[0],
        min_lat=bbox[1],
        max_lon=bbox[2],
        max_lat=bbox[3],
    )

    before_id = imagery_service.register_file(acq_res["before_path"])
    after_id = imagery_service.register_file(acq_res["after_path"])

    val_res = imagery_service.validate_and_align_pair(before_id, after_id)
    meta_before = imagery_service.get_metadata(before_id)
    bounds_schema = meta_before.bounds_wgs84.to_dict() if meta_before.bounds_wgs84 else {
        "min_lon": bbox[0], "min_lat": bbox[1], "max_lon": bbox[2], "max_lat": bbox[3]
    }

    return {
        "success": True,
        "location_name": location_name,
        "city_id": city_id,
        "year_before": year_before,
        "year_after": year_after,
        "before_image_id": before_id,
        "after_image_id": after_id,
        "before_preview_url": f"/api/imagery/{before_id}/preview",
        "after_preview_url": f"/api/imagery/{after_id}/preview",
        "acquisition_dates": acq_res["acquisition_dates"],
        "scene_ids": acq_res["scene_ids"],
        "spatial_resolution": "30.0m GSD (Landsat Collection 2 Level-2)",
        "bounds_wgs84": bounds_schema,
        "validation": val_res,
        "message": f"Successfully staged 30m georeferenced Landsat pair for {location_name} ({year_before} vs {year_after}).",
    }

@app.get(
    "/api/jobs/{job_id}/results",
    summary="Retrieve full GeoJSON vector polygon results and telemetry for a job",
    tags=["Detection"],
)
async def get_job_results(job_id: str):
    """
    Returns full vector polygon GeoJSON FeatureCollection, ground area (m²), severity counts, and review stats.
    """
    try:
        results = detection_service.get_job_results(job_id)
        return results
    except (KeyError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@app.patch(
    "/api/jobs/{job_id}/regions/{region_id}",
    summary="Update human verification review status for a detected polygon",
    tags=["Detection"],
)
async def update_region_review_status(
    job_id: str,
    region_id: str,
    body: Dict[str, Any] = Body(...),
):
    """
    Updates the review status ('confirmed', 'false_positive', 'needs_inspection') and analyst notes for a polygon.
    """
    review_status_val = body.get("review_status", "confirmed")
    notes = body.get("notes")

    try:
        updated = detection_service.update_region_status(
            job_id=job_id,
            region_id=region_id,
            review_status=review_status_val,
            notes=notes,
        )
        return updated
    except KeyError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@app.get(
    "/api/jobs/{job_id}/export",
    summary="Download GeoJSON vector polygons file for GIS import",
    tags=["Detection"],
)
async def export_job_geojson(job_id: str):
    """
    Serves the job's GeoJSON vector features file as a downloadable attachment.
    """
    try:
        path = detection_service.get_job_geojson_path(job_id)
        filename = f"geosentinel_{job_id}_features.geojson"
        return FileResponse(
            path,
            media_type="application/geo+json",
            filename=filename,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except (KeyError, FileNotFoundError) as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

