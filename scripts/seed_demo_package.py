"""
Sovereign AI Workbench - Demo Package Seeder
Generates realistic industrial inspection documents and standard operating procedures,
registers them in the local persistent registry, and indexes them into ChromaDB.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
BACKEND_DIR = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

import fitz  # PyMuPDF
from app.config import get_settings
from app.services.audit_logger import audit_logger
from app.services.document_service import get_document_service
from app.services.knowledge_service import get_knowledge_service


# ─────────────────────────────────────────────────────────────────────────────
# 1. Industrial Inspection & SOP Demo Data Definitions
# ─────────────────────────────────────────────────────────────────────────────

SOP_570_CONTENT = """================================================================================
SOVEREIGN DEFENSE & ENERGY REFINING CORPORATION
STANDARD OPERATING PROCEDURE: SOP-REF-570 (REV 4.2)
TITLE: Process Piping Minimum Wall Thickness, Retirement Limits & Shutdown Criteria
CLASSIFICATION: CONFIDENTIAL / INDUSTRIAL DEFENSE CRITICAL
================================================================================

1. SCOPE & PURPOSE
This mandatory specification establishes the minimum allowable wall thickness,
calculated retirement limits, and immediate shutdown criteria for high-pressure,
high-temperature hydrocarbon transfer lines operating in Refinery Units 1 through 6.

2. ASSET CLASSIFICATION & NOMINAL SPECIFICATIONS
2.1. Hydrocracker Line 102 (Asset Tag: HC-L102-CS)
- Material: ASTM A106 Grade B Seamless Carbon Steel
- Nominal Pipe Size (NPS): 8-inch Schedule 40
- Nominal Original Wall Thickness: 8.18 mm (0.322 in)
- Design Pressure: 600 psig @ 700 deg F
- Normal Operating Pressure: 450 psig @ 650 deg F
- Operating Medium: Heavy Atmospheric Gas Oil / Hydrogen Mixture

3. RETIREMENT CRITERIA & RETIREMENT THICKNESS THRESHOLDS (SECTION 3.4)
3.1. Under ASME B31.3 and Section 3.4 of this standard:
     - Minimum Allowable Thickness (t_min / Retirement Limit): 2.50 mm (0.098 in)
     - Warning Threshold (t_warn): 3.20 mm (0.126 in)
     - Safe Operational Band: 4.50 mm to 8.18 mm
3.2. Mandatory Action Rule 3.4.B:
     "Any piping component, spool, or fitting exhibiting a measured ultrasonic
     wall thickness LESS THAN 2.50 mm represents a Critical Safety Hazard. The
     Chief Plant Engineer MUST issue an immediate operational halt and order
     emergency spool replacement prior to restart."

4. FLANGE BOLT TORQUE & CONNECTION INTEGRITY (SECTION 4.1)
4.1. Class 300 Raised Face Carbon Steel Flanges:
     - Minimum Torque: 135 ft-lbs (183 N*m)
     - Maximum Torque: 160 ft-lbs (217 N*m)
     - Target Assembly Torque: 150 ft-lbs (203 N*m)
4.2. Torque readings outside this band must be immediately re-torqued under cold depressurized conditions.

5. INSPECTION FREQUENCY
Components operating within the warning band (2.50 mm to 3.20 mm) must undergo
ultrasonic thickness inspection every 30 operating days.
"""

INSPECTION_REPORT_TEXT = """SOVEREIGN ENERGY & PETROCHEMICAL FACILITY
NON-DESTRUCTIVE TESTING (NDT) FIELD INSPECTION REPORT
Report ID: NDT-2026-HC102-08 | Date: 2026-08-28 | Unit: Hydrocracker Unit 4
Inspected Asset: Transfer Line 102 (HC-L102-CS) | Inspector: M. Vance (Level III NDT)

EXECUTIVE INSPECTION SUMMARY:
Ultrasonic thickness (UT) and flange torque inspection conducted on Process Line 102
during scheduled turnaround inspection window. System operated at 450 psig, 650 deg F.

MEASUREMENT LOG & COMPONENT READINGS:
--------------------------------------------------------------------------------
Station ID   Component Description            Measured UT (mm)   Status
--------------------------------------------------------------------------------
STN-01       Line 102 Straight Run (Spool A)  8.12 mm            Nominal / Normal
STN-02       Inlet Flange Weld Neck           7.85 mm            Normal Wear
STN-03       Elbow E-14 Intrados (High Wear)  2.18 mm            CRITICAL THINNING
STN-04       Flange Joint FL-102-B Bolt Torque 145 ft-lbs         Within Spec
STN-05       Discharge Reducer Spool          6.75 mm            Acceptable
--------------------------------------------------------------------------------

FIELD OBSERVATIONS & METALLURGICAL NOTES:
1. Significant localized turbulent erosion-corrosion detected at Elbow E-14.
   Wall thickness has deteriorated to 2.18 mm, well below nominal 8.18 mm.
