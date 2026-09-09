import os
import sys
import json
import logging
import platform
import subprocess
from typing import Tuple, List, Dict, Any, Optional

from app.models.schemas import HardwareProfileResponse, ModelRecommendation

logger = logging.getLogger(__name__)


class HardwareService:
    """
    Inspects host hardware specifications (RAM, CPU, GPU, VRAM)
    and computes optimal local AI model recommendations for Ollama.
    """

    @staticmethod
    def get_memory_info() -> Tuple[float, float]:
        """Return (total_ram_gb, free_ram_gb) using native OS APIs."""
        if sys.platform == "win32":
            try:
                import ctypes
                class MEMORYSTATUSEX(ctypes.Structure):
                    _fields_ = [
                        ("dwLength", ctypes.c_ulong),
                        ("dwMemoryLoad", ctypes.c_ulong),
                        ("ullTotalPhys", ctypes.c_ulonglong),
                        ("ullAvailPhys", ctypes.c_ulonglong),
                        ("ullTotalPageFile", ctypes.c_ulonglong),
                        ("ullAvailPageFile", ctypes.c_ulonglong),
                        ("ullTotalVirtual", ctypes.c_ulonglong),
                        ("ullAvailVirtual", ctypes.c_ulonglong),
                        ("sullAvailExtendedVirtual", ctypes.c_ulonglong),
                    ]
                mem = MEMORYSTATUSEX()
                mem.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
                ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(mem))
                return round(mem.ullTotalPhys / (1024**3), 1), round(mem.ullAvailPhys / (1024**3), 1)
            except Exception as e:
                logger.warning(f"Error querying Windows memory via ctypes: {e}")

        # Cross-platform fallback
        try:
            if hasattr(os, "sysconf"):
                pages = os.sysconf("SC_PHYS_PAGES")
                page_size = os.sysconf("SC_PAGE_SIZE")
                total_gb = round((pages * page_size) / (1024**3), 1)
                return total_gb, round(total_gb * 0.4, 1)
        except Exception:
            pass

        return 8.0, 4.0

    @staticmethod
    def get_gpu_info() -> Tuple[str, float]:
        """Detect GPU name and VRAM in GB."""
        if sys.platform == "win32":
            try:
                cmd = [
                    "powershell",
                    "-NoProfile",
                    "-Command",
                    "Get-CimInstance Win32_VideoController | Select-Object -Property Name, AdapterRAM | ConvertTo-Json"
                ]
                res = subprocess.run(cmd, capture_output=True, text=True, timeout=2.0)
                if res.returncode == 0 and res.stdout.strip():
                    data = json.loads(res.stdout)
                    if isinstance(data, list):
                        data = data[0]
                    name = data.get("Name", "Standard GPU")
                    vram_bytes = data.get("AdapterRAM", 0) or 0
                    vram_gb = round(vram_bytes / (1024**3), 1)
                    return name, vram_gb
            except Exception as e:
                logger.debug(f"Error checking Windows GPU: {e}")

        return "Generic Graphics Adapter", 0.0

    async def get_hardware_profile(self, available_models: Optional[List[str]] = None) -> HardwareProfileResponse:
        """Inspect hardware and calculate recommended models for Ollama."""
        if available_models is None:
            available_models = []

        total_ram, free_ram = self.get_memory_info()
        cpu_cores = os.cpu_count() or 4
        proc_name = platform.processor() or platform.machine()
        gpu_name, gpu_vram = self.get_gpu_info()

        # Compute optimal tier based on RAM and GPU VRAM
        if total_ram >= 28.0 or gpu_vram >= 10.0:
            tier_name = "Tier 3 (Enterprise Rig)"
            tier_desc = f"High-capacity system ({total_ram} GB RAM, {gpu_vram} GB VRAM). Optimal for 14B models and multimodal vision."
            model_specs = [
                ("qwen2.5-coder:14b", "Primary Chat & Autonomous Coding Agent", "Highest reasoning depth & code synthesis for 32GB+ systems"),
                ("nomic-embed-text", "RAG Dense Vector Embeddings", "Optimal 768-dimensional semantic embeddings for local SOP search"),
                ("deepseek-r1:8b", "Deep Multi-hop Reasoning & Audit Verification", "Advanced chain-of-thought verification for high-spec workstations"),
                ("llama3.2-vision:11b", "Multimodal Document Vision & Image OCR", "Hardware supports direct visual OCR and diagram parsing"),
            ]
        elif total_ram >= 12.0 or gpu_vram >= 4.0:
            tier_name = "Tier 2 (Pro Workstation)"
            tier_desc = f"Professional workstation ({total_ram} GB RAM, {gpu_vram} GB VRAM). Optimal for 7B models with high-speed execution."
            model_specs = [
                ("qwen2.5-coder:7b", "Primary Chat, Coding & Compliance Audit", "Peak accuracy-to-speed ratio for 16GB workstations"),
                ("nomic-embed-text", "RAG Dense Vector Embeddings", "Optimal 768-dimensional semantic embeddings for local SOP search"),
                ("deepseek-r1:1.5b", "Fast Chain-of-Thought Reasoning", "Lightweight mathematical and logical consistency auditing"),
                ("llama3.2:3b", "Executive Report Generation", "High-speed document summarization and note generation"),
            ]
        else:
            tier_name = "Tier 1 (Light / Air-Gap Standard)"
            tier_desc = f"Lightweight / Standard laptop ({total_ram} GB RAM). Tuned for instant execution with low memory footprint."
            model_specs = [
                ("qwen2.5-coder:1.5b", "Primary Chat, Coding & Compliance Audit", "Instant sub-second inference with ultra-low 980MB RAM footprint"),
                ("nomic-embed-text", "RAG Dense Vector Embeddings", "Optimal 768-dimensional semantic embeddings for local SOP search"),
                ("deepseek-r1:1.5b", "Fast Multi-hop Reasoning", "Compact mathematical and logical audit verification"),
            ]

        # Match against installed models
        recommended_models: List[ModelRecommendation] = []
        missing_models: List[str] = []

        for name, role, reason in model_specs:
            installed = any(name in m or m.startswith(name.split(":")[0]) for m in available_models)
            recommended_models.append(
                ModelRecommendation(
                    name=name,
                    role=role,
                    reason=reason,
                    is_installed=installed,
                )
            )
            if not installed:
                missing_models.append(name)

        return HardwareProfileResponse(
            total_ram_gb=total_ram,
            free_ram_gb=free_ram,
            cpu_cores=cpu_cores,
            processor_name=proc_name,
            gpu_name=gpu_name,
            gpu_vram_gb=gpu_vram,
            recommended_tier=tier_name,
            tier_description=tier_desc,
            recommended_models=recommended_models,
            missing_models=missing_models,
            all_optimal_installed=len(missing_models) == 0,
        )


_hardware_service: Optional[HardwareService] = None


def get_hardware_service() -> HardwareService:
    global _hardware_service
    if _hardware_service is None:
        _hardware_service = HardwareService()
    return _hardware_service
