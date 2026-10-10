import React from 'react';
import { ChangeRegion } from '../../types/api';

interface ChangeOverlayProps {
  show: boolean;
  regions?: ChangeRegion[];
  selectedRegionId?: string | null;
  onSelectRegion?: (regionId: string) => void;
  width?: number;
  height?: number;
}

export const ChangeOverlay: React.FC<ChangeOverlayProps> = ({
  show,
  selectedRegionId,
  onSelectRegion,
}) => {
  if (!show) return null;

  // Render demonstration vector change outlines in image coordinates
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <svg
        className="w-full h-full"
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="orange-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <pattern id="diagonal-stripe" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#FF8617" strokeWidth="1.5" strokeOpacity="0.4" />
          </pattern>
        </defs>

        {/* Demo Region 1: Urban expansion northwest cluster */}
        <g
          className="pointer-events-auto cursor-pointer transition-transform hover:scale-[1.01]"
          onClick={() => onSelectRegion?.('reg_001')}
        >
          <polygon
            points="180,140 290,130 320,200 270,250 190,220 160,170"
            fill="url(#diagonal-stripe)"
            stroke="#FF8617"
            strokeWidth={selectedRegionId === 'reg_001' ? 4 : 2.5}
            strokeDasharray={selectedRegionId === 'reg_001' ? 'none' : '6,3'}
            filter="url(#orange-glow)"
            className="animate-change-pulse"
          />
          <text
            x="220"
            y="130"
            fill="#F3F6FA"
            fontSize="12"
            fontFamily="monospace"
            fontWeight="bold"
            className="select-none bg-[#0B1118]"
          >
            REG-01 [NEW STRUCTURES]
          </text>
        </g>

        {/* Demo Region 2: Road & infrastructure corridor southeast */}
        <g
          className="pointer-events-auto cursor-pointer transition-transform hover:scale-[1.01]"
          onClick={() => onSelectRegion?.('reg_002')}
        >
          <polygon
            points="460,320 620,310 650,380 580,440 450,420 430,360"
            fill="url(#diagonal-stripe)"
            stroke="#FF8617"
            strokeWidth={selectedRegionId === 'reg_002' ? 4 : 2.5}
            strokeDasharray={selectedRegionId === 'reg_002' ? 'none' : '6,3'}
            filter="url(#orange-glow)"
            className="animate-change-pulse"
          />
          <text
            x="480"
            y="310"
            fill="#F3F6FA"
            fontSize="12"
            fontFamily="monospace"
            fontWeight="bold"
            className="select-none"
          >
            REG-02 [CLEARING / VEG LOSS]
          </text>
        </g>
      </svg>
    </div>
  );
};
