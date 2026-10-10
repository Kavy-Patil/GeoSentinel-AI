import React from 'react';
import { Clock, CheckCircle2, ArrowRight } from 'lucide-react';

interface HistoryPageProps {
  onOpenMonitorWithSample?: (datasetId: string, sampleId: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onOpenMonitorWithSample }) => {
  const benchmarkRuns = [
    {
      id: 'run-beirut',
      dataset: 'OSCD (Sentinel-2)',
      region: 'Beirut, Lebanon',
      crs: 'EPSG:32636',
      date: '2026-10-09',
      runtime: '320 ms',
      changedAreaPct: '4.82%',
      iou: '74.2%',
      f1Score: '85.2%',
      datasetId: 'oscd',
      sampleId: 'beirut',
      status: 'VERIFIED',
    },
    {
      id: 'run-valencia',
      dataset: 'OSCD (Sentinel-2)',
      region: 'Valencia, Spain',
      crs: 'EPSG:32630',
      date: '2026-10-09',
      runtime: '290 ms',
      changedAreaPct: '3.15%',
      iou: '78.6%',
      f1Score: '88.0%',
      datasetId: 'oscd',
      sampleId: 'valencia',
      status: 'VERIFIED',
    },
    {
      id: 'run-delhi',
      dataset: 'High-Res GeoTIFF',
      region: 'Delhi NCR, India',
      crs: 'EPSG:32643',
      date: '2026-10-09',
      runtime: '640 ms',
      changedAreaPct: '8.40%',
      iou: '81.4%',
      f1Score: '89.7%',
      datasetId: 'custom_geotiff',
      sampleId: 'delhi_sector49',
      status: 'VERIFIED',
    },
    {
      id: 'run-levir-01',
      dataset: 'LEVIR-CD Building Benchmark',
      region: 'LEVIR-CD Pair train_0001',
      crs: 'Pixel-Coordinate Mode',
      date: '2026-10-09',
      runtime: '480 ms',
      changedAreaPct: '5.20%',
      iou: '82.1%',
      f1Score: '90.2%',
      datasetId: 'levir_cd',
      sampleId: 'train_0001',
      status: 'VERIFIED',
    },
  ];

  return (
    <div className="w-full h-full bg-[#070D17] text-[#F3F6FC] p-8 overflow-y-auto select-none">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#263449] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#111B2A] border border-[#38BDF8] flex items-center justify-center text-[#38BDF8] shadow-[0_0_12px_rgba(56,189,248,0.25)]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold uppercase tracking-wider text-[#F3F6FC]">
                Analysis History & Benchmark Log
              </h1>
              <p className="text-xs text-[#94A3B8]">
                Auditable bi-temporal change detection execution records and benchmark evaluations
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40 font-semibold">
            4 RUNS LOGGED
          </span>
        </div>

        {/* Runs List */}
        <div className="space-y-3">
          {benchmarkRuns.map((run) => (
            <div
              key={run.id}
              className="p-4 rounded-2xl bg-[#111B2A] border border-[#263449] hover:border-[#38BDF8]/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-[#F3F6FC]">{run.region}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#070D17] border border-[#263449] text-[#38BDF8]">
                    {run.crs}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {run.status}
                  </span>
                </div>
                <div className="text-xs text-[#94A3B8] font-mono flex items-center gap-3">
                  <span>Dataset: {run.dataset}</span>
                  <span>•</span>
                  <span>Execution: {run.runtime}</span>
                  <span>•</span>
                  <span>Change: {run.changedAreaPct}</span>
                </div>
              </div>

              {/* Metrics & Action */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right font-mono text-[11px] bg-[#070D17] px-3 py-1.5 rounded-xl border border-[#263449]">
                  <div className="text-[#94A3B8] text-[9px]">IoU / F1</div>
                  <div className="text-[#22C55E] font-bold">{run.iou} / {run.f1Score}</div>
                </div>

                {onOpenMonitorWithSample && (
                  <button
                    type="button"
                    onClick={() => onOpenMonitorWithSample(run.datasetId, run.sampleId)}
                    className="px-3.5 py-2 rounded-xl bg-[#070D17] hover:bg-[#38BDF8] text-[#38BDF8] hover:text-[#070D17] border border-[#38BDF8]/40 hover:border-[#38BDF8] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
