import React from 'react';
import { 
  Globe, 
  Layers, 
  Maximize2, 
  Compass, 
  AlertTriangle, 
  Shield, 
  Percent
} from 'lucide-react';
import { ImageryValidationResponse, RasterMetadataResponse, DatasetSummary } from '../../types/imagery';

interface DatasetInfoProps {
  dataset: DatasetSummary | null;
  validation: ImageryValidationResponse | null;
  beforeMeta?: RasterMetadataResponse | null;
  afterMeta?: RasterMetadataResponse | null;
}

export const DatasetInfo: React.FC<DatasetInfoProps> = ({
  dataset,
  validation,
}) => {
  if (!validation) return null;

  const isGeoreferenced = validation.georeferenced;
  const bounds = validation.overlap_bounds_wgs84;

  return (
    <div className="p-3.5 rounded-lg bg-[#151D26] border border-[#34404C] space-y-3 select-none text-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#34404C]">
        <div className="flex items-center gap-2">
          <Globe className={`w-4 h-4 ${isGeoreferenced ? 'text-[#06B6D4]' : 'text-[#FF8617]'}`} />
          <span className="font-bold text-xs uppercase tracking-wider text-[#F3F6FA]">
            {dataset ? dataset.name : 'Custom GeoTIFF Pair'}
          </span>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border ${
            isGeoreferenced
              ? 'bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/40'
              : 'bg-[#FF8617]/15 text-[#FF8617] border-[#FF8617]/40'
          }`}
        >
          {isGeoreferenced ? 'GEOREFERENCED (GIS)' : 'PIXEL-COORDINATE'}
        </span>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded bg-[#0B1118] border border-[#34404C]">
          <span className="text-[10px] text-[#AAB8C6] uppercase font-semibold flex items-center gap-1">
            <Maximize2 className="w-3 h-3 text-[#3B82F6]" /> Dimensions
          </span>
          <span className="font-mono text-xs text-[#F3F6FA] font-medium block mt-0.5">
            {validation.width} × {validation.height} px
          </span>
        </div>

        <div className="p-2 rounded bg-[#0B1118] border border-[#34404C]">
          <span className="text-[10px] text-[#AAB8C6] uppercase font-semibold flex items-center gap-1">
            <Layers className="w-3 h-3 text-[#FF8617]" /> Spectral Bands
          </span>
          <span className="font-mono text-xs text-[#F3F6FA] font-medium block mt-0.5">
            {validation.bands} {validation.bands >= 4 ? 'Bands (MSI)' : 'Bands (RGB)'}
          </span>
        </div>

        <div className="p-2 rounded bg-[#0B1118] border border-[#34404C]">
          <span className="text-[10px] text-[#AAB8C6] uppercase font-semibold flex items-center gap-1">
            <Compass className="w-3 h-3 text-[#06B6D4]" /> Source CRS
          </span>
          <span className="font-mono text-xs text-[#06B6D4] font-medium block mt-0.5 truncate">
            {validation.source_crs || 'None (Image Space)'}
          </span>
        </div>

        <div className="p-2 rounded bg-[#0B1118] border border-[#34404C]">
          <span className="text-[10px] text-[#AAB8C6] uppercase font-semibold flex items-center gap-1">
            <Percent className="w-3 h-3 text-[#22C55E]" /> Valid Overlap
          </span>
          <span className="font-mono text-xs text-[#22C55E] font-medium block mt-0.5">
            {validation.valid_pixel_pct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Geographic Coordinates Bounds (if georeferenced) */}
      {isGeoreferenced && bounds && (
        <div className="p-2 rounded bg-[#0B1118] border border-[#34404C] space-y-1">
          <span className="text-[10px] text-[#AAB8C6] uppercase font-semibold block">
            WGS84 Extent [Bounding Box]
          </span>
          <div className="font-mono text-[10px] text-[#F3F6FA] grid grid-cols-2 gap-1">
            <div>Lon: {bounds.min_lon.toFixed(4)}° → {bounds.max_lon.toFixed(4)}°</div>
            <div>Lat: {bounds.min_lat.toFixed(4)}° → {bounds.max_lat.toFixed(4)}°</div>
          </div>
        </div>
      )}

      {/* Warnings & Alignment Notes */}
      {validation.warnings.length > 0 && (
        <div className="p-2 rounded bg-[#F59E0B]/10 border border-[#F59E0B]/30 space-y-1">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-[#F59E0B]">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Alignment & Preprocessing Notes</span>
          </div>
          <ul className="text-[10px] text-[#AAB8C6] list-disc list-inside space-y-0.5">
            {validation.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Dataset Attribution & License */}
      {dataset && (dataset.license || dataset.attribution) && (
        <div className="pt-2 border-t border-[#34404C] space-y-1 text-[10px] text-[#AAB8C6]">
          {dataset.license && (
            <div className="flex items-center gap-1 text-[#AAB8C6]">
              <Shield className="w-3 h-3 text-[#FF8617]" />
              <span>License: <strong className="text-[#F3F6FA]">{dataset.license}</strong></span>
            </div>
          )}
          {dataset.attribution && (
            <p className="text-[9px] text-[#AAB8C6]/80 italic line-clamp-2">
              Source: {dataset.attribution}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
