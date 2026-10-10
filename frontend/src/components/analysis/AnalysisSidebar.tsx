import React from 'react';
import { 
  Building2,
  Percent, 
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { JobResponse } from '../../types/detection';
import { ImageryValidationResponse } from '../../types/imagery';

interface AnalysisSidebarProps {
  job: JobResponse | null;
  isProcessing: boolean;
  validation: ImageryValidationResponse | null;
  vectorFeatures?: any | null;
}

export const AnalysisSidebar: React.FC<AnalysisSidebarProps> = ({
  job,
  isProcessing,
  validation,
  vectorFeatures,
}) => {
  const stats = job?.stats || {};
  const filterDetails = job?.filtering_details || {};
  const evaluation = job?.evaluation;
  const summary = vectorFeatures?.summary;

  const totalAreaHa = summary?.total_area_ha ?? (stats.filtered_changed_pixels ? Math.round((stats.filtered_changed_pixels * 900) / 10000) / 100 : 0);
  const totalAreaM2 = summary?.total_area_m2 ?? (stats.filtered_changed_pixels ? stats.filtered_changed_pixels * 900 : 0);
  const clusterCount = summary?.total_regions ?? stats.components_retained ?? 0;
  const largestAreaM2 = summary?.largest_region_area_m2;
  const avgAreaM2 = summary?.average_region_area_m2;

  return (
    <aside className="w-80 h-full bg-[#111926] border-l border-slate-800 flex flex-col overflow-hidden select-none text-xs">
      {/* Sidebar Header */}
      <div className="h-12 bg-[#0c131f] border-b border-slate-800 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-orange-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-100">
            Development Analysis
          </h2>
        </div>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase ${
          job?.status === 'completed'
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            : isProcessing
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 animate-pulse'
              : 'bg-slate-800 text-slate-400'
        }`}>
          {isProcessing ? 'ANALYZING...' : job?.status === 'completed' ? 'FINAL POLYGONS' : 'READY'}
        </span>
      </div>

      {/* Main Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* Input Imagery Grid Card */}
        {validation && (
          <div className="p-2.5 rounded-xl bg-[#09101d] border border-slate-800 text-[11px] font-mono space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Analysis Grid:</span>
              <span className="text-slate-200 font-semibold">{validation.width} × {validation.height} px</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>CRS / Coordinates:</span>
              <span className="text-cyan-400 truncate max-w-[140px]">{validation.source_crs || 'WGS84'}</span>
            </div>
            {job?.method && (
              <div className="flex justify-between text-slate-400 pt-0.5 border-t border-slate-800/80">
                <span>Algorithm:</span>
                <span className="text-orange-400 font-semibold uppercase text-[10px]">{job.method.replace('_', ' ')}</span>
              </div>
            )}
          </div>
        )}

        {/* Development Summary KPIs */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
            Clean Development Summary
          </span>

          <div className="grid grid-cols-2 gap-2">
            {/* Total Development Area */}
            <div className="p-3 rounded-xl bg-[#09101d] border border-orange-500/30 col-span-2 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-medium block">Total New Development</span>
              <div className="flex items-baseline space-x-2">
                <span className="font-mono text-xl font-bold text-orange-400">
                  {totalAreaHa > 0 ? `${totalAreaHa} ha` : '—'}
                </span>
                {totalAreaM2 > 0 && (
                  <span className="text-[11px] text-slate-500 font-mono">
                    ({totalAreaM2.toLocaleString()} m²)
                  </span>
                )}
              </div>
            </div>

            {/* Development Clusters Count */}
            <div className="p-2.5 rounded-xl bg-[#09101d] border border-slate-800">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-semibold">
                <Building2 className="w-3 h-3 text-cyan-400" /> Clusters
              </div>
              <div className="font-mono text-base font-bold text-slate-100 mt-1">
                {clusterCount > 0 ? clusterCount : '—'}
              </div>
            </div>

            {/* AOI Change Coverage % */}
            <div className="p-2.5 rounded-xl bg-[#09101d] border border-slate-800">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-semibold">
                <Percent className="w-3 h-3 text-emerald-400" /> AOI Growth
              </div>
              <div className="font-mono text-base font-bold text-emerald-400 mt-1">
                {stats.filtered_change_pct !== undefined 
                  ? `${stats.filtered_change_pct.toFixed(2)}%` 
                  : '—'}
              </div>
            </div>

            {/* Largest Cluster */}
            {largestAreaM2 !== undefined && largestAreaM2 > 0 && (
              <div className="p-2.5 rounded-xl bg-[#09101d] border border-slate-800">
                <span className="text-[9px] text-slate-400 uppercase font-semibold block">Largest Cluster</span>
                <span className="font-mono text-xs font-bold text-slate-200 mt-0.5 block">
                  {Math.round(largestAreaM2 / 100) / 100} ha
                </span>
              </div>
            )}

            {/* Average Cluster */}
            {avgAreaM2 !== undefined && avgAreaM2 > 0 && (
              <div className="p-2.5 rounded-xl bg-[#09101d] border border-slate-800">
                <span className="text-[9px] text-slate-400 uppercase font-semibold block">Avg Cluster Size</span>
                <span className="font-mono text-xs font-bold text-slate-200 mt-0.5 block">
                  {Math.round(avgAreaM2).toLocaleString()} m²
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Noise Suppression & Cleaning Audit */}
        {job && job.status === 'completed' && (
          <div className="p-3 rounded-xl bg-[#09101d] border border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block flex items-center justify-between">
              <span>Noise Filtering Audit</span>
              <span className="text-emerald-400 text-[9px] font-mono">Clean Polygons</span>
            </span>
            <div className="space-y-1 text-[11px] font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Raw Candidate Pixels:</span>
                <span className="text-slate-300">{stats.raw_changed_pixels?.toLocaleString()} px ({stats.raw_change_pct}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Isolated Specks Suppressed:</span>
                <span className="text-rose-400">-{stats.components_suppressed || 0} clusters</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Morphology Solidification:</span>
                <span className="text-orange-400">{filterDetails.kernel_size || 3}×{filterDetails.kernel_size || 3} kernel (Holes Filled)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Execution Runtime:</span>
                <span className="text-cyan-400">{job.processing_time_ms} ms</span>
              </div>
            </div>
          </div>
        )}

        {/* Ground-Truth Benchmark Evaluation Metrics */}
        {evaluation && (
          <div className="p-3 rounded-xl bg-[#09101d] border border-emerald-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Accuracy Metrics
              </span>
              <span className="text-[10px] font-mono text-slate-400">Verified</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
              <div className="p-1.5 rounded-lg bg-[#111926] border border-slate-800">
                <span className="text-[9px] text-slate-400 uppercase block">IoU (Jaccard)</span>
                <span className="text-xs font-bold text-emerald-400">{(evaluation.iou * 100).toFixed(1)}%</span>
              </div>
              <div className="p-1.5 rounded-lg bg-[#111926] border border-slate-800">
                <span className="text-[9px] text-slate-400 uppercase block">F1 Score</span>
                <span className="text-xs font-bold text-emerald-400">{(evaluation.f1_score * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Quality Guarantee Notice */}
        <div className="p-2.5 rounded-xl bg-[#09101d] border border-slate-800/80 text-[10px] text-slate-400 leading-relaxed space-y-1">
          <div className="flex items-center space-x-1 text-orange-400 font-semibold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Clean Vector Display Guarantee</span>
          </div>
          <p>
            Noisy raw raster pixels are filtered out. The map view renders Douglas-Peucker smoothed GeoJSON vector polygons with true ground area (m², ha) and spatial centroids.
          </p>
        </div>
      </div>
    </aside>
  );
};
