import React from 'react';
import { MaskLayerMode } from '../../types/detection';

interface ChangeMaskOverlayProps {
  show: boolean;
  maskMode: MaskLayerMode;
  jobId: string | null;
  opacity: number;
}

export const ChangeMaskOverlay: React.FC<ChangeMaskOverlayProps> = ({
  show,
  maskMode,
  jobId,
  opacity,
}) => {
  if (!show || !jobId || maskMode === 'overlay' && !jobId) return null;

  const imageUrl = `/api/jobs/${jobId}/images/${maskMode}`;

  return (
    <div className="absolute inset-0 pointer-events-none z-15 flex items-center justify-center overflow-hidden">
      <img
        src={imageUrl}
        alt="Detected Change Raster Overlay"
        className="max-w-full max-h-full object-contain pointer-events-none"
        style={{
          opacity: opacity / 100.0,
          mixBlendMode: maskMode === 'change_score' ? 'screen' : 'normal',
        }}
        draggable={false}
      />
    </div>
  );
};
