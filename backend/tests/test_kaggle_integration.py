"""
Tests for Kaggle Dataset Manager and SpaceNet 7 integration.
"""

from app.datasets.kaggle_downloader import KaggleDatasetManager


def test_list_kaggle_datasets():
    datasets = KaggleDatasetManager.list_registered_kaggle_datasets()
    assert len(datasets) >= 3
    slugs = [d["kaggle_slug"] for d in datasets]
    assert "jaskiratsinghchopra/levir-cd" in slugs
    assert "amerii/spacenet-7-multitemporal-urban-development" in slugs
    assert "soumikrakshit/onera-satellite-change-detection-dataset" in slugs


def test_kaggle_auth_check_structure():
    auth = KaggleDatasetManager.check_kaggle_auth()
    assert "authenticated" in auth
    assert "credential_file_exists" in auth
    assert "instructions" in auth
