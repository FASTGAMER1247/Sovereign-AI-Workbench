import os
import sys
from functools import lru_cache
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


def _get_default_data_dir() -> str:
    """Determine writable data directory: SOVEREIGN_DATA_DIR env var -> LocalAppData (if frozen) -> data."""
    if "SOVEREIGN_DATA_DIR" in os.environ and os.environ["SOVEREIGN_DATA_DIR"].strip():
        return os.environ["SOVEREIGN_DATA_DIR"].strip()

    if getattr(sys, "frozen", False):
        local_app_data = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA") or str(Path.home())
        return str(Path(local_app_data) / "SovereignAIWorkbench" / "data")

    return "data"


class Settings(BaseSettings):
    """Application settings loaded from environment or .env file."""
    APP_NAME: str = "Sovereign AI Workbench Backend"
    ENVIRONMENT: str = "development"
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    CORS_ORIGINS: str = (
        "http://localhost:5173,"
        "http://127.0.0.1:5173,"
        "http://tauri.localhost,"
        "https://tauri.localhost,"
        "tauri://localhost"
    )

    # Ollama inference configuration
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    DEFAULT_MODEL: str = "qwen2.5-coder:1.5b"
    OLLAMA_TIMEOUT_SECONDS: float = 300.0

    # Document management configuration
    MAX_UPLOAD_SIZE_MB: int = 50

    # Data storage directory hierarchy
    DATA_DIR: str = _get_default_data_dir()
    DOCUMENTS_DIR: str = "data/documents"
    ARTIFACTS_DIR: str = "data/artifacts"
    SANDBOX_DIR: str = "data/sandbox_runs"
    CODING_RUNS_DIR: str = "data/coding_runs"
    AUDIT_DIR: str = "data/audit"
    AUDIT_LEDGER_PATH: str = "data/audit/audit_ledger.jsonl"

    # Knowledge Base & Local Vector Store configuration
    KNOWLEDGE_BASE_DIR: str = "data/knowledge_base"
    CHROMA_PERSIST_DIR: str = "data/knowledge_base/chroma"
    EMBEDDING_PROVIDER: str = "ollama"
    EMBEDDING_MODEL: str = "nomic-embed-text"
    CHUNK_SIZE: int = 600
    CHUNK_OVERLAP: int = 120

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def model_post_init(self, __context) -> None:
        """Sync derived storage paths to DATA_DIR."""
        base = Path(self.DATA_DIR)
        self.DOCUMENTS_DIR = str(base / "documents")
        self.ARTIFACTS_DIR = str(base / "artifacts")
        self.SANDBOX_DIR = str(base / "sandbox_runs")
        self.CODING_RUNS_DIR = str(base / "coding_runs")
        self.AUDIT_DIR = str(base / "audit")
        self.AUDIT_LEDGER_PATH = str(base / "audit" / "audit_ledger.jsonl")
        self.KNOWLEDGE_BASE_DIR = str(base / "knowledge_base")
        self.CHROMA_PERSIST_DIR = str(base / "knowledge_base" / "chroma")

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
