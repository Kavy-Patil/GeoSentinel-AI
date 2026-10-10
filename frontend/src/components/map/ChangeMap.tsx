import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, ImageOverlay, GeoJSON, useMap } from 'react-leaflet';
import { 
  Globe, 
  Eye, 
  Sliders, 
  Maximize2, 
  Columns,
  Download,
  Building2,
  CheckCircle2,
  XCircle,
  Filter,
} from 'lucide-react';
import { GeoBoundsSchema } from '../../types/imagery';
import { ChangeFeatureCollection, ChangeFeature } from '../../types/india';
import { updateRegionReviewStatus, getJobExportUrl } from '../../api/india';

interface ChangeMapProps {
  jobId?: string | null;
  isGeoreferenced: boolean;
  sourceCrs: string | null;
  bounds: GeoBoundsSchema | null;
  beforePreviewUrl: string | null;
  afterPreviewUrl: string | null;
  changeOverlayUrl: string | null;
  vectorFeatures?: ChangeFeatureCollection | null;
  onRegionUpdated?: () => void;
  onSwitchToComparison?: () => void;
}

type MapLayerSelection = 'after' | 'before' | 'both';

// Map controller to invalidate size and re-fit bounds
const MapController: React.FC<{ 
  bounds: [[number, number], [number, number]] | null;
  fitTrigger: number;
}> = ({ bounds, fitTrigger }) => {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (bounds) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [map, bounds, fitTrigger]);

  return null;
};

