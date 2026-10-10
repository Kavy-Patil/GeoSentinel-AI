import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, ChevronRight, X } from 'lucide-react';
import { IndiaPlace } from '../../types/india';

interface IndiaSearchProps {
  places: IndiaPlace[];
  selectedPlace: IndiaPlace | null;
  onSelectPlace: (place: IndiaPlace) => void;
  className?: string;
}

export const IndiaSearch: React.FC<IndiaSearchProps> = ({
  places,
  selectedPlace,
  onSelectPlace,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredPlaces = places.filter((p) => {
    const q = query.toLowerCase();
    const matchName = p.name.toLowerCase().includes(q);
    const matchState = p.state.toLowerCase().includes(q);
    const matchCat = p.category ? p.category.toLowerCase().includes(q) : false;
    const matchDesc = p.description ? p.description.toLowerCase().includes(q) : false;
    const matchSub = p.subregions ? p.subregions.some((s) => s.toLowerCase().includes(q)) : false;
    return matchName || matchState || matchCat || matchDesc || matchSub;
  });

  return (
    <div ref={containerRef} className={`relative z-30 ${className}`}>
      <div className="flex items-center bg-[#0d1624]/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3.5 py-2.5 shadow-2xl shadow-black/60 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 transition-all">
        <Search className="w-4 h-4 text-sky-400 mr-2.5 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search verified ICCD city (Agra, Kannur, Pune, Kargil, Ambala)..."
          className="bg-transparent border-none outline-none text-xs sm:text-sm text-slate-100 placeholder-slate-400 w-full"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="text-slate-400 hover:text-slate-200 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#0d1624]/95 backdrop-blur-xl border border-slate-700/90 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto divide-y divide-slate-800/80">
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-cyan-400 bg-slate-900/60 flex items-center justify-between">
            <span>Verified ICCD Dataset Cities</span>
            <span>{filteredPlaces.length} cities</span>
          </div>
          {filteredPlaces.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-400">
              No matching ICCD city found. Try searching for "Agra", "Kannur", "Pune", "Kargil", or "Ambala".
            </div>
          ) : (
            filteredPlaces.map((place) => {
              const isSelected = selectedPlace?.id === place.id;
              return (
                <button
                  key={place.id}
                  onClick={() => {
                    onSelectPlace(place);
                    setQuery(`${place.name}, ${place.state}`);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-cyan-500/15 border-l-2 border-cyan-400'
                      : 'hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 mt-0.5 shrink-0">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-slate-100 truncate">
                          {place.name}
                        </span>
                        <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-800 shrink-0">
                          {place.state}
                        </span>
                        {place.total_pairs && (
                          <span className="text-[9px] text-cyan-300 font-mono px-1.5 py-0.2 bg-cyan-950/60 border border-cyan-800/40 rounded">
                            {place.total_pairs} pairs
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {place.description || place.category}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 ml-2" />
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
