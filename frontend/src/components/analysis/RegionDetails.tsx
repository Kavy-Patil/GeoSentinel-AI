import React from 'react';
import { 
  ShieldAlert, 
  X
} from 'lucide-react';
import { ChangeRegion } from '../../types/api';

interface RegionDetailsProps {
  region: ChangeRegion | null;
  onClose: () => void;
  onUpdateStatus?: (regionId: string, status: string) => void;
}

export const RegionDetails: React.FC<RegionDetailsProps> = ({
  region,
  onClose,
}) => {
  if (!region) return null;

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40';
      case 'high':
        return 'bg-[#FF8617]/15 text-[#FF8617] border-[#FF8617]/40';
      case 'medium':
        return 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40';
      default:
        return 'bg-[#34404C]/50 text-[#AAB8C6] border-[#34404C]';
    }
  };

  return (
    <div className="p-3 rounded-lg bg-[#151D26] border border-[#FF8617]/40 shadow-xl space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#34404C]">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#FF8617]" />
          <span className="font-mono font-bold text-xs text-[#F3F6FA]">
            {region.region_id.toUpperCase()}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase border ${getSeverityBadge(
              region.severity
            )}`}
          >
            {region.severity}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-[#AAB8C6] hover:text-[#F3F6FA] transition-colors"
          aria-label="Close region inspector"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid of Attributes */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded bg-[#0B1118] border border-[#34404C]">
          <span className="text-[10px] text-[#AAB8C6] uppercase font-semibold block">
            Estimated Area
          </span>
          <span className="font-mono text-xs text-[#F3F6FA] font-medium">
            {region.area_m2 ? `${region.area_m2.toLocaleString()} m²` : '—'}
          </span>
        </div>

        <div className="p-2 rounded bg-[#0B1118] border border-[#34404C]">
          <span className="text-[10px] text-[#AAB8C6] uppercase font-semibold block">
            Change Score
          </span>
          <span className="font-mono text-xs text-[#FF8617] font-medium">
            {region.magnitude ? `${(region.magnitude * 100).toFixed(0)}%` : '—'}
          </span>
        </div>

        <div className="p-2 rounded bg-[#0B1118] border border-[#34404C]">
          <span className="text-[10px] text-[#AAB8C6] uppercase font-semibold block">
            Priority
          </span>
          <span className="font-mono text-xs text-[#F3F6FA] uppercase">
            {region.priority}
          </span>
        </div>

        <div className="p-2 rounded bg-[#0B1118] border border-[#34404C]">
          <span className="text-[10px] text-[#AAB8C6] uppercase font-semibold block">
            Status
          </span>
          <span className="font-mono text-xs text-[#22C55E] uppercase">
            {region.review_status}
          </span>
        </div>
      </div>

      {/* Human In The Loop Verification Actions */}
      <div>
        <label className="text-[10px] uppercase font-semibold text-[#AAB8C6] block mb-1">
          Review & Ground Validation (Stage 4 Target)
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            disabled
            className="py-1 px-1.5 rounded bg-[#0B1118] border border-[#34404C] text-[10px] text-[#AAB8C6] cursor-not-allowed opacity-75"
            title="Human validation will be active in Stage 4"
          >
            Confirm
          </button>
          <button
            type="button"
            disabled
            className="py-1 px-1.5 rounded bg-[#0B1118] border border-[#34404C] text-[10px] text-[#AAB8C6] cursor-not-allowed opacity-75"
            title="False positive tagging will be active in Stage 4"
          >
            Reject
          </button>
          <button
            type="button"
            disabled
            className="py-1 px-1.5 rounded bg-[#0B1118] border border-[#34404C] text-[10px] text-[#AAB8C6] cursor-not-allowed opacity-75"
            title="Field dispatch tagging will be active in Stage 4"
          >
            Inspect
          </button>
        </div>
      </div>
    </div>
  );
};
