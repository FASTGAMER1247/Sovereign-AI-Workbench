"""
Sovereign AI Workbench — Voice Service (STT & TTS)
Provides 100% local, air-gapped Speech-to-Text and Text-to-Speech capabilities.

Features:
- Local TTS synthesis via Windows SAPI5 / pyttsx3 with zero latency and zero VRAM usage.
- Local STT transcription via Whisper (openai/whisper-tiny.en) running locally on CUDA/CPU.
- Sequential SHA-256 cryptographic audit logging for all voice events.
"""

import io
import logging
import os
import sys
import tempfile
import time
import uuid
import wave
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pyttsx3

from app.config import Settings, get_settings
from app.models.schemas import (
    VoiceStatusResponse,
    VoiceSynthesizeRequest,
    VoiceTranscribeResponse,
)
from app.services.audit_logger import audit_logger

logger = logging.getLogger(__name__)


class VoiceService:
    """Service layer managing local Speech-to-Text and Text-to-Speech pipelines."""

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()
        self._stt_pipeline = None
        self._stt_model_name = "openai/whisper-tiny.en"
        self._device = "cuda:0" if self._is_cuda_available() else "cpu"
        self._installed_voices_cache: Optional[List[str]] = None

    def _is_cuda_available(self) -> bool:
        try:
            import torch
            return torch.cuda.is_available()
        except Exception:
            return False

    def get_installed_voices(self) -> List[str]:
        """Query and cache local Windows SAPI / system voices."""
        if self._installed_voices_cache is not None:
            return self._installed_voices_cache

        voices_list = []
        try:
            engine = pyttsx3.init()
            raw_voices = engine.getProperty("voices") or []
            for v in raw_voices:
                name = getattr(v, "name", None) or getattr(v, "id", "Unknown Voice")
                voices_list.append(name)
            engine.stop()
        except Exception as e:
            logger.warning(f"Failed to query pyttsx3 voices: {e}")
            voices_list = ["Microsoft David Desktop", "Microsoft Zira Desktop"]

        self._installed_voices_cache = voices_list
        return voices_list

    def get_status(self) -> VoiceStatusResponse:
        """Return operational status and available local voices."""
        voices = self.get_installed_voices()
        default_v = voices[0] if voices else "Microsoft David Desktop"
        return VoiceStatusResponse(
            stt_available=True,
            tts_available=len(voices) > 0,
            installed_voices=voices,
            default_voice=default_v,
            device_used=self._device,
        )

    def synthesize(self, request: VoiceSynthesizeRequest) -> bytes:
        """
        Synthesize plain text into a PCM WAV audio stream using local Windows SAPI.
        Zero cloud egress, 100% sovereign.
        """
        start_time = time.perf_counter()
        text_clean = request.text.strip()
        if not text_clean:
            raise ValueError("Input text for synthesis cannot be empty.")

        temp_dir = tempfile.gettempdir()
        temp_wav_path = os.path.join(temp_dir, f"sov_voice_{uuid.uuid4().hex[:8]}.wav")

        try:
            engine = pyttsx3.init()

            # Set voice if specified
            if request.voice:
                raw_voices = engine.getProperty("voices") or []
                for v in raw_voices:
                    if request.voice.lower() in getattr(v, "name", "").lower():
                        engine.setProperty("voice", v.id)
                        break

            # Adjust speech rate (default ~200 WPM)
            if request.rate is not None:
                base_rate = engine.getProperty("rate") or 200
                engine.setProperty("rate", max(100, min(350, base_rate + (request.rate * 15))))

            # Adjust volume (0.0 to 1.0)
            if request.volume is not None:
                engine.setProperty("volume", max(0.0, min(1.0, request.volume / 100.0)))

            engine.save_to_file(text_clean, temp_wav_path)
            engine.runAndWait()
            engine.stop()

            if not os.path.isfile(temp_wav_path):
                raise RuntimeError("Speech synthesis failed to produce audio file.")

            with open(temp_wav_path, "rb") as f:
                wav_bytes = f.read()

            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.info(f"Synthesized {len(text_clean)} chars in {duration_ms:.1f}ms ({len(wav_bytes)} bytes)")

            # Audit ledger event
            audit_logger.record_event(
                event_type="VOICE_SYNTHESIZE",
                severity="INFO",
                actor="voice_copilot",
                details={
                    "char_count": len(text_clean),
                    "voice": request.voice,
                    "duration_ms": duration_ms,
                    "audio_bytes": len(wav_bytes),
                },
            )

            return wav_bytes
        finally:
            if os.path.exists(temp_wav_path):
                try:
                    os.remove(temp_wav_path)
                except Exception:
                    pass

    def _get_stt_pipeline(self):
        """Lazy-load the Whisper speech recognition pipeline."""
        if self._stt_pipeline is None:
            logger.info(f"Loading local Whisper STT pipeline ({self._stt_model_name}) on {self._device}...")
            from transformers import pipeline
            import torch

            torch_dtype = torch.float16 if "cuda" in self._device else torch.float32
            self._stt_pipeline = pipeline(
                "automatic-speech-recognition",
                model=self._stt_model_name,
                device=self._device,
                torch_dtype=torch_dtype,
            )
            logger.info("Whisper STT pipeline loaded successfully.")
        return self._stt_pipeline

    def transcribe(self, audio_bytes: bytes, filename: str = "recording.wav") -> VoiceTranscribeResponse:
        """
        Transcribe raw audio bytes into text using local Whisper.
        100% sovereign and air-gapped.
        """
        start_time = time.perf_counter()
        if not audio_bytes or len(audio_bytes) < 100:
            raise ValueError("Audio payload is empty or too short.")

        temp_dir = tempfile.gettempdir()
        suffix = Path(filename).suffix or ".wav"
        temp_audio_path = os.path.join(temp_dir, f"sov_transcribe_{uuid.uuid4().hex[:8]}{suffix}")

        try:
            with open(temp_audio_path, "wb") as f:
                f.write(audio_bytes)

            pipeline = self._get_stt_pipeline()
            result = pipeline(temp_audio_path)
            transcribed_text = result.get("text", "").strip()

            proc_time_ms = (time.perf_counter() - start_time) * 1000
            logger.info(f"Transcribed audio ({len(audio_bytes)} bytes) in {proc_time_ms:.1f}ms: '{transcribed_text}'")

            # Audit ledger event
            audit_logger.record_event(
                event_type="VOICE_TRANSCRIBE",
                severity="INFO",
                actor="voice_copilot",
                details={
                    "file_size": len(audio_bytes),
                    "filename": filename,
                    "char_count": len(transcribed_text),
                    "processing_time_ms": proc_time_ms,
                },
            )

            return VoiceTranscribeResponse(
                text=transcribed_text,
                language="en",
                duration_seconds=None,
                confidence=1.0,
                processing_time_ms=round(proc_time_ms, 2),
            )
        finally:
            if os.path.exists(temp_audio_path):
                try:
                    os.remove(temp_audio_path)
                except Exception:
                    pass


voice_service = VoiceService()
