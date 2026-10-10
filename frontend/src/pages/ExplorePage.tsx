import React, { useState } from 'react';
import { EarthGlobe } from '../components/globe/EarthGlobe';
import { LocationSearch } from '../components/globe/LocationSearch';
import { AreaSelector } from '../components/globe/AreaSelector';
import { SelectedLocation } from '../types/geography';
import { PRESET_LOCATIONS } from '../services/geocoding';
import { Compass } from 'lucide-react';

interface ExplorePageProps {
  selectedLocation: SelectedLocation | null;
  onSelectLocation: (location: SelectedLocation) => void;
  onConfirmArea: (locationWithBounds: SelectedLocation) => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({
  selectedLocation,
  onSelectLocation,
  onConfirmArea,
}) => {
  const [radiusKm, setRadiusKm] = useState<number>(10);

  // Default fallback to first benchmark site if none selected yet
  const activeLocation: SelectedLocation = selectedLocation || {
    name: PRESET_LOCATIONS[0].name,
    displayName: PRESET_LOCATIONS[0].displayName,
    lat: PRESET_LOCATIONS[0].lat,
    lon: PRESET_LOCATIONS[0].lon,
    category: PRESET_LOCATIONS[0].category,
    source: 'preset',
  };

  return (
    <div className="relative w-full h-full bg-[#070D17] overflow-hidden select-none flex flex-col justify-between">
      {/* 1. Top Search Bar & Header */}
      <div className="absolute top-6 inset-x-0 z-30 px-4 flex flex-col items-center pointer-events-none">
        <div className="mb-3 text-center pointer-events-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111B2A]/80 border border-[#263449] backdrop-blur-md shadow-lg">
            <Compass className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span className="text-[11px] font-bold text-[#F3F6FC] tracking-wider uppercase">
              Geographic Area Selector
            </span>
            <span className="w-1 h-1 rounded-full bg-[#38BDF8]" />
            <span className="text-[10px] text-[#94A3B8]">Define Target Extent for Satellite Analysis</span>
          </div>
        </div>

        <div className="w-full max-w-xl pointer-events-auto">
          <LocationSearch
            onSelectLocation={onSelectLocation}
            selectedLocation={activeLocation}
          />
        </div>
      </div>

      {/* 2. Main 3D Earth in Explore Mode (with radius ring) */}
      <div className="w-full h-full absolute inset-0 z-10">
        <EarthGlobe
          selectedLocation={activeLocation}
          onSelectLocation={onSelectLocation}
          selectionRadiusKm={radiusKm}
          isExploreMode={true}
        />
      </div>

      {/* 3. Bottom Area Selector Control Card */}
      <div className="absolute bottom-6 inset-x-6 z-30 flex items-end justify-between pointer-events-none">
        <div className="pointer-events-auto">
          <AreaSelector
            location={activeLocation}
            radiusKm={radiusKm}
            onRadiusChange={setRadiusKm}
            onConfirmArea={onConfirmArea}
          />
        </div>

        <div className="bg-[#111B2A]/80 border border-[#263449] rounded-xl px-4 py-2.5 text-xs text-[#94A3B8] backdrop-blur-md max-w-xs hidden md:block">
          <span className="text-[#38BDF8] font-semibold block mb-0.5">
            Geodesic Footprint Calculation:
          </span>
          Bounding coordinates are computed from real spherical angular distance on the WGS84 ellipsoid.
        </div>
      </div>
    </div>
  );
};
