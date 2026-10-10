import React from 'react';
import { Calendar, ImageOff } from 'lucide-react';
import { ImageInputState, ZoomTransform } from '../../types/ui';

interface BeforeImagePanelProps {
  imageInput: ImageInputState;
  zoomTransform: ZoomTransform;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  isDragging: boolean;
}

export const BeforeImagePanel: React.FC<BeforeImagePanelProps> = ({
  imageInput,
  zoomTransform,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  isDragging,
}) => {
  return (
    <div className="relative flex-1 h-full bg-[#0B1118] border border-[#34404C] rounded-lg overflow-hidden flex flex-col group select-none">
      {/* Top Header Strip */}
      <div className="h-8 bg-[#17212B]/90 border-b border-[#34404C] px-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#3B82F6]"></span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#F3F6FA]">
            T1: Before Image (Baseline)
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-[#AAB8C6] font-mono">
          <Calendar className="w-3 h-3 text-[#3B82F6]" />
          <span>{imageInput.acquisitionDate || 'ACQ: 2023-04-12 UTC (ESTIMATED)'}</span>
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
            className="w-full h-full flex items-center justify-center transition-transform duration-75 origin-center"
            style={{
              transform: `translate(${zoomTransform.x}px, ${zoomTransform.y}px) scale(${zoomTransform.zoom})`,
            }}
          >
            <img
              src={imageInput.previewUrl}
              alt="Before Satellite Acquisition"
              className="max-w-full max-h-full object-contain pointer-events-none rounded"
              draggable={false}
            />
          </div>
        ) : (
          <div className="text-center p-6 text-[#AAB8C6] space-y-2">
            <ImageOff className="w-10 h-10 mx-auto text-[#34404C]" />
            <div className="text-xs font-medium text-[#F3F6FA]">No Baseline Image Loaded</div>
            <p className="text-[11px] max-w-xs text-[#AAB8C6]">
              Select a sample scenario or upload a custom raster to inspect pre-event baseline.
            </p>
          </div>
        )}

        {/* Viewport Grid & Metadata Overlay */}
        <div className="absolute bottom-2 left-2 z-20 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-[#0B1118]/80 border border-[#34404C] text-[10px] font-mono text-[#AAB8C6]">
            {imageInput.dimensions ? `${imageInput.dimensions.width}×${imageInput.dimensions.height} px` : 'RES: 0.5m GSD'}
          </span>
          {imageInput.isGeoTiff && (
            <span className="px-2 py-0.5 rounded bg-[#3B82F6]/20 border border-[#3B82F6]/40 text-[10px] font-mono text-[#3B82F6]">
              GeoTIFF Linked
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
