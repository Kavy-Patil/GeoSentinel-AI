# GeoSentinel AI — Bi-Temporal Satellite Change Detection

> **Detect Change. Understand Impact. Verify Evidence.**

**Project:** GeoSentinel AI  
**Hackathon:** FUSION 2026  
**Problem Statement:** GEOAI-04 — Bi-Temporal Satellite Change Detection for Rapid Urban Encroachment & Disaster Impact  
**Current Milestone:** Stage 3 of 6 — AI & Computer Vision Change-Detection Engine  

---

## 1. Project Overview

**GeoSentinel AI** is an earth observation intelligence platform engineered to identify bi-temporal surface changes from high-resolution satellite imagery (GeoTIFFs). The system targets rapid detection of:
- **Urban Encroachment:** Informal construction, deforestation, agricultural land loss, and infrastructure corridors.
- **Disaster Impact:** Flood inundation zones, structural collapse, landslide scarps, and route blockages.

### Milestone Progression
- **Stage 1 (Complete):** Foundation UI, dark Change Monitor workspace, and OpenAPI contracts.
- **Stage 2 (Complete):** Satellite dataset ingestion (LEVIR-CD, OSCD), RasterIO GeoTIFF validation, spatial co-registration, CRS & affine transform parsing, percentile radiometric normalization, and Leaflet GIS raster overlay.
- **Stage 3 (Complete):** Modular Change Detection Engine featuring:
  - Pathway A: Classical Computer Vision (RGB vector differencing, thresholding, morphological noise removal, connected-component analysis).
  - Pathway B: Pretrained AI interface (ChangeFormer architecture with truthful availability reporting).
  - Tiled patch inference manager with 2D linear blending for large rasters.
  - Transparent `#FF8617` raster change overlay on satellite imagery with layer selector (`overlay`, `filtered_mask`, `raw_mask`, `change_score`).
  - Automated ground-truth benchmark metrics (Precision, Recall, F1-Score, IoU / Jaccard index) when evaluating LEVIR-CD and OSCD samples.
- **Stage 4 (Upcoming):** Vector Polygonization & Leaflet GIS Layers.

---

## 2. Tech Stack

### Frontend
- **Framework:** React 19 + TypeScript
- **Bundler:** Vite 6
- **Styling:** Tailwind CSS (Custom Dark Geospatial Theme: `#0B1118`, `#151D26`, `#17212B`, `#34404C`, `#FF8617`)
- **Mapping:** React Leaflet + Leaflet (`ImageOverlay` with dynamic WGS84 bounding boxes)
- **Overlay Rendering:** Canvas-accelerated dynamic alpha overlay with multi-layer switching
- **Icons:** Lucide React
- **Networking:** Native Fetch API

### Backend
- **Framework:** FastAPI
- **Server:** Uvicorn
- **Geospatial Processing:** RasterIO 1.5+, Affine, GDAL PROJ
- **Computer Vision & Morphological Pipelines:** OpenCV (`cv2`), SciPy (`scipy.ndimage`), NumPy 2.5+, Pillow 12+
- **Validation & Serialization:** Pydantic v2
- **Testing:** Pytest + HTTPX

---

## 3. Change Detection Engine Architecture

### A. Classical Differencing Pipeline
1. **Input Validation:** Dimension matching, channel verification, and non-overlapping / NaN pixel masking.
2. **Spectral L1 Differencing:** Normalized RGB channel delta computation yielding a continuous `[0.0, 1.0]` change score grid.
3. **Thresholding:** Adaptive Otsu or user-configurable thresholding to yield binary change candidates.
4. **Morphological Noise Suppression:** Morphological opening (removes isolated salt-and-pepper speckles) followed by closing (bridges small intra-building cavities).
5. **Connected Component Filtering:** Area-based connected component analysis removing false positives below the configurable minimum pixel cluster size (`min_component_size`).

### B. Pretrained AI Detector (ChangeFormer)
- Modular detector implementing the `ChangeDetector` protocol.
- Truthful availability discovery: reports `available: false` unless `changeformer_levircd.pth` is placed in `data/models/`.

### C. Tiling Manager
- 2D grid patch subdivision (`tile_size=512`, `overlap=64`).
- Linear distance-weighted blending across overlapping margins preventing seam artifacts.

---

## 4. API Endpoints (Stage 3)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health, active stage (3), registered datasets & algorithms |
| `GET` | `/api/methods` | List available detection algorithms and operational status |
| `GET` | `/api/datasets` | List available satellite benchmark catalogs |
| `GET` | `/api/datasets/{id}/samples` | List sample pairs for a specific dataset |
| `GET` | `/api/datasets/{id}/samples/{sample_id}` | Load, stage, and validate a sample pair |
| `POST` | `/api/imagery/validate` | Multipart upload of two custom GeoTIFFs with spatial co-registration |
| `GET` | `/api/imagery/{id}/preview` | Stream normalized 8-bit web PNG preview |
| `GET` | `/api/imagery/{id}/metadata` | Return verified spatial metadata, CRS, and WGS84 bounds |
| `POST` | `/api/jobs` | Execute change detection job with customizable threshold & filter parameters |
| `GET` | `/api/jobs/{job_id}` | Retrieve job telemetry, runtime, pixel stats, and evaluation metrics |
| `GET` | `/api/jobs/{job_id}/images/{kind}` | Stream raster artifact (`change_overlay`, `filtered_mask`, `raw_mask`, `change_score`) |

---

## 5. Quick Start & Execution (PowerShell / Windows)

### 1. Start the FastAPI Backend

```powershell
cd c:\Users\mishr\OneDrive\Desktop\geosentinel-ai\backend
$env:PATH = "C:\Users\mishr\.runtimes\venv\Scripts;" + $env:PATH
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- API Docs: `http://127.0.0.1:8000/docs`
- Health: `http://127.0.0.1:8000/api/health`

### 2. Start the React Frontend

```powershell
cd c:\Users\mishr\OneDrive\Desktop\geosentinel-ai\frontend
$env:PATH = "C:\Users\mishr\.runtimes\node;C:\Users\mishr\.runtimes\venv\Scripts;" + $env:PATH
npm run dev
```
- Dashboard: `http://localhost:5173`

### 3. Run Automated Tests

```powershell
# Backend test suite (23 tests passing)
cd c:\Users\mishr\OneDrive\Desktop\geosentinel-ai\backend
$env:PATH = "C:\Users\mishr\.runtimes\venv\Scripts;" + $env:PATH
pytest -v

# Frontend TypeScript & Vite build
cd c:\Users\mishr\OneDrive\Desktop\geosentinel-ai\frontend
$env:PATH = "C:\Users\mishr\.runtimes\node;C:\Users\mishr\.runtimes\venv\Scripts;" + $env:PATH
npm run build
```

---

## 6. Integrity & Verification Guarantees

1. **No Fake AI Claims:** Classical image processing is never presented as deep learning. Pretrained models report operational status truthfully.
2. **Authentic Pixel Metrics:** Telemetry (processing time, changed pixel counts, suppression percentages, IoU, F1 score) is calculated directly from actual array operations.
3. **Stage Boundary Enforcement:** Vector polygonization and square-meter bounding polygon areas remain scheduled for Stage 4.
