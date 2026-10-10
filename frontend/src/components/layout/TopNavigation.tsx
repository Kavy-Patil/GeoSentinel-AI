import React, { useState } from 'react';
import { 
  Activity, 
  Layers, 
  Bell, 
  Settings, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  X
} from 'lucide-react';
import { HealthStatus } from '../../types/api';

interface TopNavigationProps {
  health: HealthStatus | null;
  healthLoading: boolean;
  healthError: string | null;
  onRefreshHealth: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  health,
  healthLoading,
  healthError,
  onRefreshHealth,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const isOnline = !!health && !healthError;

  return (
    <header className="h-14 bg-[#151D26] border-b border-[#34404C] px-4 flex items-center justify-between z-30 select-none">
      {/* Left: Branding & Subtitle */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#17212B] border border-[#FF8617] flex items-center justify-center text-[#FF8617] shadow-[0_0_10px_rgba(255,134,23,0.3)]">
            <Layers className="w-4.5 h-4.5 stroke-[2.2]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wider text-[#F3F6FA] uppercase">
                GeoSentinel <span className="text-[#FF8617]">AI</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-[#FF8617]/15 text-[#FF8617] border border-[#FF8617]/40 uppercase">
                Stage 3
              </span>
            </div>
            <span className="text-[10px] text-[#AAB8C6] tracking-widest uppercase font-medium">
              Change Monitor • GEOAI-04
            </span>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs text-[#AAB8C6] pl-4 border-l border-[#34404C]">
          <span className="text-[#AAB8C6]/80 text-[11px]">
            Detect Change. Understand Impact. Verify Evidence.
          </span>
        </div>
      </div>

      {/* Right: Processing Status, Notifications, Settings */}
      <div className="flex items-center gap-3">
        {/* Backend API Live Status */}
        <div 
          onClick={onRefreshHealth}
          title="Click to check backend connectivity"
          className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#17212B] border border-[#34404C] hover:border-[#465565] cursor-pointer transition-colors text-xs"
        >
          <div className="relative flex items-center justify-center">
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#22C55E]"></span>
                <span className="absolute w-2 h-2 rounded-full bg-[#22C55E] animate-ping opacity-75"></span>
              </>
            ) : (
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>
            )}
          </div>
          <span className="text-[11px] font-mono font-medium text-[#F3F6FA]">
            {healthLoading 
              ? 'POLLING...' 
              : isOnline 
                ? `BACKEND: OK (STAGE ${health?.stage})` 
                : 'OFFLINE / STANDALONE'}
          </span>
          <button 
            type="button" 
            className={`text-[#AAB8C6] hover:text-[#F3F6FA] ml-0.5 ${healthLoading ? 'animate-spin' : ''}`}
            aria-label="Refresh backend status"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        {/* Notifications Icon & Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowSettings(false);
            }}
            className={`p-2 rounded bg-[#17212B] border ${showNotifications ? 'border-[#FF8617] text-[#FF8617]' : 'border-[#34404C] text-[#AAB8C6] hover:text-[#F3F6FA] hover:border-[#465565]'} transition-colors relative`}
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#FF8617]"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#17212B] border border-[#34404C] rounded-lg shadow-2xl p-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-[#34404C]">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-[#F3F6FA]">
                  <Activity className="w-3.5 h-3.5 text-[#FF8617]" />
                  System Notifications
                </div>
                <button 
                  onClick={() => setShowNotifications(false)}
                  className="text-[#AAB8C6] hover:text-[#F3F6FA]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                <div className="p-2 rounded bg-[#0B1118] border border-[#34404C] text-xs">
                  <div className="flex items-center justify-between text-[#FF8617] font-medium text-[11px]">
                    <span>STAGE 1 INITIALIZED</span>
                    <span className="text-[10px] text-[#AAB8C6]">Just now</span>
                  </div>
                  <p className="text-[11px] text-[#AAB8C6] mt-1">
                    Foundation UI, Side-by-Side viewer, and API contracts are active. AI inference and geospatial polygonization will activate in Stages 2-4.
                  </p>
                </div>
                {isOnline ? (
                  <div className="p-2 rounded bg-[#0B1118] border border-[#22C55E]/30 text-xs">
                    <div className="flex items-center gap-1 text-[#22C55E] font-medium text-[11px]">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>FASTAPI SERVICE HEALTHY</span>
                    </div>
                    <p className="text-[11px] text-[#AAB8C6] mt-1">
                      GET /api/health responding from localhost backend.
                    </p>
                  </div>
                ) : (
                  <div className="p-2 rounded bg-[#0B1118] border border-[#F59E0B]/30 text-xs">
                    <div className="flex items-center gap-1 text-[#F59E0B] font-medium text-[11px]">
                      <AlertTriangle className="w-3 h-3" />
                      <span>BACKEND NOT CONNECTED</span>
                    </div>
                    <p className="text-[11px] text-[#AAB8C6] mt-1">
                      Start the FastAPI server via <code className="text-[#F3F6FA] font-mono">uvicorn app.main:app --reload</code>.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Settings Icon & Modal */}
        <div className="relative">
          <button
            onClick={() => {
              setShowSettings(!showSettings);
              setShowNotifications(false);
            }}
            className={`p-2 rounded bg-[#17212B] border ${showSettings ? 'border-[#FF8617] text-[#FF8617]' : 'border-[#34404C] text-[#AAB8C6] hover:text-[#F3F6FA] hover:border-[#465565]'} transition-colors`}
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {showSettings && (
            <div className="absolute right-0 mt-2 w-96 bg-[#17212B] border border-[#34404C] rounded-lg shadow-2xl p-4 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-[#34404C]">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-[#F3F6FA]">
                  <Settings className="w-3.5 h-3.5 text-[#FF8617]" />
                  Environment & Stage Info
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="text-[#AAB8C6] hover:text-[#F3F6FA]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="mt-3 space-y-3 text-xs text-[#AAB8C6]">
                <div>
                  <label className="text-[10px] uppercase font-semibold text-[#F3F6FA] block mb-1">
                    Project Stage
                  </label>
                  <div className="p-2 rounded bg-[#0B1118] border border-[#34404C] font-mono text-[11px] text-[#FF8617]">
                    Stage 1: Project Foundation & UI
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-semibold text-[#F3F6FA] block mb-1">
                    API Contract
                  </label>
                  <div className="p-2 rounded bg-[#0B1118] border border-[#34404C] font-mono text-[11px] text-[#AAB8C6] flex items-center justify-between">
                    <span>contracts/openapi.yaml</span>
                    <span className="text-[#22C55E]">OpenAPI 3.0.3</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-semibold text-[#F3F6FA] block mb-1">
                    Stage Roadmap
                  </label>
                  <ul className="text-[11px] space-y-1 list-disc list-inside text-[#AAB8C6]">
                    <li><strong className="text-[#22C55E]">Stage 1 (Current):</strong> Foundation, UI & Contracts</li>
                    <li><strong>Stage 2:</strong> Satellite Ingestion & GeoTIFF Handling</li>
                    <li><strong>Stage 3:</strong> Classical & AI Detection Pipelines</li>
                    <li><strong>Stage 4:</strong> Vector Polygonization & Leaflet GIS</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
