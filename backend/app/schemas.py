"""
Pydantic schemas for GeoSentinel AI API contracts.
Shared between backend endpoints and mapped to OpenAPI specs and TypeScript interfaces.
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DetectionMethod(str, Enum):
    CLASSICAL = "classical"
    DEEP_LEARNING = "deep_learning"


class JobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class RegionSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"
    UNKNOWN = "unknown"


class RegionPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"
    NOT_EVALUATED = "not_evaluated"


class ReviewStatus(str, Enum):
    UNREVIEWED = "unreviewed"
    CONFIRMED = "confirmed"
    FALSE_POSITIVE = "false_positive"
    NEEDS_INSPECTION = "needs_inspection"


class HealthStatus(BaseModel):
    status: str = Field(default="ok", description="Service health state")
    project: str = Field(default="GeoSentinel AI", description="Project identifier")
    stage: int = Field(default=3, description="Current implementation stage")
    available_methods: List[str] = Field(
        default_factory=lambda: ["classical"],
        description="Available change detection algorithms",
    )
    available_datasets: List[str] = Field(
        default_factory=lambda: ["levir_cd", "oscd", "custom_geotiff"],
        description="Registered satellite benchmark and ingestion pipelines",
    )


# --- Stage 2 Dataset & Ingestion Schemas ---

class DatasetSummary(BaseModel):
    id: str
    name: str
    available: bool
    sample_count: int
    supports_georeferencing: bool
    sensor: Optional[str] = None
    license: Optional[str] = None
    description: Optional[str] = None
    attribution: Optional[str] = None


class DatasetListResponse(BaseModel):
    datasets: List[DatasetSummary]


class DatasetSampleSummary(BaseModel):
    sample_id: str
    name: str
    category: str
    georeferenced: bool
    dimensions: str


class DatasetSamplesResponse(BaseModel):
    dataset_id: str
    samples: List[DatasetSampleSummary]


class GeoBoundsSchema(BaseModel):
    min_lon: float
    min_lat: float
    max_lon: float
    max_lat: float


class RasterMetadataResponse(BaseModel):
    filename: str
    width: int
    height: int
    count: int
    dtypes: List[str]
    crs_epsg: Optional[str] = None
    crs_wkt: Optional[str] = None
    is_georeferenced: bool = False
    transform: List[float] = Field(default_factory=list)
    resolution: List[float] = Field(default_factory=list)
    bounds_native: Optional[List[float]] = None
    bounds_wgs84: Optional[GeoBoundsSchema] = None
    nodata: Optional[float] = None
    driver: str = "GTiff"


class ImageryValidationResponse(BaseModel):
    valid: bool
    georeferenced: bool
    aligned: bool
    source_crs: Optional[str] = None
    width: int
    height: int
    bands: int
    before_image_id: str
    after_image_id: str
    overlap_bounds_wgs84: Optional[GeoBoundsSchema] = None
    valid_pixel_pct: float = 100.0
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)


# --- Stage 3 Change Detection Job Schemas ---

class JobCreateRequest(BaseModel):
    before_image_id: str
    after_image_id: str
    method: str = Field(default="classical", description="classical or deep_learning")
    threshold: float = Field(default=0.5, ge=0.0, le=1.0)
    kernel_size: int = Field(default=3, ge=1, le=15)
    min_component_size: int = Field(default=25, ge=1)
    dataset_id: Optional[str] = None
    sample_id: Optional[str] = None


class JobOutputs(BaseModel):
    change_score_url: Optional[str] = None
    raw_mask_url: Optional[str] = None
    filtered_mask_url: Optional[str] = None
    change_overlay_url: Optional[str] = None
    before_preview_url: Optional[str] = None
    after_preview_url: Optional[str] = None


class JobEvaluation(BaseModel):
    true_positives: int
    false_positives: int
    false_negatives: int
    true_negatives: int
    precision: float
    recall: float
    f1_score: float
    iou: float


class JobResponse(BaseModel):
    job_id: str
    status: str
    method: str
    is_georeferenced: bool = False
    bounds_wgs84: Optional[GeoBoundsSchema] = None
    created_at: str
    processing_time_ms: float = 0.0
    error: Optional[str] = None
    outputs: Dict[str, str] = Field(default_factory=dict)
    stats: Dict[str, Any] = Field(default_factory=dict)
    summary: Optional[Dict[str, Any]] = None
    filtering_details: Dict[str, Any] = Field(default_factory=dict)
    evaluation: Optional[JobEvaluation] = None


class ChangeRegion(BaseModel):
    region_id: str
    geometry: Optional[Dict[str, Any]] = None
    area_m2: Optional[float] = None
    area_ha: Optional[float] = None
    magnitude: Optional[float] = None
    severity: RegionSeverity = RegionSeverity.UNKNOWN
    priority: RegionPriority = RegionPriority.NOT_EVALUATED
    review_status: ReviewStatus = ReviewStatus.UNREVIEWED
    centroid_lon: Optional[float] = None
    centroid_lat: Optional[float] = None
    notes: Optional[str] = None


class ChangeRegionsSummary(BaseModel):
    total_regions: int = 0
    total_area_m2: float = 0.0
    total_area_ha: float = 0.0
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0
    confirmed_count: int = 0
    rejected_count: int = 0
    unreviewed_count: int = 0


class JobResultsResponse(BaseModel):
    job_id: str
    status: str
    method: str
    is_georeferenced: bool = False
    geojson: Dict[str, Any] = Field(default_factory=dict)
    summary: ChangeRegionsSummary = Field(default_factory=ChangeRegionsSummary)
    bounds_wgs84: Optional[GeoBoundsSchema] = None
    created_at: str
    processing_time_ms: float = 0.0


class RegionReviewUpdateRequest(BaseModel):
    review_status: ReviewStatus
    notes: Optional[str] = None


# --- India & STAC Schemas ---

class IndiaPlace(BaseModel):
    id: str
    name: str
    state: str
    category: str
    lat: float
    lon: float
    description: str
    recommended_bbox: Optional[List[float]] = None


class IndiaPlacesResponse(BaseModel):
    total: int
    places: List[IndiaPlace]


class STACSceneSummary(BaseModel):
    id: str
    datetime: str
    platform: str
    cloud_cover: float
    bbox: List[float]
    thumbnail_url: Optional[str] = None
    visual_url: Optional[str] = None
    red_url: Optional[str] = None
    green_url: Optional[str] = None
    blue_url: Optional[str] = None
    nir_url: Optional[str] = None
    provider: str = "AWS Element84 Sentinel-2 L2A COG"


class STACSearchRequest(BaseModel):
    bbox: List[float] = Field(..., description="[min_lon, min_lat, max_lon, max_lat]")
    date_range_start: str = "2024-01-01"
    date_range_end: str = "2025-01-01"
    max_cloud_cover: float = 25.0
    limit: int = 10


class STACSearchResponse(BaseModel):
    bbox: List[float]
    total_scenes: int
    scenes: List[STACSceneSummary]


class STACAcquisitionRequest(BaseModel):
    before_scene_id: str
    after_scene_id: str
    bbox: List[float]
    location_name: Optional[str] = "Custom Region"


class STACAcquisitionResponse(BaseModel):
    success: bool
    location_name: str
    before_image_id: str
    after_image_id: str
    before_date: str
    after_date: str
    cloud_cover_before: float
    cloud_cover_after: float
    crs: str
    bounds_wgs84: GeoBoundsSchema
    resolution_m: float
    message: str


class ErrorResponse(BaseModel):
    detail: str

