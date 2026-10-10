import React from 'react';
import { ChangeMap } from './ChangeMap';
import { GeoBoundsSchema } from '../../types/imagery';

interface GeoRasterViewerProps {
  isGeoreferenced: boolean;
  sourceCrs: string | null;
  bounds: GeoBoundsSchema | null;
  beforePreviewUrl: string | null;
  afterPreviewUrl: string | null;
  changeOverlayUrl?: string | null;
  onSwitchToImageSpace?: () => void;
}

export const GeoRasterViewer: React.FC<GeoRasterViewerProps> = ({
  isGeoreferenced,
  sourceCrs,
  bounds,
  beforePreviewUrl,
  afterPreviewUrl,
  changeOverlayUrl = null,
  onSwitchToImageSpace,
}) => {
  return (
    <ChangeMap
      isGeoreferenced={isGeoreferenced}
      sourceCrs={sourceCrs}
      bounds={bounds}
      beforePreviewUrl={beforePreviewUrl}
      afterPreviewUrl={afterPreviewUrl}
      changeOverlayUrl={changeOverlayUrl}
      onSwitchToComparison={onSwitchToImageSpace}
    />
  );
};
