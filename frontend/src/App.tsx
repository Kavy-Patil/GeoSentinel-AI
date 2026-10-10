import React, { useState, useEffect, useCallback } from 'react';
import { AppNavigationSidebar } from './components/layout/AppNavigationSidebar';
import { IndiaMap } from './components/india/IndiaMap';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { TopNavigation } from './components/layout/TopNavigation';
import { Sidebar } from './components/layout/Sidebar';
import { SatelliteComparison } from './components/comparison/SatelliteComparison';
import { AnalysisSidebar } from './components/analysis/AnalysisSidebar';
import { ImageInputState, ViewMode, WorkspaceTab } from './types/ui';
import { HealthStatus } from './types/api';
import { 
  DatasetSummary, 
  DatasetSampleSummary, 
  ImageryValidationResponse, 
  RasterMetadataResponse 
} from './types/imagery';
import { DetectionMethodInfo, MaskLayerMode, JobResponse } from './types/detection';
import { AppPage, SelectedLocation } from './types/geography';
import { JobResultsData } from './types/india';
import { fetchHealth } from './api/client';
import { 
  fetchDatasets, 
  fetchDatasetSamples, 
  loadDatasetSample, 
  validateCustomImagery, 
  getImageryPreviewUrl, 
  fetchImageryMetadata 
} from './api/datasets';
import { fetchAvailableMethods, createChangeDetectionJob } from './api/detection';
import { fetchJobResults } from './api/india';
import { formatCoordinates } from './utils/geodesic';
import { MapPin } from 'lucide-react';

const DEFAULT_METHODS: DetectionMethodInfo[] = [
  {
    id: 'classical',
    name: 'Classical Spectral Differencing',
    type: 'classical',
    hardware: 'CPU',
    description: 'Normalized RGB vector diff, thresholding, and morphological filtering',
    available: true,
  },
  {
    id: 'deep_learning',
    name: 'Pretrained AI (ChangeFormer)',
    type: 'deep_learning',
    hardware: 'CPU/GPU',
    description: 'Transformer-based bi-temporal building change detection',
    available: false,
  },
];

