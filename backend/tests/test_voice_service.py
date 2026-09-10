"""
Tests for Sovereign AI Workbench Voice Services (STT & TTS)
Verifies local speech synthesis, voice status reporting, and audio endpoints.
"""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app
from app.services.voice_service import voice_service
from app.models.schemas import VoiceSynthesizeRequest


@pytest.fixture
def client():
    return TestClient(app)


def test_voice_service_get_status():
    """Verify VoiceService returns operational status and installed local voices."""
    status = voice_service.get_status()
    assert status.stt_available is True
    assert status.tts_available is True
    assert len(status.installed_voices) > 0
    assert status.default_voice is not None
    assert status.device_used in ["cuda:0", "cpu"]


def test_voice_service_synthesize():
    """Verify VoiceService synthesizes valid PCM WAV bytes."""
    req = VoiceSynthesizeRequest(text="System voice test", rate=0, volume=100)
    wav_bytes = voice_service.synthesize(req)
    assert isinstance(wav_bytes, bytes)
    assert len(wav_bytes) > 1000
    # Check RIFF/WAVE header
    assert wav_bytes[:4] == b"RIFF"
    assert wav_bytes[8:12] == b"WAVE"


def test_voice_status_endpoint(client):
    """Test GET /api/voice/status endpoint."""
    response = client.get("/api/voice/status")
    assert response.status_code == 200
    data = response.json()
    assert data["stt_available"] is True
    assert data["tts_available"] is True
    assert isinstance(data["installed_voices"], list)
    assert len(data["installed_voices"]) > 0


def test_voice_synthesize_endpoint(client):
    """Test POST /api/voice/synthesize endpoint."""
    response = client.post(
        "/api/voice/synthesize",
        json={"text": "Hello Sovereign Copilot", "rate": 1, "volume": 90}
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"
    assert len(response.content) > 1000
    assert response.content[:4] == b"RIFF"
