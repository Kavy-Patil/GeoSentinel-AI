import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, MapPin, Globe, Sparkles, Navigation } from 'lucide-react';
import { GeocodingResult, SelectedLocation } from '../../types/geography';
import { searchLocation, PRESET_LOCATIONS } from '../../services/geocoding';

interface LocationSearchProps {
  onSelectLocation: (location: SelectedLocation) => void;
  selectedLocation?: SelectedLocation | null;
}

export const LocationSearch: React.FC<LocationSearchProps> = ({
  onSelectLocation,
  selectedLocation: _selectedLocation,
}) => {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounced geocoding search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const data = await searchLocation(query);
        setResults(data);
        setIsOpen(true);
      } catch (err) {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Click outside to close suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectResult = (result: GeocodingResult) => {
    onSelectLocation({
      name: result.name,
      displayName: result.displayName,
      lat: result.lat,
      lon: result.lon,
      category: result.category,
      source: result.type === 'coordinate_pin' ? 'coordinates' : 'search',
    });
    setQuery(result.name);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' && results.length > 0) {
      handleSelectResult(results[0]);
    }
  };

  return (
    <div
      ref={searchContainerRef}
      className="relative w-full max-w-xl mx-auto z-40 select-none text-xs"
    >
      {/* Search Input Bar */}
      <div className="relative flex items-center bg-[#111B2A]/90 backdrop-blur-md border border-[#263449] hover:border-[#38BDF8]/60 focus-within:border-[#38BDF8] rounded-full shadow-[0_4px_25px_rgba(0,0,0,0.5)] transition-all px-4 py-2.5">
        <Search className="w-4 h-4 text-[#38BDF8] shrink-0 mr-2.5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search city, region, or coordinates (e.g. 28.61, 77.20)..."
          className="w-full bg-transparent text-[#F3F6FC] placeholder-[#94A3B8]/60 text-xs focus:outline-none font-sans"
        />

        {/* Loading Spinner or Clear Button */}
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-[#38BDF8] animate-spin shrink-0 ml-2" />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className="text-[#94A3B8] hover:text-[#F3F6FC] transition-colors p-0.5 rounded-full"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <span className="hidden sm:inline-block text-[10px] font-mono text-[#94A3B8]/60 bg-[#070D17]/80 px-2 py-0.5 rounded-full border border-[#263449]">
            ESC
          </span>
        )}
      </div>

      {/* Suggestion Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#111B2A]/95 backdrop-blur-xl border border-[#263449] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {results.length > 0 ? (
            <div className="p-1.5 space-y-0.5 max-h-72 overflow-y-auto">
              {results.map((item) => (
                <button
                  key={item.placeId}
                  type="button"
                  onClick={() => handleSelectResult(item)}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#070D17]/80 transition-colors flex items-start gap-2.5 group cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-lg bg-[#070D17] border border-[#263449] group-hover:border-[#38BDF8]/60 flex items-center justify-center text-[#38BDF8] shrink-0 mt-0.5">
                    {item.type === 'coordinate_pin' ? (
                      <Navigation className="w-3.5 h-3.5" />
                    ) : (
                      <MapPin className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-[#F3F6FC] group-hover:text-[#38BDF8] transition-colors truncate">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-[#94A3B8] truncate font-mono">
                      {item.displayName}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[9px] font-mono text-[#38BDF8] bg-[#38BDF8]/10 px-1.5 py-0.5 rounded border border-[#38BDF8]/20 block">
                      {item.lat.toFixed(2)}°, {item.lon.toFixed(2)}°
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : query.trim().length >= 2 && !isLoading ? (
            <div className="p-4 text-center text-xs text-[#94A3B8]">
              No locations found for "{query}". You can enter direct coordinates like "33.88, 35.54".
            </div>
          ) : (
            /* Quick Preset Benchmarks when search is focused */
            <div className="p-3 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#FF8617]" />
                Featured Earth Observation Benchmark Sites
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {PRESET_LOCATIONS.slice(0, 4).map((preset) => (
                  <button
                    key={preset.placeId}
                    type="button"
                    onClick={() => handleSelectResult(preset)}
                    className="text-left p-2 rounded-xl bg-[#070D17]/80 hover:bg-[#070D17] border border-[#263449] hover:border-[#38BDF8]/60 transition-all flex items-center gap-2 group cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#38BDF8] group-hover:scale-110 transition-transform shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-[#F3F6FC] truncate">
                        {preset.name}
                      </div>
                      <div className="text-[9px] text-[#94A3B8] truncate">
                        {preset.category}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
