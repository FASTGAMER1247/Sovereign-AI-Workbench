import sys
from pathlib import Path
from fastapi.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import create_app

app = create_app()
client = TestClient(app)


def test_hardware_profile_endpoint():
    """Verify GET /api/system/hardware-profile returns valid hardware specifications."""
    res = client.get("/api/system/hardware-profile")
    assert res.status_code == 200, f"Hardware profile failed: {res.text}"
    data = res.json()

    assert "total_ram_gb" in data
    assert data["total_ram_gb"] > 0
    assert "cpu_cores" in data
    assert data["cpu_cores"] >= 1
    assert "recommended_tier" in data
    assert "recommended_models" in data
    assert len(data["recommended_models"]) >= 2
    assert "missing_models" in data
    assert "all_optimal_installed" in data
    print(f"Detected Tier: {data['recommended_tier']}, RAM: {data['total_ram_gb']}GB, Cores: {data['cpu_cores']}")


def test_auto_optimize_models_endpoint_dry_run():
    """Verify POST /api/system/auto-optimize-models accepts payload and returns updated profile."""
    res = client.post("/api/system/auto-optimize-models", json={"models": []})
    assert res.status_code == 200, f"Auto-optimize failed: {res.text}"
    data = res.json()

    assert data["status"] == "completed"
    assert data["installed"] == []
    assert "hardware_profile" in data
    assert data["hardware_profile"]["total_ram_gb"] > 0
