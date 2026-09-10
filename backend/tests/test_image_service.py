import os
import sys
from pathlib import Path
import pytest

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.models.schemas import ImageGenerateRequest
from app.services.image_service import image_service
from app.services.audit_logger import audit_logger


def test_image_service_status():
    status = image_service.get_status()
    assert status.model_name == "stabilityai/sd-turbo"
    assert status.device in ["cuda", "cpu"]
    assert status.is_available is True


def test_image_service_generate():
    req = ImageGenerateRequest(
        prompt="Sovereign edge computing node hardware with glowing LED telemetry lights",
        num_inference_steps=1,
        guidance_scale=0.0,
        width=512,
        height=512,
        seed=42,
    )
    resp = image_service.generate_image(req)
    assert resp.id.startswith("img_")
    assert resp.filename.endswith(".png")
    assert resp.width == 512
    assert resp.height == 512
    assert resp.steps == 1
    assert resp.generation_time_ms > 0
    assert resp.model_name == "stabilityai/sd-turbo"

    # Verify file exists on disk
    path = image_service.get_image_path(resp.id)
    assert path is not None
    assert path.exists()
    assert path.stat().st_size > 1000  # valid PNG

    # Verify audit log recorded event
    ledger = audit_logger.get_ledger(limit=5, event_type="IMAGE_GENERATE")
    assert len(ledger) > 0
    assert ledger[0].event_type == "IMAGE_GENERATE"
    assert ledger[0].details.get("image_id") == resp.id
