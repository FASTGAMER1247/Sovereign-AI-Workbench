import logging
import os
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from docx import Document
from app.models.schemas import ApprovalNoteContent, GroundedCitation
from app.services.docx_service import get_docx_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("test_docx")


def run_docx_tests():
    print("=" * 60)
    print("SOVEREIGN AI WORKBENCH - DOCX SERVICE TEST")
    print("=" * 60)

    docx_svc = get_docx_service()

    citations = [
        GroundedCitation(
            document_id="doc_sop_102",
            document_name="SOP-REF-570_Piping_Integrity.txt",
            page_number=1,
            chunk_index=2,
            similarity_score=0.875,
            excerpt="Section 2.2: Measured wall thickness less than 2.50 mm mandates immediate line depressurization and emergency spool replacement within 48 hours.",
        ),
        GroundedCitation(
            document_id="doc_sop_102",
            document_name="SOP-REF-570_Piping_Integrity.txt",
            page_number=1,
            chunk_index=1,
            similarity_score=0.742,
            excerpt="Section 2.1: Nominal wall thickness is 6.02 mm (4-inch Line 102). Minimum design allowable thickness is 3.20 mm.",
        ),
    ]

    content = ApprovalNoteContent(
        title="SOVEREIGN INDUSTRIAL COMPLIANCE APPROVAL NOTE",
        reference_id="SOV-APR-TEST-001",
        date="2026-08-26",
        plant_area="Area 4 - Fluid Catalytic Cracking Unit (FCCU)",
        equipment_id="Line 102 - Carbon Steel Spool A",
        inspector_name="Industrial NDT Ultrasonic Team",
        approver_name="Chief Plant Engineer",
        executive_summary="Ultrasonic NDT inspection of Carbon Steel Spool A (Line 102) revealed severe localized wall thinning down to 2.15 mm at Point A, violating governing safety standard SOP-REF-570.",
        inspection_findings="Measured minimum wall thickness at Point A: 2.15 mm (Nominal: 6.02 mm, Allowable t_min: 3.20 mm, Critical t_retire: 2.50 mm). Active internal localized corrosion observed.",
        sop_evaluations=citations,
        risk_severity="CRITICAL",
        mandatory_actions="1. Execute immediate emergency line depressurization and isolation within 4 hours.\n2. Procure ASTM A106 Grade B replacement spool.\n3. Complete spool replacement within 48 hours prior to recommissioning.",
        compliance_verdict="NON-COMPLIANT - MANDATORY IMMEDIATE SPOOL REPLACEMENT",
        reviewer_notes="Findings and ultrasonic readings independently cross-checked against refinery NDT logbook. Approved for immediate maintenance outage execution.",
    )

    print("\n[STEP 1] Generating Formatted DOCX Approval Note...")
    res = docx_svc.generate_approval_note(
        execution_id="wf_test_123456",
        content=content,
        filename_prefix="Line102_Inspection",
    )

    file_path = res["path"]
    filename = res["filename"]
    size_bytes = res["size_bytes"]

    print(f"Generated File: {filename}")
    print(f"File Path: {file_path}")
    print(f"Size: {size_bytes} bytes")

    assert os.path.exists(file_path), f"File {file_path} does not exist!"
    assert size_bytes > 5000, f"File size ({size_bytes}) is suspiciously small!"
    print("STEP 1 PASSED: File generated and size verified!")

    print("\n[STEP 2] Verifying DOCX Structure and Readability...")
    doc = Document(file_path)
    text_corpus = "\n".join([p.text for p in doc.paragraphs])
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                text_corpus += " " + cell.text

    assert "SOVEREIGN INDUSTRIAL COMPLIANCE APPROVAL NOTE" in text_corpus
    assert "Line 102 - Carbon Steel Spool A" in text_corpus
    assert "SOP-REF-570_Piping_Integrity.txt" in text_corpus
    assert "CRITICAL" in text_corpus
    assert "APPROVED FOR EXECUTION" in text_corpus
    assert "Chief Plant Engineer" in text_corpus

    print("STEP 2 PASSED: All document sections, citations, tables, and signature blocks validated!")

    print("\n" + "=" * 60)
    print("ALL DOCX SERVICE TESTS PASSED!")
    print("=" * 60)


if __name__ == "__main__":
    run_docx_tests()
