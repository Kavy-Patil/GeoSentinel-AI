"use client";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Rectangle, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Bounds, Place } from "../lib/geo";
function Fit({ bounds }: { bounds: Bounds }) { const map = useMap(); useEffect(() => { map.invalidateSize(); map.fitBounds([[bounds[1], bounds[0]], [bounds[3], bounds[2]]], { padding: [18, 18], animate: false }); }, [map, bounds]); return null; }
export default function MonitoringMap({ place, bounds }: { place: Place; bounds: Bounds }) {
  return <MapContainer center={[place.latitude, place.longitude]} zoom={10} className="location-map" scrollWheelZoom={false}>
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <Rectangle bounds={[[bounds[1], bounds[0]], [bounds[3], bounds[2]]]} pathOptions={{ color: "#0f766e", weight: 2, fillOpacity: 0.05 }} />
    <CircleMarker center={[place.latitude, place.longitude]} radius={7} pathOptions={{ color: "#fff", weight: 2, fillColor: "#0f766e", fillOpacity: 1 }}><Tooltip permanent direction="top">{place.name}</Tooltip></CircleMarker>
    <Fit bounds={bounds} />
  </MapContainer>;
}
