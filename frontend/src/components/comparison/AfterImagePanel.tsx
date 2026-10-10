import React from 'react';
import { Calendar, ImageOff } from 'lucide-react';
import { ImageInputState, ZoomTransform } from '../../types/ui';
import { ChangeMaskOverlay } from './ChangeMaskOverlay';
import { MaskLayerMode } from '../../types/detection';

interface AfterImagePanelProps {
  imageInput: ImageInputState;
  zoomTransform: ZoomTransform;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  isDragging: boolean;
  showOverlay: boolean;
  jobId: string | null;
  maskMode: MaskLayerMode;
  maskOpacity: number;
}

export const AfterImagePanel: React.FC<AfterImagePanelProps> = ({
  imageInput,
  zoomTransform,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  isDragging,
  showOverlay,
  jobId,
  maskMode,
  maskOpacity,
}) => {
  return (
    <div className="relative flex-1 h-full bg-[#0B1118] border border-[#34404C] rounded-lg overflow-hidden flex flex-col group select-none">
      {/* Top Header Strip */}
      <div className="h-8 bg-[#17212B]/90 border-b border-[#34404C] px-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#FF8617]"></span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#F3F6FA]">
            T2: After Image (Monitor & Change Overlay)
          </span>
          {showOverlay && jobId && (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#FF8617]/20 text-[#FF8617] border border-[#FF8617]/40 uppercase font-semibold">
              {maskMode.replace('_', ' ').toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[10px] text-[#AAB8C6] font-mono">
          <Calendar className="w-3 h-3 text-[#FF8617]" />
          <span>{imageInput.acquisitionDate || 'ACQ: Post-Event Monitor'}</span>
        </div>
      </div>

      {/* Main Viewport */}
      <div
        className={`relative flex-1 w-full h-full overflow-hidden flex items-center justify-center cursor-${
          isDragging ? 'grabbing' : 'grab'
        }`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {imageInput.previewUrl ? (
          <div
            className="relative w-full h-full flex items-center justify-center transition-transform duration-75 origin-center"
            style={{
              transform: `translate(${zoomTransform.x}px, ${zoomTransform.y}px) scale(${zoomTransform.zoom})`,
            }}
          >
            <img
              src={imageInput.previewUrl}
              alt="After Satellite Acquisition"
              className="max-w-full max-h-full object-contain pointer-events-none rounded"
              draggable={false}
            />

            {/* Real Change Raster Mask Overlay */}
            <ChangeMaskOverlay
              show={showOverlay}
              maskMode={maskMode}
              jobId={jobId}
              opacity={maskOpacity}
            />
          </div>
        ) : (
          <div className="text-center p-6 text-[#AAB8C6] space-y-2">
            <ImageOff className="w-10 h-10 mx-auto text-[#34404C]" />
            <div className="text-xs font-medium text-[#F3F6FA]">No Monitor Image Loaded</div>
            <p className="text-[11px] max-w-xs text-[#AAB8C6]">
              Select a benchmark scenario or upload a custom raster to inspect post-event changes.
            </p>
          </div>
        )}

        {/* Viewport Metadata Overlay */}
        <div className="absolute bottom-2 left-2 z-20 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-[#0B1118]/80 border border-[#34404C] text-[10px] font-mono text-[#AAB8C6]">
            {imageInput.dimensions ? `${imageInput.dimensions.width}×${imageInput.dimensions.height} px` : 'GSD Validated'}
          </span>
          {imageInput.isGeoTiff && (
            <span className="px-2 py-0.5 rounded bg-[#FF8617]/20 border border-[#FF8617]/40 text-[10px] font-mono text-[#FF8617]">
              GeoTIFF Linked
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
