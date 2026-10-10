import React, { useState, useEffect } from 'react';
import {
  Satellite,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  X,
  History,
  Activity,
  Sliders,
  Cloud,
} from 'lucide-react';
import {
  IndiaPlace,
  STACScene,
  HistoricalSearchResponse,
} from '../../types/india';
import {
  searchSatelliteImagery,
  acquireSatelliteImagery,
  searchHistoricalImagery,
  acquireHistoricalImagery,
} from '../../api/india';
import { createJob } from '../../api/detection';

interface SatelliteDiscoveryDrawerProps {
  place: IndiaPlace | null;
  customBbox: [number, number, number, number] | null;
  isOpen: boolean;
  onClose: () => void;
  onJobCreated: (jobId: string, locationName: string, bounds: any) => void;
}

const HISTORICAL_YEAR_OPTIONS = [2000, 2005, 2010, 2015, 2020, 2025, 2026];

export const SatelliteDiscoveryDrawer: React.FC<SatelliteDiscoveryDrawerProps> = ({
  place,
  customBbox,
  isOpen,
  onClose,
  onJobCreated,
}) => {
  const [activeTab, setActiveTab] = useState<'historical' | 'sentinel2'>('historical');
  const [loading, setLoading] = useState(false);
  const [acquiring, setAcquiring] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Historical Landsat State (2000–2026) ---
  const [yearBefore, setYearBefore] = useState<number>(2000);
  const [yearAfter, setYearAfter] = useState<number>(2026);
  const [historicalSearch, setHistoricalSearch] = useState<HistoricalSearchResponse | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('urban_encroachment');

  // --- Live Sentinel-2 State ---
  const [scenes, setScenes] = useState<STACScene[]>([]);
  const [selectedBeforeScene, setSelectedBeforeScene] = useState<string | null>(null);
  const [selectedAfterScene, setSelectedAfterScene] = useState<string | null>(null);

  // Common Controls
  const [maxCloudCover, setMaxCloudCover] = useState<number>(25);
  const [radiusKm, setRadiusKm] = useState<number>(place?.default_radius_km || 3.5);
  const [detectionThreshold, setDetectionThreshold] = useState<number>(0.35);

  const cityId = place?.id || 'pune';

  // Derive bounding box
  const effectiveBbox: [number, number, number, number] = React.useMemo(() => {
    if (customBbox) return customBbox;
    const lat = place?.lat || 18.5204;
    const lon = place?.lon || (place?.lng as number) || 73.8567;
    const latDelta = (radiusKm * 1000) / 111320;
    const lonDelta = (radiusKm * 1000) / (111320 * Math.cos((lat * Math.PI) / 180));
    return [
      lon - lonDelta,
      lat - latDelta,
      lon + lonDelta,
      lat + latDelta,
    ];
  }, [place, customBbox, radiusKm]);

  // Load Historical Timeline when Drawer Opens or City changes
  useEffect(() => {
    if (!isOpen) return;

    const loadHistoricalData = async () => {
      setLoading(true);
      setError(null);
      try {
        const sRes = await searchHistoricalImagery({
          city_id: cityId,
          year_before: yearBefore,
          year_after: yearAfter,
          bbox: effectiveBbox,
          max_cloud_cover: maxCloudCover,
        });
        setHistoricalSearch(sRes);
      } catch (err: any) {
        console.error('Failed to load historical Landsat catalog:', err);
        setError(err.message || 'Failed to query historical Landsat STAC catalog.');
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === 'historical') {
      loadHistoricalData();
    }
  }, [isOpen, cityId, yearBefore, yearAfter, activeTab, effectiveBbox, maxCloudCover]);

  // Load Sentinel-2 Live Scenes when Sentinel-2 tab is active
  useEffect(() => {
    if (!isOpen || activeTab !== 'sentinel2') return;

    const loadS2Scenes = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await searchSatelliteImagery({
          bbox: effectiveBbox,
          date_range_start: '2024-01-01',
          date_range_end: '2026-03-01',
          max_cloud_cover: maxCloudCover,
          limit: 8,
        });

        if (res.success && res.scenes.length > 0) {
          setScenes(res.scenes);
          setSelectedBeforeScene(res.scenes[0].scene_id);
          setSelectedAfterScene(res.scenes[res.scenes.length - 1].scene_id);
        } else {
          setError(res.error || 'No cloud-free Sentinel-2 scenes found for this area.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to communicate with Sentinel-2 STAC catalog.');
      } finally {
        setLoading(false);
      }
    };

    loadS2Scenes();
  }, [isOpen, activeTab, effectiveBbox, maxCloudCover]);

  // Execute Historical Landsat Acquisition & Change Detection
  const handleHistoricalAcquireAndDetect = async () => {
    if (yearBefore >= yearAfter) {
      setError('Before Year must be strictly earlier than After Year.');
      return;
    }

    setAcquiring(true);
    setError(null);
    setStatusMessage(`Retrieving 30m Landsat C2 L2 rasters for ${yearBefore} vs ${yearAfter}...`);

    try {
      // 1. Acquire & Stage Historical Landsat Pair
      const acqRes = await acquireHistoricalImagery({
        city_id: cityId,
        year_before: yearBefore,
        year_after: yearAfter,
        bbox: effectiveBbox,
        location_name: `${place?.name || 'Selected City'} (${yearBefore} vs ${yearAfter})`,
      });

      setStatusMessage(`Running ${selectedMethod.replace('_', ' ').toUpperCase()} analysis & vector polygonization...`);

      // 2. Dispatch Change Detection Job
      const jobRes = await createJob({
        before_image_id: acqRes.before_image_id,
        after_image_id: acqRes.after_image_id,
        method: selectedMethod,
        threshold: detectionThreshold,
        kernel_size: 3,
        min_component_size: 15,
      });

      setStatusMessage('Calculating ground area metrics (m², ha) and spatial centroids...');

      setTimeout(() => {
        setAcquiring(false);
        setStatusMessage(null);
        onJobCreated(jobRes.job_id, acqRes.location_name, acqRes.bounds_wgs84);
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Historical change detection job failed.');
      setAcquiring(false);
      setStatusMessage(null);
    }
  };

  // Execute Sentinel-2 Acquisition & Change Detection
  const handleSentinel2AcquireAndDetect = async () => {
    if (!selectedBeforeScene || !selectedAfterScene) {
      setError('Please select both a Before (T1) and After (T2) satellite scene.');
      return;
    }

    setAcquiring(true);
    setError(null);
    setStatusMessage('Acquiring Sentinel-2 L2A COGs from AWS Earth Search...');

    try {
      const acqRes = await acquireSatelliteImagery({
        before_scene_id: selectedBeforeScene,
        after_scene_id: selectedAfterScene,
        bbox: effectiveBbox,
        location_name: `${place?.name || 'Selected City'} Sentinel-2`,
      });

      setStatusMessage('Executing change detection and extracting GeoJSON vector footprints...');

      const jobRes = await createJob({
        before_image_id: acqRes.before_image_id,
        after_image_id: acqRes.after_image_id,
        method: selectedMethod,
        threshold: detectionThreshold,
        kernel_size: 3,
        min_component_size: 15,
      });

      setTimeout(() => {
        setAcquiring(false);
        setStatusMessage(null);
        onJobCreated(jobRes.job_id, acqRes.location_name, acqRes.bounds_wgs84);
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Failed to acquire or analyze satellite pair.');
      setAcquiring(false);
      setStatusMessage(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-lg bg-[#09101d]/98 backdrop-blur-2xl border-l border-slate-700/80 shadow-2xl flex flex-col transition-transform animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">
              Satellite Change Discovery
            </h2>
            <p className="text-[11px] text-slate-400">
              {place ? `${place.name}, ${place.state}` : 'Selected Indian Corridor'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs: Historical (2000–2026) vs Sentinel-2 (10m Recent) */}
      <div className="flex border-b border-slate-800 bg-slate-900/40 p-1.5 gap-1.5">
        <button
          onClick={() => setActiveTab('historical')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
            activeTab === 'historical'
              ? 'bg-cyan-500 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Historical (2000–2026)</span>
        </button>
        <button
          onClick={() => setActiveTab('sentinel2')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
            activeTab === 'sentinel2'
              ? 'bg-cyan-500 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Satellite className="w-3.5 h-3.5" />
          <span>Sentinel-2 (10m Live)</span>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: HISTORICAL LANDSAT TIMELINE (2000–2026) */}
        {activeTab === 'historical' && (
          <div className="space-y-4">
            {/* Timeline Year Pill Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                <span className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Historical Milestone Timeline</span>
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">Landsat C2 L2 (30m)</span>
              </div>

              {/* Year Pills Bar */}
              <div className="grid grid-cols-7 gap-1">
                {HISTORICAL_YEAR_OPTIONS.map((yr) => {
                  const isBefore = yearBefore === yr;
                  const isAfter = yearAfter === yr;
                  return (
                    <button
                      key={yr}
                      onClick={() => {
                        if (yr < yearAfter) {
                          setYearBefore(yr);
                        } else if (yr > yearBefore) {
                          setYearAfter(yr);
                        }
                      }}
                      className={`py-1.5 px-1 rounded-lg text-[11px] font-mono font-bold transition-all text-center ${
                        isBefore
                          ? 'bg-emerald-500 text-white ring-2 ring-emerald-400/50 shadow'
                          : isAfter
                          ? 'bg-orange-500 text-white ring-2 ring-orange-400/50 shadow'
                          : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700/80'
                      }`}
                    >
                      {yr}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  <span>T1 Before: <strong className="text-slate-200 font-mono">{yearBefore}</strong></span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span>
                  <span>T2 After: <strong className="text-slate-200 font-mono">{yearAfter}</strong></span>
                </span>
              </div>
            </div>

            {/* Year Comparison Pickers */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Before Year Selector */}
              <div className="p-3 rounded-xl bg-slate-800/50 border border-emerald-500/30 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center justify-between">
                  <span>T1 Before Year</span>
                  <span className="text-[9px] px-1 bg-emerald-950/80 rounded border border-emerald-700/40">Baseline</span>
                </span>
                <select
                  value={yearBefore}
                  onChange={(e) => setYearBefore(parseInt(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500 font-mono"
                >
                  {HISTORICAL_YEAR_OPTIONS.filter((y) => y < yearAfter).map((y) => (
                    <option key={y} value={y}>
                      Year {y} ({y < 2013 ? 'Landsat-5 TM' : 'Landsat-8 OLI'})
                    </option>
                  ))}
                </select>
                {historicalSearch?.before_scene && (
                  <div className="text-[10px] text-slate-400 space-y-0.5 pt-1">
                    <div className="text-slate-300 font-medium truncate">{historicalSearch.before_scene.platform}</div>
                    <div className="font-mono text-slate-400">{new Date(historicalSearch.before_scene.datetime).toLocaleDateString()}</div>
                    <div className="text-emerald-400">Valid Pixels: {historicalSearch.before_scene.valid_pixel_pct}%</div>
                  </div>
                )}
              </div>

              {/* After Year Selector */}
              <div className="p-3 rounded-xl bg-slate-800/50 border border-orange-500/30 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-orange-400 flex items-center justify-between">
                  <span>T2 After Year</span>
                  <span className="text-[9px] px-1 bg-orange-950/80 rounded border border-orange-700/40">Modern</span>
                </span>
                <select
                  value={yearAfter}
                  onChange={(e) => setYearAfter(parseInt(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-orange-500 font-mono"
                >
                  {HISTORICAL_YEAR_OPTIONS.filter((y) => y > yearBefore).map((y) => (
                    <option key={y} value={y}>
                      Year {y} ({y >= 2021 ? 'Landsat-9 OLI-2' : 'Landsat-8 OLI'})
                    </option>
                  ))}
                </select>
                {historicalSearch?.after_scene && (
                  <div className="text-[10px] text-slate-400 space-y-0.5 pt-1">
                    <div className="text-slate-300 font-medium truncate">{historicalSearch.after_scene.platform}</div>
                    <div className="font-mono text-slate-400">{new Date(historicalSearch.after_scene.datetime).toLocaleDateString()}</div>
                    <div className="text-emerald-400">Valid Pixels: {historicalSearch.after_scene.valid_pixel_pct}%</div>
                  </div>
                )}
              </div>
            </div>

            {/* Remote Sensing Method Selector */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-200 flex items-center space-x-1">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Detection Algorithm</span>
              </span>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
              >
                <option value="urban_encroachment">
                  Multi-Index Urban Encroachment (NDBI + NDVI 30m) [Recommended]
                </option>
                <option value="ndbi_diff">
                  NDBI Built-Up Expansion Differencing (SWIR1 - NIR)
                </option>
                <option value="ndvi_diff">
                  NDVI Vegetation Loss Index (NIR - Red)
                </option>
                <option value="classical">
                  Classical Computer Vision (RGB Spectral Diff & Morphology)
                </option>
              </select>
            </div>

            {/* Metadata & Calibration Specs Badge */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1 text-[11px] text-slate-400">
              <div className="flex items-center justify-between text-slate-300 font-medium">
                <span>STAC Collection</span>
                <span className="font-mono text-cyan-400">landsat-c2-l2</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Surface Reflectance</span>
                <span className="font-mono text-slate-300">DN × 0.0000275 − 0.2</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Analysis Resolution</span>
                <span className="font-mono text-emerald-400">30.0m GSD</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Cloud & QA Filtering</span>
                <span className="text-slate-300">QA_PIXEL Bitmask Enabled</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SENTINEL-2 LIVE ACQUISITION */}
        {activeTab === 'sentinel2' && (
          <div className="space-y-4">
            <div className="space-y-2.5">
              <span className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Available Sentinel-2 L2A Passes (10m GSD)</span>
              </span>

              {loading ? (
                <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                  <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin mx-auto" />
                  <p>Querying Element 84 Earth Search STAC catalog...</p>
                </div>
              ) : scenes.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 text-center text-xs text-slate-400">
                  No Sentinel-2 scenes found for this area.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-400">T1 Before Acquisition</span>
                    <select
                      value={selectedBeforeScene || ''}
                      onChange={(e) => setSelectedBeforeScene(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none"
                    >
                      {scenes.map((s) => (
                        <option key={s.scene_id} value={s.scene_id}>
                          {s.datetime ? new Date(s.datetime).toLocaleDateString() : s.scene_id} (Cloud: {s.cloud_cover}%)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1">
                    <span className="text-[10px] font-bold text-orange-400">T2 After Acquisition</span>
                    <select
                      value={selectedAfterScene || ''}
                      onChange={(e) => setSelectedAfterScene(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none"
                    >
                      {scenes.map((s) => (
                        <option key={s.scene_id} value={s.scene_id}>
                          {s.datetime ? new Date(s.datetime).toLocaleDateString() : s.scene_id} (Cloud: {s.cloud_cover}%)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Spatial Radius & Sensitivity Controls */}
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-medium text-slate-300">
              <span className="flex items-center space-x-1">
                <Sliders className="w-3 h-3 text-cyan-400" />
                <span>Detection Sensitivity</span>
              </span>
              <span className="text-cyan-400 font-mono">{(detectionThreshold * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.15"
              max="0.70"
              step="0.05"
              value={detectionThreshold}
              onChange={(e) => setDetectionThreshold(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-700 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-medium text-slate-300">
              <span className="flex items-center space-x-1">
                <Cloud className="w-3 h-3 text-cyan-400" />
                <span>Max Cloud Cover</span>
              </span>
              <span className="text-cyan-400 font-mono">{maxCloudCover}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={maxCloudCover}
              onChange={(e) => setMaxCloudCover(parseInt(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-700 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-medium text-slate-300">
              <span>AOI Radius</span>
              <span className="text-cyan-400 font-mono">{radiusKm.toFixed(1)} km</span>
            </div>
            <input
              type="range"
              min="1.5"
              max="8.0"
              step="0.5"
              value={radiusKm}
              onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-700 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Footer Action Button */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/90 space-y-2">
        {statusMessage && (
          <div className="text-[11px] text-cyan-300 animate-pulse flex items-center justify-center space-x-2 py-1">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            <span>{statusMessage}</span>
          </div>
        )}
        <button
          onClick={
            activeTab === 'historical'
              ? handleHistoricalAcquireAndDetect
              : handleSentinel2AcquireAndDetect
          }
          disabled={acquiring || loading}
          className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-lg ${
            acquiring || loading
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25'
          }`}
        >
          {acquiring ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Processing Historical Landsat Imagery...</span>
            </>
          ) : activeTab === 'historical' ? (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Compare {yearBefore} vs {yearAfter} & Detect Changes</span>
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Acquire Sentinel-2 & Run Detection</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
