import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  Tooltip,
  Rectangle,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Sparkles,
  ExternalLink,
  Database,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { IndiaPlace } from '../../types/india';
import { fetchIndiaBoundaries, fetchIndiaPlaces } from '../../api/india';
import { IndiaSearch } from './IndiaSearch';
import { SatelliteDiscoveryDrawer } from '../acquisition/SatelliteDiscoveryDrawer';

// Custom Cyan Pin Marker Icon for ICCD Cities
const createCustomIcon = (isSelected: boolean, hasLocalSample: boolean) => {
  const primaryColor = isSelected ? '#38BDF8' : '#06B6D4';
  const size = isSelected ? 34 : 26;
  return L.divIcon({
    className: 'custom-india-pin',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${isSelected ? 'rgba(56, 189, 248, 0.35)' : 'rgba(15, 23, 42, 0.85)'};
        border: 2px solid ${primaryColor};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 ${isSelected ? '18px rgba(56, 189, 248, 0.8)' : '10px rgba(6, 182, 212, 0.4)'};
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
      ">
        <div style="
          width: ${isSelected ? 12 : 8}px;
          height: ${isSelected ? 12 : 8}px;
          background: ${primaryColor};
          border-radius: 50%;
        "></div>
        ${
          hasLocalSample
            ? `<div style="
                position: absolute;
                top: -3px;
                right: -3px;
                width: 8px;
                height: 8px;
                background: #10B981;
                border-radius: 50%;
                border: 1.5px solid #0F172A;
              "></div>`
            : ''
        }
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Map Viewport Controller
const MapController: React.FC<{
  selectedPlace: IndiaPlace | null;
}> = ({ selectedPlace }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedPlace) {
      map.flyTo([selectedPlace.lat, selectedPlace.lon || (selectedPlace.lng as number)], 11, {
        duration: 1.4,
        easeLinearity: 0.25,
      });
    }
  }, [selectedPlace, map]);

  return null;
};

interface IndiaMapProps {
  onJobCreated: (jobId: string, locationName: string, bounds: any) => void;
  onOpenChangeMonitor?: () => void;
}

