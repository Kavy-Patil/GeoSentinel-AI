import React, { useState, useRef, useCallback } from 'react';
import { SlidersHorizontal, ImageOff } from 'lucide-react';
import { ImageInputState, ZoomTransform } from '../../types/ui';
import { ChangeMaskOverlay } from './ChangeMaskOverlay';
import { MaskLayerMode } from '../../types/detection';

interface SwipeComparisonProps {
  beforeInput: ImageInputState;
  afterInput: ImageInputState;
  zoomTransform: ZoomTransform;
  showOverlay: boolean;
  jobId: string | null;
  maskMode: MaskLayerMode;
  maskOpacity: number;
}

export const SwipeComparison: React.FC<SwipeComparisonProps> = ({
  beforeInput,
  afterInput,
  zoomTransform,
  showOverlay,
  jobId,
  maskMode,
  maskOpacity,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = () => {
    setIsResizing(true);
  };

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(5, Math.min(95, (x / rect.width) * 100));
      setSliderPosition(percentage);
    },
    [isResizing]
  );

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="relative w-full h-full bg-[#0B1118] border border-[#34404C] rounded-lg overflow-hidden select-none"
    >
      {/* Before Image (Base Layer - Left side visible) */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {beforeInput.previewUrl ? (
          <div
            className="w-full h-full flex items-center justify-center origin-center"
            style={{
              transform: `translate(${zoomTransform.x}px, ${zoomTransform.y}px) scale(${zoomTransform.zoom})`,
            }}
          >
            <img
              src={beforeInput.previewUrl}
              alt="Before Acquisition"
              className="max-w-full max-h-full object-contain pointer-events-none"
              draggable={false}
            />
          </div>
        ) : (
          <div className="text-center text-[#AAB8C6]">
            <ImageOff className="w-8 h-8 mx-auto mb-2 text-[#34404C]" />
            <p className="text-xs">Before image missing</p>
          </div>
        )}
      </div>

      {/* After Image (Top Layer - Clipped by Slider percentage) */}
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{
          clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)`,
        }}
      >
        {afterInput.previewUrl ? (
          <div
            className="relative w-full h-full flex items-center justify-center origin-center"
            style={{
              transform: `translate(${zoomTransform.x}px, ${zoomTransform.y}px) scale(${zoomTransform.zoom})`,
            }}
          >
            <img
              src={afterInput.previewUrl}
              alt="After Acquisition"
              className="max-w-full max-h-full object-contain pointer-events-none"
              draggable={false}
            />

            {/* Change Vector Overlay on After layer */}
            <ChangeMaskOverlay
              show={showOverlay}
              maskMode={maskMode}
              jobId={jobId}
              opacity={maskOpacity}
            />
          </div>
        ) : (
          <div className="text-center text-[#AAB8C6]">
            <ImageOff className="w-8 h-8 mx-auto mb-2 text-[#34404C]" />
            <p className="text-xs">After image missing</p>
          </div>
        )}
      </div>

      {/* Vertical Divider Bar */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-[#FF8617] cursor-ew-resize z-30 shadow-[0_0_10px_rgba(255,134,23,0.8)]"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[#17212B] border-2 border-[#FF8617] flex items-center justify-center text-[#FF8617] shadow-xl">
          <SlidersHorizontal className="w-3.5 h-3.5 rotate-90" />
        </div>
      </div>

      {/* Top Labels */}
      <div className="absolute top-3 left-3 z-30 px-2 py-1 rounded bg-[#17212B]/90 border border-[#34404C] text-[10px] font-mono text-[#3B82F6]">
        BEFORE (T1)
      </div>
      <div className="absolute top-3 right-3 z-30 px-2 py-1 rounded bg-[#17212B]/90 border border-[#34404C] text-[10px] font-mono text-[#FF8617]">
        AFTER (T2)
      </div>
    </div>
  );
};
