"""
GeoSentinel AI - Kaggle Satellite Dataset Integration & Downloader Service.
Manages Kaggle API authentication checks, remote dataset metadata inspection,
and selective sample downloads for LEVIR-CD, SpaceNet 7, and ONERA OSCD.
"""

from typing import Dict, List, Optional, Any, Tuple
import os
import sys
import json
import logging

logger = logging.getLogger("geosentinel.kaggle")

KAGGLE_DATASETS = {
    "levir_cd": {
        "slug": "jaskiratsinghchopra/levir-cd",
        "name": "LEVIR-CD Building Change Detection Benchmark",
        "sensor": "Google Earth Optical RGB (0.5m GSD)",
        "task": "Building Construction / Demolition",
        "license": "Academic Research Use",
    },
    "spacenet7": {
        "slug": "amerii/spacenet-7-multitemporal-urban-development",
        "name": "SpaceNet 7 Multi-Temporal Urban Development Challenge",
        "sensor": "PlanetScope Satellite Imagery (4m GSD, 4-band RGB-NIR)",
        "task": "Urban Expansion & Building Footprint Tracking",
        "license": "CC-BY-SA 4.0 (Radiant Earth / SpaceNet LLC)",
    },
    "oscd": {
        "slug": "soumikrakshit/onera-satellite-change-detection-dataset",
        "name": "ONERA Satellite Change Detection (OSCD)",
        "sensor": "Sentinel-2 MSI (10m-20m Multispectral)",
        "task": "Multispectral Urban & Land-Cover Change",
        "license": "CC-BY 4.0 / Copernicus Open Access",
    },
}


class KaggleDatasetManager:
    """Manages Kaggle dataset inspection and selective sample downloading."""

    @staticmethod
    def check_kaggle_auth() -> Dict[str, Any]:
        """
        Checks whether Kaggle credentials exist and are functional.
        """
        user_home = os.path.expanduser("~")
        kaggle_json = os.path.join(user_home, ".kaggle", "kaggle.json")
        access_token = os.path.join(user_home, ".kaggle", "access_token")
        
        has_env_token = bool(os.getenv("KAGGLE_API_TOKEN"))
        has_env_keys = bool(os.getenv("KAGGLE_USERNAME") and os.getenv("KAGGLE_KEY"))
        has_file = os.path.exists(kaggle_json) or os.path.exists(access_token)

        authenticated = False
        username = None
        auth_error = None

        if has_file or has_env_token or has_env_keys:
            try:
                import kaggle
                from kaggle.api.kaggle_api_extended import KaggleApi
                api = KaggleApi()
                api.authenticate()
                authenticated = True
                username = getattr(api, "config_values", {}).get("username", "Kaggle User")
            except Exception as e:
                authenticated = False
                auth_error = str(e)

        return {
            "authenticated": authenticated,
            "username": username,
            "credential_file_exists": has_file,
            "env_credentials_present": has_env_token or has_env_keys,
            "auth_error": auth_error,
            "instructions": (
                "To authenticate with Kaggle:\n"
                "1. Go to https://www.kaggle.com/settings/api and click 'Generate New Token'.\n"
                "2. Place the downloaded 'kaggle.json' in ~/.kaggle/kaggle.json, OR\n"
                "3. Set environment variable KAGGLE_API_TOKEN=<your-token>"
            ),
        }

    @staticmethod
    def list_registered_kaggle_datasets() -> List[Dict[str, Any]]:
        """Returns details and slugs of registered Kaggle satellite datasets."""
        results = []
        for dataset_id, info in KAGGLE_DATASETS.items():
            results.append({
                "id": dataset_id,
                "kaggle_slug": info["slug"],
                "name": info["name"],
                "sensor": info["sensor"],
                "task": info["task"],
                "license": info["license"],
                "url": f"https://www.kaggle.com/datasets/{info['slug']}",
            })
        return results

    @staticmethod
    def download_dataset_sample(dataset_id: str, target_dir: str) -> Dict[str, Any]:
        """
        Attempts to download the dataset using Kaggle API if authenticated.
        If unauthenticated, returns actionable instructions.
        """
        auth_status = KaggleDatasetManager.check_kaggle_auth()
        if not auth_status["authenticated"]:
            return {
                "success": False,
                "dataset_id": dataset_id,
                "error": "Kaggle API authentication required.",
                "details": auth_status,
            }

        if dataset_id not in KAGGLE_DATASETS:
            return {
                "success": False,
                "error": f"Unknown dataset '{dataset_id}'. Registered datasets: {list(KAGGLE_DATASETS.keys())}",
            }

        slug = KAGGLE_DATASETS[dataset_id]["slug"]
        os.makedirs(target_dir, exist_ok=True)

        try:
            import kaggle
            from kaggle.api.kaggle_api_extended import KaggleApi
            api = KaggleApi()
            api.authenticate()

            # Download files
            api.dataset_download_files(slug, path=target_dir, unzip=True, quiet=False)

            return {
                "success": True,
                "dataset_id": dataset_id,
                "slug": slug,
                "target_dir": target_dir,
                "message": f"Successfully downloaded and extracted '{slug}' into '{target_dir}'.",
            }
        except Exception as e:
            return {
                "success": False,
                "dataset_id": dataset_id,
                "slug": slug,
                "error": str(e),
            }
