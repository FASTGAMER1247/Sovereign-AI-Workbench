import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app

client = TestClient(app)


def test_image_status_endpoint():
    response = client.get("/api/images/status")
    assert response.status_code == 200
    data = response.json()
    assert data["model_name"] == "stabilityai/sd-turbo"
    assert data["is_available"] is True
    assert data["device"] in ["cuda", "cpu"]


def test_image_generate_and_download_endpoints():
    gen_payload = {
        "prompt": "Futuristic aerospace avionics display panel, industrial blueprint, vector",
        "num_inference_steps": 1,
        "guidance_scale": 0.0,
        "width": 512,
        "height": 512,
        "seed": 123
    }
    gen_resp = client.post("/api/images/generate", json=gen_payload)
    assert gen_resp.status_code == 200
    data = gen_resp.json()
    assert "id" in data
    img_id = data["id"]
    assert data["filename"].endswith(".png")
    assert data["file_url"] == f"/api/images/{img_id}/download"

    # Test download endpoint
    dl_resp = client.get(f"/api/images/{img_id}/download")
    assert dl_resp.status_code == 200
    assert dl_resp.headers["content-type"] == "image/png"
    assert len(dl_resp.content) > 1000