export const IndiaMap: React.FC<IndiaMapProps> = ({
  onJobCreated,
}) => {
  const [places, setPlaces] = useState<IndiaPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<IndiaPlace | null>(null);
  const [boundariesData, setBoundariesData] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Load India places & GeoJSON boundaries on mount
  useEffect(() => {
    const initData = async () => {
      try {
        const placesRes = await fetchIndiaPlaces();
        setPlaces(placesRes.places);
        // Default to Pune (which has local cached samples)
        const pune = placesRes.places.find((p) => p.id === 'pune') || placesRes.places[0];
        if (pune) setSelectedPlace(pune);

        const boundsRes = await fetchIndiaBoundaries('adm1');
        setBoundariesData(boundsRes);
      } catch (err) {
        console.error('Failed to load India geospatial datasets:', err);
      }
    };
    initData();
  }, []);

  // Compute selected AOI bounds for rectangle
  const selectedBounds: [[number, number], [number, number]] | null = React.useMemo(() => {
    if (!selectedPlace) return null;
    const r = selectedPlace.default_radius_km || 3.5;
    const lonVal = selectedPlace.lon || (selectedPlace.lng as number);
    const latDelta = (r * 1000) / 111320;
    const lonDelta = (r * 1000) / (111320 * Math.cos((selectedPlace.lat * Math.PI) / 180));
    return [
      [selectedPlace.lat - latDelta, lonVal - lonDelta],
      [selectedPlace.lat + latDelta, lonVal + lonDelta],
    ];
  }, [selectedPlace]);

  // GeoJSON styling for Indian state boundaries
  const boundaryStyle = () => ({
    fillColor: '#0369A1',
    fillOpacity: 0.04,
    color: '#0284C7',
    weight: 1.2,
    opacity: 0.6,
    dashArray: '3, 4',
  });

  const [basemapType, setBasemapType] = useState<'dark' | 'satellite' | 'osm'>('dark');

  // Basemap Tile Providers (No API key required)
  const basemapConfigs = {
    dark: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      maxZoom: 16,
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 18,
    },
    osm: {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    },
  };

  const hasLocalSample = (selectedPlace?.local_samples_available ?? 0) > 0;

  return (
    <div className="relative w-full h-full min-h-[calc(100vh-64px)] bg-[#070D17] overflow-hidden">
      {/* Top Floating Controls */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pointer-events-none">
        {/* Search Bar */}
        <div className="w-full sm:max-w-md pointer-events-auto">
          <IndiaSearch
            places={places}
            selectedPlace={selectedPlace}
            onSelectPlace={(p) => {
              setSelectedPlace(p);
            }}
          />
        </div>

        {/* Right Controls: Basemap Toggle & ICCD Dataset Badge */}
        <div className="flex items-center space-x-2 pointer-events-auto self-start sm:self-auto">
          {/* Basemap Switcher */}
          <div className="flex items-center bg-[#0d1624]/90 backdrop-blur-md border border-slate-700/80 p-1 rounded-xl shadow-xl text-[11px] font-medium">
            <button
              onClick={() => setBasemapType('dark')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                basemapType === 'dark'
                  ? 'bg-cyan-500 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dark Canvas
            </button>
            <button
              onClick={() => setBasemapType('satellite')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                basemapType === 'satellite'
                  ? 'bg-cyan-500 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Satellite Base
            </button>
            <button
              onClick={() => setBasemapType('osm')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                basemapType === 'osm'
                  ? 'bg-cyan-500 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              OSM Streets
            </button>
          </div>

          {/* ICCD Dataset Badge */}
          <div className="flex items-center space-x-2 bg-[#0d1624]/90 backdrop-blur-md border border-cyan-500/30 px-3 py-1.5 rounded-xl shadow-xl">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
            <span className="text-xs font-semibold text-cyan-200">
              5 ICCD Cities
            </span>
          </div>
        </div>
      </div>

      {/* Main Leaflet Map */}
      <MapContainer
        center={[22.5, 78.9629]}
        zoom={5}
        minZoom={4}
        maxZoom={16}
        className="w-full h-full z-10"
        zoomControl={false}
        attributionControl={false}
      >
        <MapController selectedPlace={selectedPlace} />

        {/* Base Layer: Verified No-Key Public Tile Providers */}
        <TileLayer
          key={basemapType}
          url={basemapConfigs[basemapType].url}
          attribution={basemapConfigs[basemapType].attribution}
          maxZoom={basemapConfigs[basemapType].maxZoom}
        />

        {/* Official geoBoundaries State Outlines */}
        {boundariesData && (
          <GeoJSON
            data={boundariesData}
            style={boundaryStyle}
            onEachFeature={(feature, layer) => {
              const name = feature.properties?.shapeName || feature.properties?.name || 'State';
              layer.bindTooltip(name, {
                permanent: false,
                direction: 'center',
                className: 'india-state-tooltip text-[11px] font-medium bg-slate-900/90 text-slate-200 border-slate-700 px-2 py-1 rounded shadow-lg',
              });
            }}
          />
        )}

        {/* Selected AOI Corridor Rectangle */}
        {selectedBounds && (
          <Rectangle
            bounds={selectedBounds}
            pathOptions={{
              color: '#06B6D4',
              weight: 2,
              fillColor: '#06B6D4',
              fillOpacity: 0.15,
              dashArray: '6, 6',
            }}
          />
        )}

        {/* ICCD 5 Verified City Markers */}
        {places.map((place) => {
          const isSelected = selectedPlace?.id === place.id;
          const hasLocal = (place.local_samples_available ?? 0) > 0;
          const lonVal = place.lon || (place.lng as number);
          return (
            <Marker
              key={place.id}
              position={[place.lat, lonVal]}
              icon={createCustomIcon(isSelected, hasLocal)}
              eventHandlers={{
                click: () => {
                  setSelectedPlace(place);
                },
              }}
            >
              <Tooltip
                direction="top"
                offset={[0, -12]}
                opacity={1}
                className="custom-iccd-tooltip font-medium text-xs bg-slate-900 text-slate-100 border border-slate-700 px-2.5 py-1 rounded-md shadow-xl"
              >
                <span>{place.name}, {place.state}</span>
              </Tooltip>
              <Popup className="custom-dark-popup">
                <div className="p-2 space-y-2 min-w-[220px]">
                  <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
                    <div>
                      <span className="font-bold text-xs text-slate-100">{place.name}</span>
                      <span className="text-[10px] text-cyan-400 block">{place.state}</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                      ICCD (2025)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="bg-slate-800/60 p-1.5 rounded">
                      <span className="text-slate-400 block">Total Pairs</span>
                      <span className="font-mono text-cyan-300 font-bold">{place.total_pairs}</span>
                    </div>
                    <div className="bg-slate-800/60 p-1.5 rounded">
                      <span className="text-slate-400 block">Change Instances</span>
                      <span className="font-mono text-emerald-400 font-bold">{place.change_instances}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedPlace(place);
                      setIsDrawerOpen(true);
                    }}
                    className="w-full mt-1 py-1.5 px-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-[11px] font-semibold flex items-center justify-center space-x-1 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Historical Timeline (2000–2026)</span>
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Bottom Card: ICCD Location Detail & Research Attribution */}
      {selectedPlace && (
        <div className="absolute bottom-6 left-6 z-20 max-w-md w-full bg-[#09101d]/95 backdrop-blur-xl border border-slate-700/90 rounded-2xl p-4 shadow-2xl shadow-black/80 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-100">
                  {selectedPlace.name}
                </h3>
                <span className="text-[11px] text-slate-300 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700">
                  {selectedPlace.state}
                </span>
                <span className="text-[10px] text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/40 font-mono">
                  ICCD City
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {selectedPlace.description || selectedPlace.category}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0">
              <Database className="w-4 h-4" />
            </div>
          </div>

          {/* Published Research Statistics */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1.5">
              <span>Published Research Statistics (ICCD)</span>
              <span className="text-[10px] text-cyan-400">RINENG 2025</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-[11px]">
              <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-center">
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Total</span>
                <span className="text-cyan-300 font-mono font-bold text-xs">
                  {selectedPlace.total_pairs}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-center">
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Labeled</span>
                <span className="text-slate-200 font-mono font-bold text-xs">
                  {selectedPlace.labeled_pairs}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-center">
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Unlabeled</span>
                <span className="text-slate-400 font-mono font-bold text-xs">
                  {selectedPlace.unlabeled_pairs}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-center">
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Changes</span>
                <span className="text-emerald-400 font-mono font-bold text-xs">
                  {selectedPlace.change_instances}
                </span>
              </div>
            </div>
          </div>

          {/* Research Source Attribution */}
          <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-[11px]">
            <div className="flex items-center space-x-2 text-slate-300">
              <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">Results in Engineering (2025)</span>
            </div>
            <div className="flex items-center space-x-3 shrink-0">
              {selectedPlace.paper_doi && (
                <a
                  href={selectedPlace.paper_doi}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-0.5 text-[10px] font-medium"
                >
                  <span>Paper</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
              {selectedPlace.github_repo && (
                <a
                  href={selectedPlace.github_repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-slate-200 flex items-center space-x-0.5 text-[10px] font-medium"
                >
                  <span>GitHub</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/25 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Historical Satellite Timeline (2000–2026)</span>
            </button>

            {hasLocalSample && (
              <div className="flex items-center justify-center space-x-1.5 text-[10px] text-emerald-400 bg-emerald-950/30 border border-emerald-800/30 py-1 px-2 rounded-lg">
                <CheckCircle2 className="w-3 h-3" />
                <span>Verified Sentinel-2 & 30m Landsat Ready</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Satellite Discovery & Acquisition Drawer */}
      <SatelliteDiscoveryDrawer
        place={selectedPlace}
        customBbox={null}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onJobCreated={(jobId, locName, bounds) => {
          setIsDrawerOpen(false);
          onJobCreated(jobId, locName, bounds);
        }}
      />
    </div>
  );
};
