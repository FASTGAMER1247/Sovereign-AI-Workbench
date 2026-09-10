import datetime
import hashlib
import logging
import os
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

from app.config import settings
from app.models.schemas import ImageGenerateRequest, ImageGenerateResponse, ImageStatusResponse

logger = logging.getLogger("app.services.image_service")


class ImageService:
    """
    Local GPU-accelerated text-to-image synthesis service using SD-Turbo via Diffusers.
    Runs strictly sovereign and air-gapped on local NVIDIA GPU (or CPU fallback).
    """

    def __init__(self, artifacts_dir: Optional[str] = None):
        self.artifacts_dir = Path(artifacts_dir or (Path(settings.DATA_DIR) / "artifacts" / "images"))
        self.artifacts_dir.mkdir(parents=True, exist_ok=True)
        self.model_name = "stabilityai/sd-turbo"
        self._pipe = None
        self._lock = threading.Lock()
        self._device = "cuda"
        self._diffusers_available = False
        self._init_check()

    def _init_check(self):
        try:
            import torch
            import diffusers
            self._device = "cuda" if torch.cuda.is_available() else "cpu"
            self._diffusers_available = True
            logger.info(f"ImageService initialized. Device: {self._device}, diffusers: {diffusers.__version__}")
        except Exception as err:
            logger.warning(f"Diffusers or PyTorch not fully initialized: {err}")
            self._diffusers_available = False

    def _ensure_pipeline(self):
        """Lazy-load the SD-Turbo pipeline in FP16 with attention slicing."""
        if self._pipe is not None:
            return self._pipe

        with self._lock:
            if self._pipe is not None:
                return self._pipe

            if not self._diffusers_available:
                raise RuntimeError("Image generation dependencies (torch / diffusers) are not available.")

            import torch
            from diffusers import AutoPipelineForText2Image

            logger.info(f"Loading {self.model_name} onto {self._device}...")
            dtype = torch.float16 if self._device == "cuda" else torch.float32
            variant = "fp16" if self._device == "cuda" else None

            pipe = AutoPipelineForText2Image.from_pretrained(
                self.model_name,
                torch_dtype=dtype,
                variant=variant
            )
            pipe.to(self._device)

            if self._device == "cuda":
                # Enable attention slicing to keep peak VRAM under 2.5 GB
                pipe.enable_attention_slicing()

            self._pipe = pipe
            logger.info(f"Successfully loaded {self.model_name} onto {self._device}.")
            return self._pipe

    def get_status(self) -> ImageStatusResponse:
        vram_mb = None
        if self._device == "cuda":
            try:
                import torch
                if torch.cuda.is_available():
                    vram_mb = round(torch.cuda.memory_allocated() / (1024 ** 2), 1)
            except Exception:
                pass

        return ImageStatusResponse(
            is_available=self._diffusers_available,
            is_loaded=self._pipe is not None,
            model_name=self.model_name,
            device=self._device,
            vram_allocated_mb=vram_mb
        )

    def generate_image(self, request: ImageGenerateRequest) -> ImageGenerateResponse:
        """
        Generate an image from text prompt using local SD-Turbo.
        """
        pipe = self._ensure_pipeline()
        import torch

        image_id = f"img_{uuid.uuid4().hex[:12]}"
        filename = f"{image_id}.png"
        file_path = self.artifacts_dir / filename

        generator = None
        if request.seed is not None:
            generator = torch.Generator(device=self._device).manual_seed(request.seed)

        start_time = time.time()
        with torch.inference_mode():
            result = pipe(
                prompt=request.prompt,
                num_inference_steps=request.num_inference_steps or 1,
                guidance_scale=request.guidance_scale or 0.0,
                width=request.width or 512,
                height=request.height or 512,
                generator=generator
            )

        duration_ms = round((time.time() - start_time) * 1000, 2)
        generated_image = result.images[0]
        generated_image.save(str(file_path), format="PNG")

        # Compute SHA256 of generated artifact
        with open(file_path, "rb") as f:
            file_hash = hashlib.sha256(f.read()).hexdigest()

        # Audit ledger logging
        try:
            from app.services.audit_logger import audit_logger
            audit_logger.record_event(
                event_type="IMAGE_GENERATE",
                severity="INFO",
                actor="system_operator",
                details={
                    "image_id": image_id,
                    "filename": filename,
                    "prompt": request.prompt,
                    "width": request.width or 512,
                    "height": request.height or 512,
                    "steps": request.num_inference_steps or 1,
                    "device": self._device,
                    "duration_ms": duration_ms,
                    "sha256": file_hash,
                }
            )
        except Exception as err:
            logger.debug(f"Audit log emission skipped: {err}")

        return ImageGenerateResponse(
            id=image_id,
            filename=filename,
            prompt=request.prompt,
            width=request.width or 512,
            height=request.height or 512,
            steps=request.num_inference_steps or 1,
            generation_time_ms=duration_ms,
            device_used=self._device,
            file_url=f"/api/images/{image_id}/download",
            created_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            model_name=self.model_name
        )

    def get_image_path(self, image_id: str) -> Optional[Path]:
        """Find the image path on disk for an image ID or filename."""
        clean_id = Path(image_id).stem
        target = self.artifacts_dir / f"{clean_id}.png"
        if target.exists():
            return target
        # Fallback check
        target_direct = self.artifacts_dir / image_id
        if target_direct.exists():
            return target_direct
        return None


# Global singleton instance
image_service = ImageService()
