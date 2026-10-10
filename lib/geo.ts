export type Place = { id: number; name: string; latitude: number; longitude: number; admin1?: string; country?: string; feature_code?: string };
export type Bounds = [number, number, number, number]; // west, south, east, north
export type Point = [number, number]; // longitude, latitude
export const EARLIEST_DATE = "2000-02-24";
export function label(place: Place) { return [...new Set([place.name, place.admin1, place.country].filter(Boolean))].join(", "); }
export function dateError(before: string, after: string, today: string) {
  const valid = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
  if (!valid(before) || !valid(after)) return "Choose valid before and after dates.";
  if (before < EARLIEST_DATE || after < EARLIEST_DATE) return "MODIS imagery starts on 24 February 2000. Choose later dates.";
  if (before >= after) return "The after date must be later than the before date.";
  if (after > today) return "Future satellite imagery is not available. Choose today or an earlier date.";
  return "";
}
export function boundsFor(place: Place, widthKm: number): Bounds {
  const cos = Math.max(0.1, Math.cos(place.latitude * Math.PI / 180));
  const halfLon = widthKm / (2 * 111.32 * cos);
  const halfLat = widthKm * 0.75 / (2 * 111.32);
  return [Math.max(-180, place.longitude - halfLon), Math.max(-85, place.latitude - halfLat), Math.min(180, place.longitude + halfLon), Math.min(85, place.latitude + halfLat)];
}
export function imageUrl(bounds: Bounds, date: string) {
  const params = new URLSearchParams({ SERVICE: "WMS", REQUEST: "GetMap", VERSION: "1.1.1", LAYERS: "MODIS_Terra_CorrectedReflectance_TrueColor", STYLES: "", FORMAT: "image/png", TRANSPARENT: "TRUE", SRS: "EPSG:4326", BBOX: bounds.join(","), WIDTH: "1000", HEIGHT: "750", TIME: date });
  return `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?${params}`;
}
export function toPercent(point: Point, bounds: Bounds): Point {
  return [(point[0] - bounds[0]) / (bounds[2] - bounds[0]) * 100, (bounds[3] - point[1]) / (bounds[3] - bounds[1]) * 100];
}
export function fromPercent(x: number, y: number, bounds: Bounds): Point {
  return [bounds[0] + x / 100 * (bounds[2] - bounds[0]), bounds[3] - y / 100 * (bounds[3] - bounds[1])];
}
export function validPlaces(values: unknown): Place[] {
  if (!Array.isArray(values)) return [];
  return values.filter((p): p is Place => p && typeof p.name === "string" && Number.isFinite(p.id) && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && Math.abs(p.latitude) <= 85 && Math.abs(p.longitude) <= 180 && (!p.feature_code || p.feature_code.startsWith("PPL") || p.feature_code.startsWith("ADM")));
}
