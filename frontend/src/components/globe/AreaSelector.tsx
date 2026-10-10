import React from 'react';
import { Target, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import { SelectedLocation } from '../../types/geography';
import { calculateGeographicBoundingBox, formatCoordinates } from '../../utils/geodesic';

interface AreaSelectorProps {
  location: SelectedLocation;
  radiusKm: number;
  onRadiusChange: (radiusKm: number) => void;
  onConfirmArea: (locationWithBounds: SelectedLocation) => void;
}

const RADIUS_OPTIONS = [5, 10, 25, 50];

export const AreaSelector: React.FC<AreaSelectorProps> = ({
  location,
  radiusKm,
  onRadiusChange,
  onConfirmArea,
}) => {
  const bounds = calculateGeographicBoundingBox(location.lat, location.lon, radiusKm);
  const areaSqKm = Math.round(Math.PI * radiusKm * radiusKm);

  const handleConfirm = () => {
    onConfirmArea({
      ...location,
      radiusKm,
      bounds,
    });
  };

  return (
    <div className="bg-[#111B2A]/90 backdrop-blur-xl border border-[#263449] hover:border-[#38BDF8]/40 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)] text-xs text-[#F3F6FC] max-w-sm w-full select-none transition-all animate-in fade-in slide-in-from-bottom-3 duration-200">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-[#070D17] border border-[#38BDF8]/40 flex items-center justify-center text-[#38BDF8] shadow-[0_0_12px_rgba(56,189,248,0.2)] shrink-0">
          <Target className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-[#F3F6FC]">
            Area Selection: {location.name}
          </h3>
          <span className="text-[10px] text-[#94A3B8] font-mono">
            {formatCoordinates(location.lat, location.lon)}
          </span>
        </div>
      </div>

      {/* Radius Selector Pills */}
      <div className="mb-3 space-y-1.5">
        <label className="text-[10px] uppercase tracking-wider font-semibold text-[#94A3B8] flex items-center justify-between">
          <span>Observation Radius</span>
          <span className="text-[#38BDF8] font-mono">{radiusKm} km (~{areaSqKm} km²)</span>
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRadiusChange(r)}
              className={`py-1.5 rounded-lg font-mono text-xs font-semibold border transition-all cursor-pointer ${
                radiusKm === r
                  ? 'bg-[#38BDF8] text-[#070D17] border-[#38BDF8] shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                  : 'bg-[#070D17]/80 text-[#94A3B8] border-[#263449] hover:text-[#F3F6FC] hover:border-[#38BDF8]/40'
              }`}
            >
              {r} km
            </button>
          ))}
        </div>
      </div>

      {/* Computed Geodesic Bounding Box */}
      <div className="p-2.5 rounded-xl bg-[#070D17]/80 border border-[#263449] space-y-1 font-mono text-[10px] text-[#94A3B8] mb-3">
        <div className="text-[10px] uppercase font-bold text-[#38BDF8] tracking-wider mb-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#38BDF8]" />
          WGS84 Geodesic Footprint
        </div>
        <div className="flex justify-between">
          <span>Latitude Extent:</span>
          <span className="text-[#F3F6FC]">{bounds.min_lat.toFixed(4)}° to {bounds.max_lat.toFixed(4)}°</span>
        </div>
        <div className="flex justify-between">
          <span>Longitude Extent:</span>
          <span className="text-[#F3F6FC]">{bounds.min_lon.toFixed(4)}° to {bounds.max_lon.toFixed(4)}°</span>
        </div>
      </div>

      {/* Action Button */}
      <button
        type="button"
        onClick={handleConfirm}
        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FF8617] to-[#F59E0B] hover:from-[#EA580C] hover:to-[#D97706] text-[#070D17] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(255,134,23,0.3)] hover:shadow-[0_4px_24px_rgba(255,134,23,0.5)] cursor-pointer"
      >
        <ShieldAlert className="w-4 h-4 text-[#070D17]" />
        <span>Open in Change Monitor</span>
        <ArrowRight className="w-4 h-4 text-[#070D17]" />
      </button>
    </div>
  );
};