2. Flange bolts exhibited proper tension (145 ft-lbs), showing no joint degradation.
3. Severe thinning requires cross-referencing with Refinery SOP-REF-570 for compliance.

CONCLUSION:
Elbow E-14 requires formal engineering compliance audit and management review.
"""


def generate_demo_pdf(target_path: Path) -> Path:
    """Generate a clean, professional PDF inspection document using PyMuPDF."""
    target_path.parent.mkdir(parents=True, exist_ok=True)
    doc = fitz.open()
    page = doc.new_page(width=612, height=792)  # Standard Letter size

    # Header Bar
    page.draw_rect(fitz.Rect(36, 36, 576, 75), color=(0.12, 0.16, 0.23), fill=(0.12, 0.16, 0.23))
    page.insert_text(
        fitz.Point(48, 62),
        "SOVEREIGN AI WORKBENCH - NDT FIELD INSPECTION REPORT",
        fontsize=13,
        color=(1, 1, 1),
    )

    # Document Metadata Block
    y = 100
    page.draw_rect(fitz.Rect(36, y, 576, y + 40), color=(0.85, 0.88, 0.92), fill=(0.95, 0.96, 0.98))
    page.insert_text(fitz.Point(46, y + 16), "Report No: NDT-2026-HC102-08", fontsize=10, fontname="helv", color=(0.2, 0.2, 0.2))
    page.insert_text(fitz.Point(46, y + 30), "Asset: Line 102 Hydrocracker Transfer Spool", fontsize=10, fontname="helv", color=(0.2, 0.2, 0.2))
    page.insert_text(fitz.Point(340, y + 16), "Inspection Date: 2026-08-28", fontsize=10, fontname="helv", color=(0.2, 0.2, 0.2))
    page.insert_text(fitz.Point(340, y + 30), "Lead Inspector: Marcus Vance (Level III NDT)", fontsize=10, fontname="helv", color=(0.2, 0.2, 0.2))

    # Executive Summary Header
    y = 165
    page.insert_text(fitz.Point(36, y), "1. EXECUTIVE INSPECTION SUMMARY", fontsize=11, fontname="helv", color=(0.1, 0.2, 0.4))
    y += 16
    summary_text = (
        "Comprehensive ultrasonic thickness (UT) and mechanical integrity survey conducted on Process Line 102 "
        "(Hydrocracker Unit 4). The line operates under continuous service at 450 psig and 650 deg F transferring "
        "heavy sour gas oil. A calibrated dual-element transducer was used for cross-sectional thickness mapping."
    )
    page.insert_textbox(fitz.Rect(36, y, 576, y + 45), summary_text, fontsize=9.5, fontname="helv")

    # Table of Readings
    y = 235
    page.insert_text(fitz.Point(36, y), "2. ULTRASONIC WALL THICKNESS READINGS & OBSERVATIONS", fontsize=11, fontname="helv", color=(0.1, 0.2, 0.4))
    y += 12
    page.draw_rect(fitz.Rect(36, y, 576, y + 22), color=(0.2, 0.25, 0.35), fill=(0.2, 0.25, 0.35))
    page.insert_text(fitz.Point(42, y + 15), "Station ID", fontsize=9, fontname="helv", color=(1, 1, 1))
    page.insert_text(fitz.Point(120, y + 15), "Component Description", fontsize=9, fontname="helv", color=(1, 1, 1))
    page.insert_text(fitz.Point(360, y + 15), "Measured Value", fontsize=9, fontname="helv", color=(1, 1, 1))
    page.insert_text(fitz.Point(470, y + 15), "Condition / Flag", fontsize=9, fontname="helv", color=(1, 1, 1))

    table_rows = [
        ("STN-01", "Line 102 Straight Run (Spool A)", "8.12 mm", "Nominal (Original: 8.18 mm)"),
        ("STN-02", "Inlet Flange Weld Neck", "7.85 mm", "Normal Operational Wear"),
        ("STN-03", "Elbow E-14 Intrados (High Wear)", "2.18 mm", "CRITICAL THINNING DETECTED"),
        ("STN-04", "Flange Joint FL-102-B Bolt Torque", "145 ft-lbs", "Within Assembly Specs"),
        ("STN-05", "Discharge Reducer Spool", "6.75 mm", "Acceptable Service Wear"),
    ]

    for idx, (stn, comp, val, cond) in enumerate(table_rows):
        row_y = y + 22 + (idx * 22)
        bg_color = (1.0, 0.92, 0.92) if "CRITICAL" in cond else (0.97, 0.98, 0.99) if idx % 2 == 0 else (1.0, 1.0, 1.0)
        page.draw_rect(fitz.Rect(36, row_y, 576, row_y + 22), color=(0.85, 0.88, 0.92), fill=bg_color)
        text_color = (0.8, 0.1, 0.1) if "CRITICAL" in cond else (0.1, 0.1, 0.1)
        page.insert_text(fitz.Point(42, row_y + 15), stn, fontsize=8.5, fontname="helv", color=text_color)
        page.insert_text(fitz.Point(120, row_y + 15), comp, fontsize=8.5, fontname="helv", color=text_color)
        page.insert_text(fitz.Point(360, row_y + 15), val, fontsize=8.5, fontname="helv", color=text_color)
        page.insert_text(fitz.Point(470, row_y + 15), cond, fontsize=8.5, fontname="helv", color=text_color)

    # Technical Notes & Recommendations
    y = 385
    page.insert_text(fitz.Point(36, y), "3. METALLURGICAL ASSESSMENT & COMPLIANCE DIRECTIVE", fontsize=11, fontname="helv", color=(0.1, 0.2, 0.4))
    y += 16
    notes_text = (
        "WARNING: Station STN-03 (Elbow E-14) demonstrates accelerated localized wall loss attributed to high-velocity "
        "two-phase flow impingement. The active wall thickness of 2.18 mm MUST be cross-referenced against refinery "
        "standard SOP-REF-570 minimum retirement thickness (Section 3.4). If below retirement limits, mandatory plant "
        "shutdown and emergency spool fabrication must be initiated under Engineering Authority."
    )
    page.insert_textbox(fitz.Rect(36, y, 576, y + 70), notes_text, fontsize=9.5, fontname="helv")

    # Sign-off footer
    y = 680
    page.draw_line(fitz.Point(36, y), fitz.Point(576, y), color=(0.7, 0.7, 0.7))
    page.insert_text(fitz.Point(40, y + 20), "Inspector Signature: Marcus Vance, NDT III", fontsize=9, fontname="helv", color=(0.3, 0.3, 0.3))
    page.insert_text(fitz.Point(380, y + 20), "Facility Integrity Authority: Sovereign Energy", fontsize=9, fontname="helv", color=(0.3, 0.3, 0.3))

    doc.save(str(target_path))
    doc.close()
    return target_path


async def seed_demo_package() -> dict:
    """Execute complete end-to-end demo seeding."""
    settings = get_settings()
    demo_dir = Path(settings.DATA_DIR) / "demo_package"
    demo_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 65)
    print("SOVEREIGN AI WORKBENCH - INDUSTRIAL DEMO PACKAGE SEEDER")
    print("=" * 65)

    # 1. Generate Demo PDF Inspection Report
    pdf_path = demo_dir / "Refinery_Line102_Thickness_Inspection_Report.pdf"
    generate_demo_pdf(pdf_path)
    print(f"\n[1/4] Generated Realistic Industrial PDF Report:\n      -> {pdf_path}")

    # 2. Register Document in Document Registry
    doc_service = get_document_service()
    with open(pdf_path, "rb") as f:
        file_bytes = f.read()

    doc_meta = await doc_service.save_document_bytes(
        filename=pdf_path.name,
        content=file_bytes,
    )

    print(f"\n[2/4] Document Registered in Sovereign Registry:\n      ID: {doc_meta.id}\n      File: {doc_meta.filename}")

    # 3. Ingest SOP-REF-570 into ChromaDB Vector Store
    print("\n[3/4] Ingesting SOP-REF-570 into ChromaDB Knowledge Base...")
    knowledge_service = get_knowledge_service()
    ingest_result = await knowledge_service.ingest_text(
        title="SOP-REF-570_Pipe_Wall_Thickness_Retirement_Thresholds.txt",
        content=SOP_570_CONTENT,
        metadata={

            "standard_code": "SOP-REF-570",
            "revision": "4.2",
            "classification": "CONFIDENTIAL_INDUSTRIAL",
            "section": "3.4",
            "topic": "minimum_wall_thickness_and_retirement",
        },
    )
    print(f"      Ingested Document ID: {ingest_result.document_id}")
    print(f"      Total Dense Chunks Indexed: {ingest_result.total_chunks}")

    # 4. Log to Cryptographic SHA-256 Audit Ledger
    audit_logger.record_event(
        event_type="DEMO_PACKAGE_SEEDED",
        severity="INFO",
        actor="system_demo_seeder",
        details={
            "document_id": doc_meta.id,
            "document_name": doc_meta.filename,
            "sop_document_id": ingest_result.document_id,
            "sop_chunks": ingest_result.total_chunks,
            "status": "ready_for_presentation",
        },
    )
    print("\n[4/4] Cryptographic Audit Event Recorded in SHA-256 Hash Chain [OK]")

    print("\n" + "=" * 65)
    print("DEMO PACKAGE SEEDING COMPLETED SUCCESSFULLY!")
    print(f"Active Document ID for Demo: {doc_meta.id}")
    print("=" * 65)


    return {
        "status": "success",
        "document_id": doc_meta.id,
        "document_name": doc_meta.filename,
        "sop_document_id": ingest_result.document_id,
        "sop_chunks": ingest_result.total_chunks,
    }


if __name__ == "__main__":
    asyncio.run(seed_demo_package())

