import React from 'react';
import { 
  MapPin, 
  ArrowRight, 
  Globe, 
  Compass, 
  Layers, 
  CheckCircle2,
  X
} from 'lucide-react';
import { SelectedLocation } from '../../types/geography';
import { formatCoordinates } from '../../utils/geodesic';

interface LocationInfoPanelProps {
  location: SelectedLocation;
  onAnalyzeArea: (location: SelectedLocation) => void;
  onClose?: () => void;
}

export const LocationInfoPanel: React.FC<LocationInfoPanelProps> = ({
  location,
  onAnalyzeArea,
  onClose,
}) => {
  return (
    <div className="bg-[#111B2A]/90 backdrop-blur-xl border border-[#263449] hover:border-[#38BDF8]/40 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)] text-xs text-[#F3F6FC] max-w-sm w-full select-none transition-all animate-in fade-in slide-in-from-bottom-3 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#070D17] border border-[#38BDF8]/40 flex items-center justify-center text-[#38BDF8] shadow-[0_0_12px_rgba(56,189,248,0.2)] shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-[#F3F6FC] truncate">
              {location.name}
            </h3>
            <span className="text-[10px] text-[#94A3B8] font-mono block truncate">
              {location.category || 'Target Site'}
            </span>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-[#94A3B8] hover:text-[#F3F6FC] transition-colors p-1 rounded-lg"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Coordinate & Geodesic Telemetry */}
      <div className="p-2.5 rounded-xl bg-[#070D17]/80 border border-[#263449] space-y-1.5 mb-3 font-mono text-[11px]">
        <div className="flex items-center justify-between text-[#94A3B8]">
          <span className="flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Coordinates:</span>
          </span>
          <span className="text-[#F3F6FC] font-semibold">
            {formatCoordinates(location.lat, location.lon)}
          </span>
        </div>

        <div className="flex items-center justify-between text-[#94A3B8] text-[10px]">
          <span className="flex items-center gap-1">
            <Globe className="w-3 h-3 text-[#22C55E]" />
            <span>Target Status:</span>
          </span>
          <span className="text-[#22C55E] flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3 h-3" /> Area Locked
          </span>
        </div>
      </div>

      {/* Action Button: Analyze This Area */}
      <button
        type="button"
        onClick={() => onAnalyzeArea(location)}
        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#06B6D4] to-[#38BDF8] hover:from-[#0891B2] hover:to-[#0284C7] text-[#070D17] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(56,189,248,0.3)] hover:shadow-[0_4px_24px_rgba(56,189,248,0.5)] cursor-pointer"
      >
        <Layers className="w-4 h-4 text-[#070D17]" />
        <span>Analyze This Area</span>
        <ArrowRight className="w-4 h-4 text-[#070D17]" />
      </button>
    </div>
  );
};
