import React, { useState } from 'react';
import { ViewMode, WorkspaceTab, ImageInputState, ZoomTransform } from '../../types/ui';
import { GeoBoundsSchema } from '../../types/imagery';
import { MaskLayerMode } from '../../types/detection';
import { MapControls } from '../map/MapControls';
import { BeforeImagePanel } from './BeforeImagePanel';
import { AfterImagePanel } from './AfterImagePanel';
import { SwipeComparison } from './SwipeComparison';
import { ChangeMap } from '../map/ChangeMap';
import { getJobImageUrl } from '../../api/detection';

interface SatelliteComparisonProps {
  workspaceTab: WorkspaceTab;
  onWorkspaceTabChange: (tab: WorkspaceTab) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  beforeInput: ImageInputState;
  afterInput: ImageInputState;
  showOverlay: boolean;
  onToggleOverlay: () => void;
  isGeoreferenced?: boolean;
  sourceCrs?: string | null;
  bounds?: GeoBoundsSchema | null;
  jobId: string | null;
  maskMode: MaskLayerMode;
  maskOpacity: number;
  vectorFeatures?: any;
  onRegionUpdated?: () => void;
}

export const SatelliteComparison: React.FC<SatelliteComparisonProps> = ({
  workspaceTab,
  onWorkspaceTabChange,
  viewMode,
  onViewModeChange,
  beforeInput,
  afterInput,
  showOverlay,
  onToggleOverlay,
  isGeoreferenced = false,
  sourceCrs = null,
  bounds = null,
  jobId,
  maskMode,
  maskOpacity,
  vectorFeatures = null,
  onRegionUpdated,
}) => {
  const [zoomTransform, setZoomTransform] = useState<ZoomTransform>({
    zoom: 1.0,
    x: 0,
    y: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleZoomIn = () => {
    setZoomTransform((prev) => ({
      ...prev,
      zoom: Math.min(prev.zoom + 0.25, 4.0),
    }));
  };

  const handleZoomOut = () => {
    setZoomTransform((prev) => ({
      ...prev,
      zoom: Math.max(prev.zoom - 0.25, 0.5),
    }));
  };

  const handleResetZoom = () => {
    setZoomTransform({ zoom: 1.0, x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - zoomTransform.x, y: e.clientY - zoomTransform.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setZoomTransform((prev) => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const changeOverlayUrl = jobId ? getJobImageUrl(jobId, 'change_overlay') : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#17212B] border border-[#34404C] rounded-lg overflow-hidden shadow-lg select-none">
      {/* 1. Top Controls Bar with [ Comparison | Geographic Map ] switch */}
      <MapControls
        workspaceTab={workspaceTab}
        onWorkspaceTabChange={onWorkspaceTabChange}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        zoom={zoomTransform.zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        showOverlay={showOverlay}
        onToggleOverlay={onToggleOverlay}
        isGeoreferenced={isGeoreferenced}
      />

      {/* 2. Main Display Workspace */}
      <div className="flex-1 p-2 min-h-0 overflow-hidden">
        {workspaceTab === 'map' ? (
          /* Dedicated Geographic Map Tab */
          <div className="w-full h-full min-h-0">
            <ChangeMap
              jobId={jobId}
              isGeoreferenced={isGeoreferenced}
              sourceCrs={sourceCrs}
              bounds={bounds}
              beforePreviewUrl={beforeInput.previewUrl}
              afterPreviewUrl={afterInput.previewUrl}
              changeOverlayUrl={showOverlay ? changeOverlayUrl : null}
              vectorFeatures={vectorFeatures}
              onRegionUpdated={onRegionUpdated}
              onSwitchToComparison={() => onWorkspaceTabChange('comparison')}
            />
          </div>
        ) : viewMode === 'swipe' ? (
          /* Swipe Comparison View */
          <SwipeComparison
            beforeInput={beforeInput}
            afterInput={afterInput}
            zoomTransform={zoomTransform}
            showOverlay={showOverlay}
            jobId={jobId}
            maskMode={maskMode}
            maskOpacity={maskOpacity}
          />
        ) : viewMode === 'overlay' ? (
          /* Single Overlay Panel */
          <div className="h-full w-full">
            <AfterImagePanel
              imageInput={afterInput}
              zoomTransform={zoomTransform}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              isDragging={isDragging}
              showOverlay={showOverlay}
              jobId={jobId}
              maskMode={maskMode}
              maskOpacity={maskOpacity}
            />
          </div>
        ) : (
          /* Side-by-Side Dual Viewport */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 h-full w-full">
            <BeforeImagePanel
              imageInput={beforeInput}
              zoomTransform={zoomTransform}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              isDragging={isDragging}
            />
            <AfterImagePanel
              imageInput={afterInput}
              zoomTransform={zoomTransform}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              isDragging={isDragging}
              showOverlay={showOverlay}
              jobId={jobId}
              maskMode={maskMode}
              maskOpacity={maskOpacity}
            />
          </div>
        )}
      </div>
    </div>
  );
};
