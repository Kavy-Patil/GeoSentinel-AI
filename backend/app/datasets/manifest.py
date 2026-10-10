"""
GeoSentinel AI - Dataset Manifest and Registry.
Registers available benchmark datasets, licensing terms, and sample pairs.
"""

from typing import Dict, List, Optional, Any
import os
from app.datasets.levir_loader import LevirLoader
from app.datasets.oscd_loader import OscdLoader
from app.datasets.spacenet_loader import SpaceNet7Loader


class DatasetManifest:
    """Central dataset registry and metadata service."""

    def __init__(self, data_root: str):
        self.data_root = data_root
        self.levir_dir = os.path.join(data_root, "levir_cd")
        self.oscd_dir = os.path.join(data_root, "oscd")
        self.spacenet_dir = os.path.join(data_root, "spacenet7")
        self.geotiff_dir = os.path.join(data_root, "geotiff")

        self.levir_loader = LevirLoader(self.levir_dir)
        self.oscd_loader = OscdLoader(self.oscd_dir)
        self.spacenet_loader = SpaceNet7Loader(self.spacenet_dir)

    def get_available_datasets(self) -> List[Dict[str, Any]]:
        """Returns catalog of registered datasets with real availability counts."""
        levir_pairs = self.levir_loader.list_pairs()
        oscd_pairs = self.oscd_loader.list_pairs()
        sn7_pairs = self.spacenet_loader.list_pairs()

        return [
            {
                "id": "spacenet7",
                "name": "SpaceNet 7 Multi-Temporal Urban Development (PlanetScope 4m)",
                "available": len(sn7_pairs) > 0,
                "sample_count": len(sn7_pairs),
                "supports_georeferencing": True,
                "sensor": "PlanetScope Dove (4-band RGB-NIR, 4m GSD)",
                "license": "CC-BY-SA 4.0 (Radiant Earth / SpaceNet LLC)",
                "description": "24-month time series satellite imagery across global urban sites tracking building footprint construction.",
                "attribution": "Van Etten, A., Lindenbaum, D., & Bacastow, T. M. (2021). SpaceNet 7: Multi-Temporal Urban Development Challenge.",
            },
            {
                "id": "levir_cd",
                "name": "LEVIR-CD Building Change Benchmark",
                "available": len(levir_pairs) > 0,
                "sample_count": len(levir_pairs),
                "supports_georeferencing": False,
                "sensor": "High-Resolution Google Earth RGB (0.5m GSD)",
                "license": "Academic Research Use (Beihang University / LEVIR)",
                "description": "637 bi-temporal image pairs (1024x1024) annotated for building construction and demolition.",
                "attribution": "Chen, H., & Shi, Z. (2020). A Spatial-Temporal Attention-Based Method and a New Dataset for Remote Sensing Image Change Detection.",
            },
            {
                "id": "oscd",
                "name": "OSCD (ONERA Satellite Change Detection)",
                "available": len(oscd_pairs) > 0,
                "sample_count": len(oscd_pairs),
                "supports_georeferencing": True,
                "sensor": "Sentinel-2 MSI (10m-20m Multispectral)",
                "license": "CC-BY 4.0 / Copernicus Open Access",
                "description": "Multispectral satellite imagery across global urban regions with pixel-level change ground truth.",
                "attribution": "Daudt, R. C., Le Saux, B., Boulch, A., & Gousseau, Y. (2018). Urban Change Detection for Multispectral Earth Observation Using Convolutional Neural Networks.",
            },
            {
                "id": "custom_geotiff",
                "name": "Custom Orthorectified GeoTIFF Ingestion",
                "available": True,
                "sample_count": 0,
                "supports_georeferencing": True,
                "sensor": "User Supplied (Landsat / Sentinel-2 / PlanetScope / Aerial)",
                "license": "User Defined",
                "description": "Direct upload of two orthorectified GeoTIFF rasters with automated CRS extraction and spatial co-registration.",
                "attribution": "User Data",
            },
        ]

    def list_samples(self, dataset_id: str) -> List[Dict[str, Any]]:
        """Lists available sample pairs for a specific dataset ID."""
        if dataset_id == "spacenet7":
            pairs = self.spacenet_loader.list_pairs()
            names = {
                "sn7_urban_expansion_aoi01": "SpaceNet 7 Urban Expansion AOI 01 (EPSG:32632 • 4m GSD)",
                "sn7_construction_aoi02": "SpaceNet 7 Construction Footprint AOI 02 (EPSG:32618 • 4m GSD)",
            }
            return [
                {
                    "sample_id": p,
                    "name": names.get(p, f"SpaceNet 7 AOI {p}"),
                    "category": "PlanetScope Urban Expansion & Buildings",
                    "georeferenced": True,
                    "dimensions": "256x256 px • 4m GSD",
                }
                for p in pairs
            ]
        elif dataset_id == "levir_cd":
            pairs = self.levir_loader.list_pairs()
            return [
                {
                    "sample_id": p,
                    "name": f"LEVIR-CD Pair {p}",
                    "category": "Urban & Building Change",
                    "georeferenced": False,
                    "dimensions": "1024x1024",
                }
                for p in pairs
            ]
        elif dataset_id == "oscd":
            pairs = self.oscd_loader.list_pairs()
            names = {
                "beirut": "OSCD Beirut, Lebanon (EPSG:32636 • Sentinel-2)",
                "valencia": "OSCD Valencia, Spain (EPSG:32630 • Sentinel-2)",
                "las_vegas": "OSCD Las Vegas, USA (EPSG:32611 • Sentinel-2)",
            }
            return [
                {
                    "sample_id": p,
                    "name": names.get(p, f"OSCD Region {p}"),
                    "category": "Multispectral Urban & Land Change",
                    "georeferenced": True,
                    "dimensions": "256x256 px • 10m GSD",
                }
                for p in pairs
            ]
        elif dataset_id == "custom_geotiff":
            return [
                {
                    "sample_id": "delhi_sector49",
                    "name": "Sample Delhi NCR GeoTIFF (EPSG:32643 • 0.5m GSD)",
                    "category": "Urban Encroachment GeoTIFF",
                    "georeferenced": True,
                    "dimensions": "512x512 px • 0.5m GSD",
                }
            ]
        return []

    def get_sample_details(self, dataset_id: str, sample_id: str) -> Dict[str, Any]:
        """Loads metadata for a specific sample."""
        if dataset_id == "spacenet7":
            return self.spacenet_loader.load_pair(sample_id)
        elif dataset_id == "levir_cd":
            return self.levir_loader.load_pair(sample_id)
        elif dataset_id == "oscd":
            return self.oscd_loader.load_pair(sample_id)
        raise FileNotFoundError(f"Dataset '{dataset_id}' or sample '{sample_id}' not found.")

