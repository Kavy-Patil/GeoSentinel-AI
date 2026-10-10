import React from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Columns, 
  SlidersHorizontal, 
  Layers, 
  Globe,
  Eye
} from 'lucide-react';
import { ViewMode, WorkspaceTab } from '../../types/ui';

interface MapControlsProps {
  workspaceTab: WorkspaceTab;
  onWorkspaceTabChange: (tab: WorkspaceTab) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  showOverlay: boolean;
  onToggleOverlay: () => void;
  isGeoreferenced?: boolean;
}

export const MapControls: React.FC<MapControlsProps> = ({
  workspaceTab,
  onWorkspaceTabChange,
  viewMode,
  onViewModeChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  showOverlay,
  onToggleOverlay,
  isGeoreferenced = false,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#151D26] border-b border-[#34404C] text-xs select-none">
      {/* 1. Primary Workspace Switcher: [ Comparison | Geographic Map ] */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-[#0B1118] p-0.5 rounded-lg border border-[#34404C]">
          <button
            type="button"
            onClick={() => onWorkspaceTabChange('comparison')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
              workspaceTab === 'comparison'
                ? 'bg-[#17212B] text-[#FF8617] border border-[#FF8617]/60 shadow-[0_0_10px_rgba(255,134,23,0.2)]'
                : 'text-[#AAB8C6] hover:text-[#F3F6FA]'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Comparison</span>
          </button>

          <button
            type="button"
            onClick={() => onWorkspaceTabChange('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
              workspaceTab === 'map'
                ? 'bg-[#17212B] text-[#06B6D4] border border-[#06B6D4]/60 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'text-[#AAB8C6] hover:text-[#F3F6FA]'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-[#06B6D4]" />
            <span>Geographic Map</span>
            {isGeoreferenced && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse ml-0.5"></span>
            )}
          </button>
        </div>

        {/* 2. Sub-Mode Selector (Only shown in Comparison tab) */}
        {workspaceTab === 'comparison' && (
          <div className="hidden sm:flex items-center gap-1 bg-[#0B1118] p-0.5 rounded border border-[#34404C]">
            <button
              type="button"
              onClick={() => onViewModeChange('side-by-side')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                viewMode === 'side-by-side'
                  ? 'bg-[#17212B] text-[#F3F6FA] font-bold border border-[#34404C]'
                  : 'text-[#AAB8C6] hover:text-[#F3F6FA]'
              }`}
              title="Side-by-side dual viewport"
            >
              Side-by-Side
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('swipe')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                viewMode === 'swipe'
                  ? 'bg-[#17212B] text-[#F3F6FA] font-bold border border-[#34404C]'
                  : 'text-[#AAB8C6] hover:text-[#F3F6FA]'
              }`}
              title="Swipe slider comparison"
            >
              <SlidersHorizontal className="w-3 h-3 text-[#FF8617]" />
              <span>Swipe</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('overlay')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                viewMode === 'overlay'
                  ? 'bg-[#17212B] text-[#F3F6FA] font-bold border border-[#34404C]'
                  : 'text-[#AAB8C6] hover:text-[#F3F6FA]'
              }`}
              title="Change overlay single panel"
            >
              <Layers className="w-3 h-3 text-[#FF8617]" />
              <span>Overlay</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Right-side Controls: Change Highlight & Image Zoom */}
      <div className="flex items-center gap-2">
        {/* Toggle Detected Change Overlay */}
        <button
          type="button"
          onClick={onToggleOverlay}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs font-medium transition-colors ${
            showOverlay
              ? 'bg-[#FF8617]/20 border-[#FF8617] text-[#FF8617] font-semibold'
              : 'bg-[#0B1118] border-[#34404C] text-[#AAB8C6] hover:text-[#F3F6FA]'
          }`}
          title="Toggle detected change outline highlight (#FF8617)"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Change Outline</span>
        </button>

        {/* Zoom Controls (Image Space) */}
        {workspaceTab === 'comparison' && (
          <div className="flex items-center bg-[#0B1118] rounded border border-[#34404C] divide-x divide-[#34404C]">
            <button
              type="button"
              onClick={onZoomOut}
              className="p-1.5 text-[#AAB8C6] hover:text-[#F3F6FA] transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 py-1 text-[11px] font-mono text-[#AAB8C6] min-w-[48px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={onZoomIn}
              className="p-1.5 text-[#AAB8C6] hover:text-[#F3F6FA] transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onResetZoom}
              className="p-1.5 text-[#AAB8C6] hover:text-[#F3F6FA] transition-colors"
              title="Reset Zoom & Pan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
