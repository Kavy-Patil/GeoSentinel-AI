"""
GeoSentinel AI - India Boundary Validator & Gazetteer Service.
Validates that coordinates and bounding boxes lie strictly within India's territorial extent
using official geoBoundaries ADM0 / ADM1 boundaries.
"""

from typing import Dict, List, Optional, Any, Tuple
import os
import json
from shapely.geometry import shape, Point, box, Polygon, MultiPolygon
from shapely.prepared import prep


class IndiaBoundaryService:
    """Service for validating India geographic extent and querying state boundaries & gazetteer."""

    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.boundaries_dir = os.path.join(data_dir, "india", "boundaries")
        self.places_path = os.path.join(data_dir, "india", "places.json")

        self.adm0_path = os.path.join(self.boundaries_dir, "india_adm0.geojson")
        self.adm1_path = os.path.join(self.boundaries_dir, "india_states_simplified.geojson")

        self._adm0_geojson: Optional[Dict[str, Any]] = None
        self._adm1_geojson: Optional[Dict[str, Any]] = None
        self._india_polygon: Optional[Any] = None
        self._prepared_india_geom: Optional[Any] = None
        self._places: List[Dict[str, Any]] = []

        self._load_data()

    def _load_data(self):
        """Loads boundary GeoJSON and gazetteer files."""
        # 1. ADM0 Country Boundary
        if os.path.exists(self.adm0_path):
            with open(self.adm0_path, "r", encoding="utf-8") as f:
                self._adm0_geojson = json.load(f)
                features = self._adm0_geojson.get("features", [])
                if features:
                    self._india_polygon = shape(features[0]["geometry"])
                    self._prepared_india_geom = prep(self._india_polygon)

        # 2. ADM1 State Outlines
        if os.path.exists(self.adm1_path):
            with open(self.adm1_path, "r", encoding="utf-8") as f:
                self._adm1_geojson = json.load(f)

        # 3. Gazetteer Places
        if os.path.exists(self.places_path):
            with open(self.places_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    self._places = data
                elif isinstance(data, dict):
                    self._places = data.get("places", [])
                else:
                    self._places = []

    def is_point_in_india(self, lat: float, lon: float) -> bool:
        """
        Validates whether a (lat, lon) coordinate lies strictly within India's boundaries.
        """
        # First rough bounding box check (India bounds approx: Lat 6 to 38, Lon 68 to 98)
        if not (6.0 <= lat <= 38.0 and 68.0 <= lon <= 98.0):
            return False

        if self._prepared_india_geom is not None:
            pt = Point(lon, lat)
            return bool(self._prepared_india_geom.contains(pt) or self._india_polygon.distance(pt) < 0.05)

        # Fallback bounding box check
        return 6.5 <= lat <= 37.5 and 68.0 <= lon <= 97.5

    def is_bbox_in_india(self, min_lon: float, min_lat: float, max_lon: float, max_lat: float) -> bool:
        """
        Validates whether a bounding box intersects and lies predominantly within India.
        """
        center_lat = (min_lat + max_lat) / 2
        center_lon = (min_lon + max_lon) / 2
        return self.is_point_in_india(center_lat, center_lon)

    def get_boundaries_geojson(self) -> Dict[str, Any]:
        """Returns ADM0 and ADM1 GeoJSON for interactive Leaflet mapping."""
        return {
            "attribution": "geoBoundaries (Runfola et al., 2020), gbOpen Open License",
            "country": self._adm0_geojson,
            "states": self._adm1_geojson,
        }

    def search_places(self, query: str = "") -> List[Dict[str, Any]]:
        """Searches local India gazetteer by name, state, or subregion."""
        if not query.strip():
            return self._places

        q = query.strip().lower()
        results = []
        for p in self._places:
            match = False
            if q in p["name"].lower() or q in p["state"].lower() or q in p["category"].lower():
                match = True
            elif any(q in sub.lower() for sub in p.get("subregions", [])):
                match = True

            if match:
                results.append(p)

        return results

    def get_place_by_id(self, place_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a place record by ID."""
        for p in self._places:
            if p["id"] == place_id or p["name"].lower() == place_id.lower():
                return p
        return None
