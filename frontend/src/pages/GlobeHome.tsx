import React from 'react';
import { EarthGlobe } from '../components/globe/EarthGlobe';
import { LocationSearch } from '../components/globe/LocationSearch';
import { LocationInfoPanel } from '../components/globe/LocationInfoPanel';
import { SelectedLocation } from '../types/geography';
import { PRESET_LOCATIONS } from '../services/geocoding';
import { Compass, Navigation, Globe } from 'lucide-react';

interface GlobeHomeProps {
  selectedLocation: SelectedLocation | null;
  onSelectLocation: (location: SelectedLocation) => void;
  onAnalyzeArea: (location: SelectedLocation) => void;
  onExploreArea: (location: SelectedLocation) => void;
}

export const GlobeHome: React.FC<GlobeHomeProps> = ({
  selectedLocation,
  onSelectLocation,
  onAnalyzeArea,
  onExploreArea,
}) => {
  return (
    <div className="relative w-full h-full bg-[#070D17] overflow-hidden select-none flex flex-col justify-between">
      {/* 1. Top Floating Area: Search Bar & Branding Header */}
      <div className="absolute top-6 inset-x-0 z-30 px-4 flex flex-col items-center pointer-events-none">
        {/* Minimalist Tagline */}
        <div className="mb-3 text-center pointer-events-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111B2A]/80 border border-[#263449] backdrop-blur-md shadow-lg">
            <Globe className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span className="text-[11px] font-bold text-[#F3F6FC] tracking-wider uppercase">
              GeoSentinel AI <span className="text-[#38BDF8]">3D Earth</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-[#38BDF8]" />
            <span className="text-[10px] text-[#94A3B8]">Explore Earth. Detect Change.</span>
          </div>
        </div>

        {/* Location Search Bar */}
        <div className="w-full max-w-xl pointer-events-auto">
          <LocationSearch
            onSelectLocation={onSelectLocation}
            selectedLocation={selectedLocation}
          />
        </div>

        {/* Quick Location Pills */}
        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap justify-center pointer-events-auto">
          <span className="text-[10px] font-mono text-[#94A3B8] mr-1 hidden sm:inline">
            Quick Jump:
          </span>
          {PRESET_LOCATIONS.slice(0, 4).map((preset) => (
            <button
              key={preset.placeId}
              type="button"
              onClick={() =>
                onSelectLocation({
                  name: preset.name,
                  displayName: preset.displayName,
                  lat: preset.lat,
                  lon: preset.lon,
                  category: preset.category,
                  source: 'preset',
                })
              }
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all cursor-pointer ${
                selectedLocation?.name === preset.name
                  ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-[#38BDF8] shadow-[0_0_10px_rgba(56,189,248,0.2)]'
                  : 'bg-[#111B2A]/70 border-[#263449] text-[#94A3B8] hover:text-[#F3F6FC] hover:border-[#38BDF8]/40'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Main Center 3D Interactive Globe */}
      <div className="w-full h-full absolute inset-0 z-10">
        <EarthGlobe
          selectedLocation={selectedLocation}
          onSelectLocation={onSelectLocation}
        />
      </div>

      {/* 3. Bottom Overlay Panels & Quick Action Controls */}
      <div className="absolute bottom-6 inset-x-6 z-30 flex items-end justify-between pointer-events-none">
        {/* Bottom Left: Selected Location Info Panel */}
        <div className="pointer-events-auto">
          {selectedLocation ? (
            <LocationInfoPanel
              location={selectedLocation}
              onAnalyzeArea={onAnalyzeArea}
            />
          ) : (
            <div className="bg-[#111B2A]/80 backdrop-blur-md border border-[#263449] rounded-xl px-4 py-2.5 text-xs text-[#94A3B8] flex items-center gap-2.5 shadow-lg">
              <Navigation className="w-4 h-4 text-[#38BDF8] animate-pulse" />
              <span>Drag globe to rotate • Scroll to zoom • Search any global city or coordinates</span>
            </div>
          )}
        </div>

        {/* Bottom Right: Quick Explore & Control Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {selectedLocation && (
            <button
              type="button"
              onClick={() => onExploreArea(selectedLocation)}
              className="px-4 py-2.5 rounded-xl bg-[#111B2A]/90 hover:bg-[#111B2A] border border-[#263449] hover:border-[#38BDF8]/50 text-[#F3F6FC] text-xs font-semibold uppercase tracking-wider backdrop-blur-md shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-[#38BDF8]" />
              <span>Area Selector</span>
            </button>
          )}

          <div className="bg-[#111B2A]/80 border border-[#263449] rounded-xl px-3 py-2 text-[10px] font-mono text-[#94A3B8] backdrop-blur-md hidden md:block">
            <span>Projection: 3D Spherical • WGS84 Reference Grid</span>
          </div>
        </div>
      </div>
    </div>
  );
};
