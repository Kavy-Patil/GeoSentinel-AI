import React from 'react';
import { Settings, Cpu, HardDrive } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  return (
    <div className="w-full h-full bg-[#070D17] text-[#F3F6FC] p-8 overflow-y-auto select-none">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#263449] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#111B2A] border border-[#38BDF8] flex items-center justify-center text-[#38BDF8] shadow-[0_0_12px_rgba(56,189,248,0.25)]">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold uppercase tracking-wider text-[#F3F6FC]">
                System & Engine Settings
              </h1>
              <p className="text-xs text-[#94A3B8]">
                GeoSentinel AI detection engine, hardware preferences, and spatial parameters
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 font-semibold">
            ENGINE v3.0
          </span>
        </div>

        {/* Settings Sections */}
        <div className="space-y-4">
          {/* 1. Detection Engine Settings */}
          <div className="p-5 rounded-2xl bg-[#111B2A] border border-[#263449] space-y-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#38BDF8]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#F3F6FC]">
                Change Detection Pathways
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#070D17] border border-[#263449] flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-[#F3F6FC] flex items-center gap-2">
                    <span>Classical Normalized Spectral Differencing</span>
                    <span className="text-[9px] text-[#22C55E] font-mono bg-[#22C55E]/15 px-1.5 py-0.5 rounded">
                      ACTIVE & VERIFIED
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] mt-1">
                    Normalized RGB L1 difference vector, Otsu thresholding, morphological noise suppression, and connected-component area filtering.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#070D17] border border-[#263449] flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-[#F3F6FC] flex items-center gap-2">
                    <span>Pretrained AI (ChangeFormer)</span>
                    <span className="text-[9px] text-[#F59E0B] font-mono bg-[#F59E0B]/15 px-1.5 py-0.5 rounded">
                      WEIGHTS OPTIONAL
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] mt-1">
                    Transformer bi-temporal building feature matcher. Place <code className="text-[#38BDF8]">changeformer_levircd.pth</code> in <code className="text-[#38BDF8]">data/models/</code> to activate.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Geodesic & Storage Parameters */}
          <div className="p-5 rounded-2xl bg-[#111B2A] border border-[#263449] space-y-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[#38BDF8]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#F3F6FC]">
                Geospatial & Cache Configuration
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#070D17] border border-[#263449]">
                <div className="text-[10px] text-[#94A3B8]">Reference Ellipsoid</div>
                <div className="text-[#F3F6FC] font-semibold mt-1">WGS84 (EPSG:4326)</div>
              </div>
              <div className="p-3 rounded-xl bg-[#070D17] border border-[#263449]">
                <div className="text-[10px] text-[#94A3B8]">Tiling Patch Size</div>
                <div className="text-[#F3F6FC] font-semibold mt-1">512 × 512 px (64px overlap)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