export const App: React.FC = () => {
  // Top-level Navigation Route
  const [activePage, setActivePage] = useState<AppPage>('home');
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);

  // Backend Health State
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  // Datasets & Samples State
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('custom_geotiff');
  const [samples, setSamples] = useState<DatasetSampleSummary[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState<string>('');
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Active Validation and Metadata State
  const [validation, setValidation] = useState<ImageryValidationResponse | null>(null);
  const [beforeMeta, setBeforeMeta] = useState<RasterMetadataResponse | null>(null);
  const [afterMeta, setAfterMeta] = useState<RasterMetadataResponse | null>(null);

  // Detection Engine & Vector Polygon State
  const [methods, setMethods] = useState<DetectionMethodInfo[]>(DEFAULT_METHODS);
  const [selectedMethod, setSelectedMethod] = useState<string>('classical');
  const [threshold, setThreshold] = useState<number>(0.35);
  const [kernelSize, setKernelSize] = useState<number>(3);
  const [minComponentSize, setMinComponentSize] = useState<number>(20);
  const [maskMode, setMaskMode] = useState<MaskLayerMode>('overlay');
  const [maskOpacity, setMaskOpacity] = useState<number>(85);
  const [isProcessingJob, setIsProcessingJob] = useState<boolean>(false);
  const [activeJob, setActiveJob] = useState<JobResponse | null>(null);
  const [jobResults, setJobResults] = useState<JobResultsData | null>(null);

  // View Controls State
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('map');
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [showOverlay, setShowOverlay] = useState<boolean>(true);

  // Image Inputs State for Comparison Viewers
  const [beforeInput, setBeforeInput] = useState<ImageInputState>({
    file: null,
    previewUrl: null,
    filename: null,
    fileSize: null,
    dimensions: null,
    acquisitionDate: null,
    isGeoTiff: true,
  });

  const [afterInput, setAfterInput] = useState<ImageInputState>({
    file: null,
    previewUrl: null,
    filename: null,
    fileSize: null,
    dimensions: null,
    acquisitionDate: null,
    isGeoTiff: true,
  });

  // Health Polling
  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const data = await fetchHealth();
      setHealth(data);
      setHealthError(null);
    } catch (err: unknown) {
      setHealth(null);
      const message = err instanceof Error ? err.message : 'Backend offline';
      setHealthError(message);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // Load available detection methods
  const loadMethods = useCallback(async () => {
    try {
      const res = await fetchAvailableMethods();
      if (res.methods && res.methods.length > 0) {
        setMethods(res.methods);
      }
    } catch (err: unknown) {
      console.warn('Using default method registry:', err);
    }
  }, []);

  // Load registered datasets catalog
  const loadDatasetsCatalog = useCallback(async () => {
    try {
      const res = await fetchDatasets();
      setDatasets(res.datasets);
    } catch (err: unknown) {
      console.error('Failed to load datasets catalog:', err);
    }
  }, []);

  // Staging and loading sample pair
  const handleLoadSample = useCallback(async (datasetId: string, sampleId: string) => {
    if (!sampleId) return;
    setIsDataLoading(true);
    setDataError(null);
    setActiveJob(null);
    setJobResults(null);
    try {
      const valRes = await loadDatasetSample(datasetId, sampleId);
      setValidation(valRes);

      const beforeUrl = getImageryPreviewUrl(valRes.before_image_id);
      const afterUrl = getImageryPreviewUrl(valRes.after_image_id);

      setBeforeInput({
        file: null,
        previewUrl: beforeUrl,
        filename: `${sampleId}_before_T1.png`,
        fileSize: null,
        dimensions: { width: valRes.width, height: valRes.height },
        acquisitionDate: 'Pre-Event Baseline (T1)',
        isGeoTiff: valRes.georeferenced,
      });

      setAfterInput({
        file: null,
        previewUrl: afterUrl,
        filename: `${sampleId}_after_T2.png`,
        fileSize: null,
        dimensions: { width: valRes.width, height: valRes.height },
        acquisitionDate: 'Post-Event Monitor (T2)',
        isGeoTiff: valRes.georeferenced,
      });

      fetchImageryMetadata(valRes.before_image_id).then(setBeforeMeta).catch(() => {});
      fetchImageryMetadata(valRes.after_image_id).then(setAfterMeta).catch(() => {});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load sample pair';
      setDataError(message);
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  // Switch Dataset
  const handleSelectDataset = async (datasetId: string) => {
    setSelectedDatasetId(datasetId);
    setDataError(null);
    setActiveJob(null);
    setJobResults(null);

    try {
      setIsDataLoading(true);
      const res = await fetchDatasetSamples(datasetId);
      setSamples(res.samples);
      if (res.samples.length > 0) {
        const firstSample = res.samples[0].sample_id;
        setSelectedSampleId(firstSample);
        await handleLoadSample(datasetId, firstSample);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load dataset samples';
      setDataError(message);
    } finally {
      setIsDataLoading(false);
    }
  };

  // Switch Sample
  const handleSelectSample = (sampleId: string) => {
    setSelectedSampleId(sampleId);
    handleLoadSample(selectedDatasetId, sampleId);
  };

  // Custom GeoTIFF Upload & Validation
  const handleUploadCustom = async (beforeFile: File, afterFile: File) => {
    setIsDataLoading(true);
    setDataError(null);
    setActiveJob(null);
    setJobResults(null);
    try {
      const valRes = await validateCustomImagery(beforeFile, afterFile);
      setValidation(valRes);

      const beforeUrl = getImageryPreviewUrl(valRes.before_image_id);
      const afterUrl = getImageryPreviewUrl(valRes.after_image_id);

      setBeforeInput({
        file: beforeFile,
        previewUrl: beforeUrl,
        filename: beforeFile.name,
        fileSize: beforeFile.size,
        dimensions: { width: valRes.width, height: valRes.height },
        acquisitionDate: 'Custom T1 Acquisition',
        isGeoTiff: valRes.georeferenced,
      });

      setAfterInput({
        file: afterFile,
        previewUrl: afterUrl,
        filename: afterFile.name,
        fileSize: afterFile.size,
        dimensions: { width: valRes.width, height: valRes.height },
        acquisitionDate: 'Custom T2 Acquisition',
        isGeoTiff: valRes.georeferenced,
      });

      fetchImageryMetadata(valRes.before_image_id).then(setBeforeMeta).catch(() => {});
      fetchImageryMetadata(valRes.after_image_id).then(setAfterMeta).catch(() => {});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Custom GeoTIFF validation failed';
      setDataError(message);
    } finally {
      setIsDataLoading(false);
    }
  };

  // Run Change Detection Pipeline
  const handleRunDetection = async () => {
    if (!validation || !validation.valid || !validation.before_image_id || !validation.after_image_id) {
      setDataError('Cannot run detection: Validated before and after rasters are required.');
      return;
    }

    setIsProcessingJob(true);
    setDataError(null);

    try {
      const job = await createChangeDetectionJob({
        before_image_id: validation.before_image_id,
        after_image_id: validation.after_image_id,
        method: selectedMethod,
        threshold: threshold,
        kernel_size: kernelSize,
        min_component_size: minComponentSize,
        dataset_id: selectedDatasetId !== 'custom_geotiff' ? selectedDatasetId : undefined,
        sample_id: selectedSampleId || undefined,
      });

      setActiveJob(job);
      setShowOverlay(true);

      // Fetch vector polygon results
      const results = await fetchJobResults(job.job_id);
      setJobResults(results);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Change detection job failed';
      setDataError(message);
    } finally {
      setIsProcessingJob(false);
    }
  };

  // Callback when India Map acquires and creates a job
  const handleIndiaJobCreated = async (jobId: string, locationName: string, bounds: any) => {
    try {
      setIsProcessingJob(true);
      const results = await fetchJobResults(jobId);
      setJobResults(results);

      // Construct job response for UI
      const mockJob: JobResponse = {
        job_id: jobId,
        status: results.status as any,
        method: results.method,
        created_at: results.created_at,
        processing_time_ms: results.processing_time_ms,
        outputs: {
          change_score_url: `/api/jobs/${jobId}/images/change_score`,
          raw_mask_url: `/api/jobs/${jobId}/images/raw_mask`,
          filtered_mask_url: `/api/jobs/${jobId}/images/filtered_mask`,
          change_overlay_url: `/api/jobs/${jobId}/images/change_overlay`,
        },
        stats: {
          total_pixels: 512 * 512,
          raw_changed_pixels: results.summary?.total_regions || 0,
          filtered_changed_pixels: results.summary?.total_regions || 0,
          raw_change_pct: 2.5,
          filtered_change_pct: 2.1,
          components_retained: results.summary?.total_regions || 0,
          components_suppressed: 0,
        },
        filtering_details: {},
      };

      setActiveJob(mockJob);

      // Setup validation & preview inputs
      setValidation({
        valid: true,
        georeferenced: true,
        aligned: true,
        source_crs: 'EPSG:32643',
        width: 512,
        height: 512,
        bands: 4,
        before_image_id: 'before',
        after_image_id: 'after',
        overlap_bounds_wgs84: bounds || results.bounds_wgs84,
        valid_pixel_pct: 100.0,
        warnings: [],
        errors: [],
      });

      setSelectedLocation({
        name: locationName,
        displayName: `${locationName}, India`,
        lat: bounds ? (bounds.min_lat + bounds.max_lat) / 2 : 18.5204,
        lon: bounds ? (bounds.min_lon + bounds.max_lon) / 2 : 73.8567,
        source: 'preset',
        bounds: bounds || results.bounds_wgs84,
      });

      // Navigate to Change Monitor workspace
      setActivePage('monitor');
      setWorkspaceTab('map');
    } catch (err) {
      console.error('Failed to load job vector results:', err);
    } finally {
      setIsProcessingJob(false);
    }
  };

  const handleRefreshJobResults = async () => {
    if (!activeJob) return;
    try {
      const results = await fetchJobResults(activeJob.job_id);
      setJobResults(results);
    } catch (err) {
      console.error('Failed to refresh vector results:', err);
    }
  };

  // Open monitor directly from history item
  const handleOpenMonitorWithSample = (datasetId: string, sampleId: string) => {
    setActivePage('monitor');
    handleSelectDataset(datasetId);
    setTimeout(() => handleSelectSample(sampleId), 100);
    setWorkspaceTab('map');
  };

  // Initial Data Load
  useEffect(() => {
    loadHealth();
    loadMethods();
    loadDatasetsCatalog();
  }, [loadHealth, loadMethods, loadDatasetsCatalog]);

  const isBackendOnline = !!health && !healthError;

  return (
    <div className="flex h-screen w-screen bg-[#070D17] text-[#F3F6FC] overflow-hidden font-sans">
      {/* 1. Global Left Navigation Sidebar */}
      <AppNavigationSidebar
        activePage={activePage}
        onNavigate={setActivePage}
        isBackendOnline={isBackendOnline}
      />

      {/* 2. Dynamic Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative overflow-hidden">
        {activePage === 'home' ? (
          /* Page A: Dedicated India Map Homepage */
          <IndiaMap
            onJobCreated={handleIndiaJobCreated}
            onOpenChangeMonitor={() => setActivePage('monitor')}
          />
        ) : activePage === 'datasets' ? (
          /* Page B: Datasets & GeoTIFF Ingestion Center */
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#070D17]">
            <TopNavigation
              health={health}
              healthLoading={healthLoading}
              healthError={healthError}
              onRefreshHealth={loadHealth}
            />
            <div className="flex-1 flex min-h-0 overflow-hidden">
              <Sidebar
                datasets={datasets}
                selectedDatasetId={selectedDatasetId}
                onSelectDataset={handleSelectDataset}
                samples={samples}
                selectedSampleId={selectedSampleId}
                onSelectSample={handleSelectSample}
                isLoading={isDataLoading}
                onUploadCustom={handleUploadCustom}
                validation={validation}
                beforeMeta={beforeMeta}
                afterMeta={afterMeta}
                error={dataError}
                methods={methods}
                selectedMethod={selectedMethod}
                onMethodChange={setSelectedMethod}
                threshold={threshold}
                onThresholdChange={setThreshold}
                kernelSize={kernelSize}
                onKernelSizeChange={setKernelSize}
                minComponentSize={minComponentSize}
                onMinComponentSizeChange={setMinComponentSize}
                maskMode={maskMode}
                onMaskModeChange={setMaskMode}
                maskOpacity={maskOpacity}
                onMaskOpacityChange={setMaskOpacity}
                isProcessing={isProcessingJob}
                hasActiveJob={!!activeJob}
                onRunDetection={handleRunDetection}
              />
              <main className="flex-1 p-3 min-w-0 min-h-0 flex flex-col">
                <SatelliteComparison
                  workspaceTab={workspaceTab}
                  onWorkspaceTabChange={setWorkspaceTab}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  beforeInput={beforeInput}
                  afterInput={afterInput}
                  showOverlay={showOverlay}
                  onToggleOverlay={() => setShowOverlay(!showOverlay)}
                  isGeoreferenced={validation?.georeferenced || false}
                  sourceCrs={validation?.source_crs || null}
                  bounds={validation?.overlap_bounds_wgs84 || null}
                  jobId={activeJob?.job_id || null}
                  maskMode={maskMode}
                  maskOpacity={maskOpacity}
                  vectorFeatures={jobResults?.geojson}
                  onRegionUpdated={handleRefreshJobResults}
                />
              </main>
              <AnalysisSidebar
                job={activeJob}
                isProcessing={isProcessingJob}
                validation={validation}
              />
            </div>
          </div>
        ) : activePage === 'history' ? (
          /* Page C: Analysis History */
          <HistoryPage onOpenMonitorWithSample={handleOpenMonitorWithSample} />
        ) : activePage === 'settings' ? (
          /* Page D: System Settings */
          <SettingsPage />
        ) : (
          /* Page E: Change Monitor Workspace */
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#070D17]">
            {/* Top Workspace Header Bar */}
            <TopNavigation
              health={health}
              healthLoading={healthLoading}
              healthError={healthError}
              onRefreshHealth={loadHealth}
            />

            {/* Target Area Context Pill */}
            {selectedLocation && (
              <div className="bg-[#0d1624] border-b border-slate-800 px-4 py-1.5 flex items-center justify-between text-xs z-20 select-none">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-lg bg-[#070D17] border border-sky-400/50 flex items-center justify-center text-sky-400">
                    <MapPin className="w-3 h-3" />
                  </div>
                  <span className="text-slate-400">Analysis Target Corridor:</span>
                  <span className="font-bold text-slate-100">{selectedLocation.name}</span>
                  <span className="font-mono text-[10px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">
                    {formatCoordinates(selectedLocation.lat, selectedLocation.lon)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setActivePage('home')}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-sky-400 transition-colors cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Return to India Map</span>
                </button>
              </div>
            )}

            {/* Main 3-Region Workspace Layout */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
              {/* Left Control Panel */}
              <Sidebar
                datasets={datasets}
                selectedDatasetId={selectedDatasetId}
                onSelectDataset={handleSelectDataset}
                samples={samples}
                selectedSampleId={selectedSampleId}
                onSelectSample={handleSelectSample}
                isLoading={isDataLoading}
                onUploadCustom={handleUploadCustom}
                validation={validation}
                beforeMeta={beforeMeta}
                afterMeta={afterMeta}
                error={dataError}
                methods={methods}
                selectedMethod={selectedMethod}
                onMethodChange={setSelectedMethod}
                threshold={threshold}
                onThresholdChange={setThreshold}
                kernelSize={kernelSize}
                onKernelSizeChange={setKernelSize}
                minComponentSize={minComponentSize}
                onMinComponentSizeChange={setMinComponentSize}
                maskMode={maskMode}
                onMaskModeChange={setMaskMode}
                maskOpacity={maskOpacity}
                onMaskOpacityChange={setMaskOpacity}
                isProcessing={isProcessingJob}
                hasActiveJob={!!activeJob}
                onRunDetection={handleRunDetection}
              />

              {/* Center Satellite Comparison Workspace */}
              <main className="flex-1 p-2 min-w-0 min-h-0 flex flex-col">
                <SatelliteComparison
                  workspaceTab={workspaceTab}
                  onWorkspaceTabChange={setWorkspaceTab}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  beforeInput={beforeInput}
                  afterInput={afterInput}
                  showOverlay={showOverlay}
                  onToggleOverlay={() => setShowOverlay(!showOverlay)}
                  isGeoreferenced={validation?.georeferenced || false}
                  sourceCrs={validation?.source_crs || null}
                  bounds={validation?.overlap_bounds_wgs84 || null}
                  jobId={activeJob?.job_id || null}
                  maskMode={maskMode}
                  maskOpacity={maskOpacity}
                  vectorFeatures={jobResults?.geojson}
                  onRegionUpdated={handleRefreshJobResults}
                />
              </main>

              {/* Right Change Insights Analysis Sidebar */}
              <AnalysisSidebar
                job={activeJob}
                isProcessing={isProcessingJob}
                validation={validation}
                vectorFeatures={jobResults?.geojson}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