export const ChangeMap: React.FC<ChangeMapProps> = ({
  jobId,
  isGeoreferenced,
  sourceCrs,
  bounds,
  beforePreviewUrl,
  afterPreviewUrl,
  changeOverlayUrl,
  vectorFeatures,
  onRegionUpdated,
  onSwitchToComparison,
}) => {
  // Layer & Visual Controls
  const [activeLayer, setActiveLayer] = useState<MapLayerSelection>('after');
  const [opacity, setOpacity] = useState<number>(0.9);
  const [fitTrigger, setFitTrigger] = useState<number>(0);

  // Display toggles: Clean Polygons DEFAULT TO TRUE, noisy raw raster mask DEFAULTS TO FALSE
  const [showPolygons, setShowPolygons] = useState<boolean>(true);
  const [showFilteredMask, setShowFilteredMask] = useState<boolean>(false);
  const [showRawDebugMask, setShowRawDebugMask] = useState<boolean>(false);

  // User Interactive Filters
  const [minAreaFilterHa, setMinAreaFilterHa] = useState<number>(0.0);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedFeature, setSelectedFeature] = useState<ChangeFeature | null>(null);

  const leafletBounds: [[number, number], [number, number]] | null = bounds
    ? [
        [bounds.min_lat, bounds.min_lon],
        [bounds.max_lat, bounds.max_lon],
      ]
    : null;

  const center: [number, number] = bounds
    ? [(bounds.min_lat + bounds.max_lat) / 2, (bounds.min_lon + bounds.max_lon) / 2]
    : [20.5937, 78.9629];

  const defaultZoom = bounds ? 14 : 5;

  const handleFitBounds = () => {
    setFitTrigger((prev) => prev + 1);
  };

  const handleUpdateStatus = async (regionId: string, status: string) => {
    if (!jobId) return;
    try {
      await updateRegionReviewStatus(jobId, regionId, status);
      if (selectedFeature && selectedFeature.properties.region_id === regionId) {
        setSelectedFeature({
          ...selectedFeature,
          properties: {
            ...selectedFeature.properties,
            review_status: status as any,
          },
        });
      }
      if (onRegionUpdated) onRegionUpdated();
    } catch (err) {
      console.error('Failed to update region status:', err);
    }
  };

  // Filter features based on user criteria
  const filteredVectorFeatures = useMemo(() => {
    if (!vectorFeatures || !vectorFeatures.features) return null;
    const filtered = vectorFeatures.features.filter((f) => {
      const p = f.properties;
      const passArea = p.area_ha >= minAreaFilterHa;
      const passSeverity = severityFilter === 'all' || p.severity === severityFilter;
      return passArea && passSeverity;
    });

    const totalFilteredArea = filtered.reduce((acc, curr) => acc + curr.properties.area_m2, 0);

    return {
      type: 'FeatureCollection' as const,
      features: filtered,
      summary: {
        ...vectorFeatures.summary,
        total_regions: filtered.length,
        total_area_m2: totalFilteredArea,
        total_area_ha: roundNum(totalFilteredArea / 10000.0, 3),
      },
    };
  }, [vectorFeatures, minAreaFilterHa, severityFilter]);

  function roundNum(val: number, dec: number = 2): number {
    return Math.round(val * Math.pow(10, dec)) / Math.pow(10, dec);
  }

  // Clean development polygon styling (Crisp outlines with semi-transparent fills)
  const getPolygonStyle = (feature: any) => {
    const isSelected = selectedFeature?.properties?.region_id === feature?.properties?.region_id;
    const sev = feature.properties?.severity;
    const rev = feature.properties?.review_status;

    let strokeColor = '#F97316'; // Vibrant orange
    let fillColor = '#EA580C';

    if (rev === 'confirmed') {
      strokeColor = '#10B981'; // Emerald
      fillColor = '#059669';
    } else if (rev === 'false_positive') {
      strokeColor = '#64748B'; // Slate
      fillColor = '#475569';
    } else if (sev === 'critical') {
      strokeColor = '#EF4444'; // Red
      fillColor = '#DC2626';
    } else if (sev === 'high') {
      strokeColor = '#F97316'; // Orange
      fillColor = '#EA580C';
    } else if (sev === 'medium') {
      strokeColor = '#F59E0B'; // Amber
      fillColor = '#D97706';
    } else {
      strokeColor = '#38BDF8'; // Sky blue
      fillColor = '#0284C7';
    }

    return {
      color: isSelected ? '#FFFFFF' : strokeColor,
      weight: isSelected ? 3.5 : 2.0,
      opacity: isSelected ? 1.0 : 0.9,
      fillColor: fillColor,
      fillOpacity: isSelected ? 0.60 : 0.40,
    };
  };

  const rawMaskUrl = jobId ? `/api/jobs/${jobId}/images/raw_mask` : null;

  return (
    <div className="relative w-full h-full min-h-[480px] bg-[#070D17] border border-slate-700/80 rounded-xl overflow-hidden flex flex-col select-none shadow-2xl">
      {/* 1. Main GIS Top Toolbar */}
      <div className="h-13 bg-[#0d1624]/95 border-b border-slate-800 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2.5 z-20 text-xs">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
            Geographic Development Analysis
          </span>
          {isGeoreferenced ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold uppercase">
              GEOREFERENCED • {sourceCrs || 'WGS84'}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/40 font-semibold uppercase">
              PIXEL BENCHMARK
            </span>
          )}
        </div>

        {/* Layer Selection & Comparison Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Baseline / Modern Switcher */}
          <div className="flex bg-slate-900/90 border border-slate-700 p-0.5 rounded-lg text-[10px]">
            <button
              onClick={() => setActiveLayer('after')}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                activeLayer === 'after'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Modern (T2)
            </button>
            <button
              onClick={() => setActiveLayer('before')}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                activeLayer === 'before'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Baseline (T1)
            </button>
            <button
              onClick={() => setActiveLayer('both')}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                activeLayer === 'both'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dual Blend
            </button>
          </div>

          {/* Development Polygons Toggle (DEFAULT TRUE) */}
          {filteredVectorFeatures && (
            <button
              type="button"
              onClick={() => setShowPolygons(!showPolygons)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-semibold transition-all ${
                showPolygons
                  ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-orange-500 text-orange-300 shadow'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3 h-3 text-orange-400" />
              <span>Development Polygons ({filteredVectorFeatures.features.length})</span>
            </button>
          )}

          {/* Filtered Mask Toggle (OPTIONAL) */}
          {changeOverlayUrl && (
            <button
              type="button"
              onClick={() => setShowFilteredMask(!showFilteredMask)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium transition-all ${
                showFilteredMask
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Filtered Mask</span>
            </button>
          )}

          {/* Raw Debug Mask Toggle (DEBUG ONLY) */}
          {rawMaskUrl && (
            <button
              type="button"
              onClick={() => setShowRawDebugMask(!showRawDebugMask)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium transition-all ${
                showRawDebugMask
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                  : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
              title="Advanced Debug Layer: View unthresholded raw pixel mask"
            >
              <span>Raw (Debug)</span>
            </button>
          )}

          {/* Opacity Control */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-700 text-[10px]">
            <Sliders className="w-3 h-3 text-slate-400" />
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-12 accent-orange-500 cursor-pointer h-1"
              title={`Opacity: ${Math.round(opacity * 100)}%`}
            />
          </div>

          {/* Fit Imagery */}
          <button
            type="button"
            onClick={handleFitBounds}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-slate-100 transition-colors text-[10px]"
          >
            <Maximize2 className="w-3 h-3 text-cyan-400" />
            <span>Fit</span>
          </button>

          {/* GeoJSON Export */}
          {jobId && (
            <a
              href={getJobExportUrl(jobId)}
              download
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 transition-colors text-[10px] font-semibold"
            >
              <Download className="w-3 h-3 text-emerald-400" />
              <span>Export GIS</span>
            </a>
          )}

          {/* Comparison View */}
          {onSwitchToComparison && (
            <button
              type="button"
              onClick={onSwitchToComparison}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 transition-all text-[10px] font-medium"
            >
              <Columns className="w-3 h-3 text-orange-400" />
              <span>Split View</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Secondary Filter & KPI Metric Bar */}
      {filteredVectorFeatures && (
        <div className="bg-[#09101d]/90 border-b border-slate-800 px-3.5 py-1.5 flex flex-wrap items-center justify-between gap-3 text-[11px] z-10">
          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-slate-300">
              <span className="text-slate-400">Total Development:</span>
              <strong className="text-orange-400 font-mono">
                {filteredVectorFeatures.summary.total_area_ha} ha
              </strong>
              <span className="text-slate-500 font-mono text-[10px]">
                ({filteredVectorFeatures.summary.total_area_m2.toLocaleString()} m²)
              </span>
            </div>
            <div className="h-3 w-px bg-slate-700 hidden sm:block"></div>
            <div className="flex items-center gap-1 text-slate-300">
              <span className="text-slate-400">Clusters:</span>
              <strong className="text-cyan-300 font-mono">{filteredVectorFeatures.features.length}</strong>
            </div>
          </div>

          {/* Filter Controls: Minimum Area & Severity */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <Filter className="w-3 h-3 text-cyan-400" />
              <span>Min Area:</span>
              <select
                value={minAreaFilterHa}
                onChange={(e) => setMinAreaFilterHa(parseFloat(e.target.value))}
                className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-200 outline-none"
              >
                <option value={0.0}>All Sizes (≥ 100 m²)</option>
                <option value={0.1}>≥ 0.1 ha (1,000 m²)</option>
                <option value={0.5}>≥ 0.5 ha (5,000 m²)</option>
                <option value={1.0}>≥ 1.0 ha (10,000 m²)</option>
                <option value={5.0}>≥ 5.0 ha (Major Clusters)</option>
              </select>
            </div>

            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <span>Severity:</span>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-200 outline-none"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical / Urgent</option>
                <option value="high">High Expansion</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Interactive Leaflet Map Container */}
      <div className="relative flex-1 w-full h-full min-h-[400px]">
        <MapContainer
          center={center}
          zoom={defaultZoom}
          scrollWheelZoom={true}
          zoomControl={false}
          className="w-full h-full"
          style={{ height: '100%', width: '100%', background: '#070D17' }}
        >
          {/* Base Map Layer: Esri Dark Canvas */}
          <TileLayer
            attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            maxZoom={16}
          />

          <MapController bounds={leafletBounds} fitTrigger={fitTrigger} />

          {/* Satellite Image Overlays */}
          {isGeoreferenced && leafletBounds && (
            <>
              {/* T1 Baseline Raster */}
              {beforePreviewUrl && (activeLayer === 'before' || activeLayer === 'both') && (
                <ImageOverlay
                  url={beforePreviewUrl}
                  bounds={leafletBounds}
                  opacity={opacity}
                  zIndex={10}
                />
              )}

              {/* T2 Modern Raster */}
              {afterPreviewUrl && (activeLayer === 'after' || activeLayer === 'both') && (
                <ImageOverlay
                  url={afterPreviewUrl}
                  bounds={leafletBounds}
                  opacity={opacity}
                  zIndex={11}
                />
              )}

              {/* Optional Filtered Mask */}
              {changeOverlayUrl && showFilteredMask && (
                <ImageOverlay
                  url={changeOverlayUrl}
                  bounds={leafletBounds}
                  opacity={opacity * 0.85}
                  zIndex={14}
                />
              )}

              {/* Optional Raw Debug Mask */}
              {rawMaskUrl && showRawDebugMask && (
                <ImageOverlay
                  url={rawMaskUrl}
                  bounds={leafletBounds}
                  opacity={opacity * 0.60}
                  zIndex={13}
                />
              )}

              {/* Clean Vector GeoJSON Development Polygons (DEFAULT VIEW) */}
              {filteredVectorFeatures && showPolygons && (
                <GeoJSON
                  key={`geojson-${jobId}-${filteredVectorFeatures.features.length}-${minAreaFilterHa}-${severityFilter}`}
                  data={filteredVectorFeatures as any}
                  style={getPolygonStyle}
                  eventHandlers={{
                    click: (e) => {
                      if (e.layer && (e.layer as any).feature) {
                        setSelectedFeature((e.layer as any).feature);
                      }
                    },
                  }}
                  onEachFeature={(feature, layer) => {
                    const props = feature.properties || {};
                    layer.bindTooltip(
                      `<div class="font-sans text-xs">
                        <strong class="text-orange-400">${props.region_id}</strong>: ${props.area_ha} ha
                        <span class="block text-[10px] text-slate-300 font-normal">${props.development_label || props.severity}</span>
                      </div>`,
                      {
                        sticky: true,
                        direction: 'top',
                        className: 'custom-polygon-tooltip bg-slate-900/95 text-slate-100 border border-slate-700 px-2 py-1 rounded shadow-xl',
                      }
                    );
                  }}
                />
              )}
            </>
          )}
        </MapContainer>

        {/* 4. Floating Selected Polygon Inspector Card */}
        {selectedFeature && (
          <div className="absolute bottom-5 right-5 z-20 max-w-xs w-full bg-[#09101d]/95 backdrop-blur-xl border border-slate-700/90 rounded-2xl p-4 shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-start justify-between border-b border-slate-800 pb-2">
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-sm text-orange-400 font-mono">
                    {selectedFeature.properties.region_id}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-800 text-slate-300 border border-slate-700">
                    {selectedFeature.properties.severity.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  {selectedFeature.properties.development_label || 'Development Cluster'}
                </p>
              </div>
              <button
                onClick={() => setSelectedFeature(null)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/40">
                <span className="text-slate-400 block text-[10px]">Ground Area</span>
                <span className="text-orange-400 font-bold font-mono">
                  {selectedFeature.properties.area_ha} ha
                </span>
                <span className="text-slate-500 block text-[9px]">
                  ({selectedFeature.properties.area_m2.toLocaleString()} m²)
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/40">
                <span className="text-slate-400 block text-[10px]">Change Magnitude</span>
                <span className="text-cyan-400 font-bold font-mono">
                  {Math.round(selectedFeature.properties.magnitude * 100)}%
                </span>
                <span className="text-slate-500 block text-[9px]">
                  Spectral Index Shift
                </span>
              </div>
            </div>

            {/* Human Verification Review Controls */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Human Analyst Verification
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleUpdateStatus(selectedFeature.properties.region_id, 'confirmed')}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold flex items-center justify-center space-x-1 transition-all ${
                    selectedFeature.properties.review_status === 'confirmed'
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-slate-800 text-emerald-400 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Confirm</span>
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedFeature.properties.region_id, 'false_positive')}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold flex items-center justify-center space-x-1 transition-all ${
                    selectedFeature.properties.review_status === 'false_positive'
                      ? 'bg-rose-500 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  <XCircle className="w-3 h-3" />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
