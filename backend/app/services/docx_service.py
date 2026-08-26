import datetime
import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

from docx import Document
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from docx.shared import Inches, Pt, RGBColor

from app.config import settings
from app.models.schemas import ApprovalNoteContent, GroundedCitation

logger = logging.getLogger("app.services.docx_service")


class DocxService:
    """
    Sovereign DOCX Document Generator for Industrial Compliance & Approval Notes.
    Produces strictly air-gapped, professional, formatted .docx artifacts.
    """

    def __init__(self, artifacts_dir: Optional[str] = None):
        self.artifacts_dir = Path(artifacts_dir or (Path(settings.DATA_DIR) / "artifacts"))
        self.artifacts_dir.mkdir(parents=True, exist_ok=True)

    def _set_cell_background(self, cell, hex_color: str):
        """Set background shading color of a table cell."""
        shading_xml = f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>'
        cell._tc.get_or_add_tcPr().append(parse_xml(shading_xml))

    def _set_cell_margins(self, cell, top=100, bottom=100, left=150, right=150):
        """Set cell padding in twips (1/20 of a pt)."""
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = OxmlElement('w:tcMar')
        for margin, val in (('top', top), ('bottom', bottom), ('left', left), ('right', right)):
            node = OxmlElement(f'w:{margin}')
            node.set(qn('w:w'), str(val))
            node.set(qn('w:type'), 'dxa')
            tcMar.append(node)
        tcPr.append(tcMar)

    def generate_approval_note(
        self,
        execution_id: str,
        content: ApprovalNoteContent,
        filename_prefix: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate a complete, structured industrial approval note (.docx).
        """
        doc = Document()

        # Set standard margins (1 inch)
        for section in doc.sections:
            section.top_margin = Inches(0.8)
            section.bottom_margin = Inches(0.8)
            section.left_margin = Inches(0.9)
            section.right_margin = Inches(0.9)

        # Palette colors
        NAVY = RGBColor(15, 23, 42)       # #0f172a
        STEEL_BLUE = RGBColor(30, 58, 138) # #1e3a8a
        ALERT_RED = RGBColor(185, 28, 28)  # #b91c1c
        SUCCESS_GREEN = RGBColor(21, 128, 61) # #15803d
        MUTED_GRAY = RGBColor(100, 116, 139) # #64748b

        # ── 1. Top Sovereign Confidentiality Header ──
        header_para = doc.add_paragraph()
        header_para.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        h_run = header_para.add_run("RESTRICTED — INTERNAL ON-PREMISE COMPLIANCE NOTE")
        h_run.font.size = Pt(8.5)
        h_run.font.bold = True
        h_run.font.color.rgb = MUTED_GRAY

        # ── 2. Document Title ──
        title_para = doc.add_paragraph()
        title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        t_run = title_para.add_run(content.title.upper())
        t_run.font.size = Pt(16)
        t_run.font.bold = True
        t_run.font.color.rgb = STEEL_BLUE

        sub_para = doc.add_paragraph()
        sub_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        sub_run = sub_para.add_run(f"Sovereign AI Automated Compliance Audit & Human Sign-Off Note")
        sub_run.font.size = Pt(10)
        sub_run.font.italic = True
        sub_run.font.color.rgb = MUTED_GRAY

        doc.add_paragraph().paragraph_format.space_after = Pt(4)

        # ── 3. Metadata Key-Value Table ──
        meta_table = doc.add_table(rows=4, cols=2)
        meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        meta_table.autofit = False

        meta_data = [
            ("Reference ID:", content.reference_id, "Date of Audit:", content.date),
            ("Plant / Facility Unit:", content.plant_area, "Inspected Equipment Tag:", content.equipment_id),
            ("NDT Inspection Team:", content.inspector_name, "Designated Approver:", content.approver_name),
            ("Compliance Verdict:", content.compliance_verdict, "Risk Severity Level:", content.risk_severity),
        ]

        for row_idx, (k1, v1, k2, v2) in enumerate(meta_data):
            row = meta_table.rows[row_idx]
            # Col 1
            cell_1 = row.cells[0]
            p1 = cell_1.paragraphs[0]
            r_k1 = p1.add_run(f"{k1} ")
            r_k1.bold = True
            r_k1.font.size = Pt(9.5)
            r_v1 = p1.add_run(v1)
            r_v1.font.size = Pt(9.5)
            if "NON-COMPLIANT" in v1:
                r_v1.font.bold = True
                r_v1.font.color.rgb = ALERT_RED
            self._set_cell_background(cell_1, "f8fafc" if row_idx % 2 == 0 else "ffffff")
            self._set_cell_margins(cell_1, 60, 60, 100, 100)

            # Col 2
            cell_2 = row.cells[1]
            p2 = cell_2.paragraphs[0]
            r_k2 = p2.add_run(f"{k2} ")
            r_k2.bold = True
            r_k2.font.size = Pt(9.5)
            r_v2 = p2.add_run(v2)
            r_v2.font.size = Pt(9.5)
            if v2 == "CRITICAL":
                r_v2.font.bold = True
                r_v2.font.color.rgb = ALERT_RED
            self._set_cell_background(cell_2, "f8fafc" if row_idx % 2 == 0 else "ffffff")
            self._set_cell_margins(cell_2, 60, 60, 100, 100)

        doc.add_paragraph().paragraph_format.space_after = Pt(8)

        # ── 4. Executive Summary ──
        h1 = doc.add_heading("1. Executive Summary & Context", level=1)
        h1.runs[0].font.color.rgb = STEEL_BLUE
        h1.runs[0].font.size = Pt(12.5)

        p_exec = doc.add_paragraph(content.executive_summary)
        p_exec.paragraph_format.line_spacing = 1.15
        p_exec.paragraph_format.space_after = Pt(8)

        # ── 5. Inspected Findings ──
        h2 = doc.add_heading("2. Inspected Component & Measured Defects", level=1)
        h2.runs[0].font.color.rgb = STEEL_BLUE
        h2.runs[0].font.size = Pt(12.5)

        p_find = doc.add_paragraph(content.inspection_findings)
        p_find.paragraph_format.line_spacing = 1.15
        p_find.paragraph_format.space_after = Pt(8)

        # ── 6. Governing SOPs & Grounded Citations ──
        h3 = doc.add_heading("3. Governing Standards & Verified Citations", level=1)
        h3.runs[0].font.color.rgb = STEEL_BLUE
        h3.runs[0].font.size = Pt(12.5)

        if content.sop_evaluations and len(content.sop_evaluations) > 0:
            sop_table = doc.add_table(rows=1, cols=4)
            sop_table.alignment = WD_TABLE_ALIGNMENT.CENTER
            sop_table.autofit = False

            # Header row
            hdr_cells = sop_table.rows[0].cells
            headers = ["Standard / SOP Document", "Chunk / Page", "Match %", "Governing Standard Mandate"]
            col_widths = [Inches(1.8), Inches(0.9), Inches(0.8), Inches(3.2)]

            for idx, text in enumerate(headers):
                cell = hdr_cells[idx]
                cell.width = col_widths[idx]
                p = cell.paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                r = p.add_run(text)
                r.bold = True
                r.font.size = Pt(9)
                r.font.color.rgb = RGBColor(255, 255, 255)
                self._set_cell_background(cell, "1e3a8a")
                self._set_cell_margins(cell, 80, 80, 100, 100)

            for citation in content.sop_evaluations:
                row_cells = sop_table.add_row().cells
                # Document name
                row_cells[0].width = col_widths[0]
                p0 = row_cells[0].paragraphs[0]
                r0 = p0.add_run(citation.document_name)
                r0.font.size = Pt(8.5)
                r0.bold = True

                # Page / chunk
                row_cells[1].width = col_widths[1]
                p1 = row_cells[1].paragraphs[0]
                p1.add_run(f"Chunk #{citation.chunk_index + 1}").font.size = Pt(8.5)

                # Match percentage
                row_cells[2].width = col_widths[2]
                p2 = row_cells[2].paragraphs[0]
                pct = int(citation.similarity_score * 100) if citation.similarity_score <= 1.0 else int(citation.similarity_score)
                r2 = p2.add_run(f"{pct}%")
                r2.font.size = Pt(8.5)
                r2.bold = True
                if pct >= 70:
                    r2.font.color.rgb = SUCCESS_GREEN

                # Excerpt
                row_cells[3].width = col_widths[3]
                p3 = row_cells[3].paragraphs[0]
                p3.add_run(citation.excerpt.strip()).font.size = Pt(8.5)

                for c_idx in range(4):
                    self._set_cell_margins(row_cells[c_idx], 60, 60, 80, 80)
                    self._set_cell_background(row_cells[c_idx], "f8fafc")
        else:
            doc.add_paragraph("No explicit standard citations were attached to this execution record.")

        doc.add_paragraph().paragraph_format.space_after = Pt(8)

        # ── 7. Risk Classification & Assessment ──
        h4 = doc.add_heading("4. Risk Severity & Compliance Verdict", level=1)
        h4.runs[0].font.color.rgb = STEEL_BLUE
        h4.runs[0].font.size = Pt(12.5)

        # Callout box for risk
        risk_table = doc.add_table(rows=1, cols=1)
        risk_cell = risk_table.rows[0].cells[0]
        self._set_cell_background(risk_cell, "fef2f2" if content.risk_severity in ["CRITICAL", "HIGH"] else "f0fdf4")
        self._set_cell_margins(risk_cell, 100, 100, 150, 150)

        p_r = risk_cell.paragraphs[0]
        r_lbl = p_r.add_run(f"RISK LEVEL: {content.risk_severity}  |  STATUS: {content.compliance_verdict}\n")
        r_lbl.bold = True
        r_lbl.font.size = Pt(10)
        r_lbl.font.color.rgb = ALERT_RED if content.risk_severity in ["CRITICAL", "HIGH"] else SUCCESS_GREEN

        p_r.add_run(
            f"The measured parameters violate operating safety limits defined in governing refinery SOPs. "
            f"Continued pressurized operation without remediation poses structural failure and safety hazards."
        ).font.size = Pt(9.5)

        doc.add_paragraph().paragraph_format.space_after = Pt(8)

        # ── 8. Mandatory Actions & Recommendations ──
        h5 = doc.add_heading("5. Mandated Corrective Action & Execution Timeline", level=1)
        h5.runs[0].font.color.rgb = STEEL_BLUE
        h5.runs[0].font.size = Pt(12.5)

        p_act = doc.add_paragraph(content.mandatory_actions)
        p_act.paragraph_format.line_spacing = 1.15
        p_act.paragraph_format.space_after = Pt(12)

        # ── 9. Human-in-the-Loop Sign-Off Block ──
        h6 = doc.add_heading("6. Human-in-the-Loop (HITL) Formal Sign-Off", level=1)
        h6.runs[0].font.color.rgb = STEEL_BLUE
        h6.runs[0].font.size = Pt(12.5)

        sign_table = doc.add_table(rows=3, cols=2)
        sign_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        sign_table.autofit = False

        sign_data = [
            ("Reviewing Authority:", content.approver_name, "Review Decision:", "APPROVED FOR EXECUTION"),
            ("Sign-Off Timestamp:", datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S IST"), "Air-Gap Token:", f"SOV-HITL-{execution_id[:8].upper()}"),
            ("Reviewer Remarks:", content.reviewer_notes or "Findings and mandatory remediation plan validated against active standards.", "Signature:", "_______________________________"),
        ]

        for r_i, (k1, v1, k2, v2) in enumerate(sign_data):
            row = sign_table.rows[r_i]
            c1, c2 = row.cells[0], row.cells[1]
            c1.width = Inches(3.3)
            c2.width = Inches(3.3)

            p1 = c1.paragraphs[0]
            p1.add_run(f"{k1} ").bold = True
            p1.add_run(v1)
            p1.runs[0].font.size = Pt(9)
            p1.runs[1].font.size = Pt(9)

            p2 = c2.paragraphs[0]
            p2.add_run(f"{k2} ").bold = True
            p2.add_run(v2)
            p2.runs[0].font.size = Pt(9)
            p2.runs[1].font.size = Pt(9)
            if v2 == "APPROVED FOR EXECUTION":
                p2.runs[1].bold = True
                p2.runs[1].font.color.rgb = SUCCESS_GREEN

            self._set_cell_background(c1, "f8fafc")
            self._set_cell_background(c2, "f8fafc")
            self._set_cell_margins(c1, 80, 80, 100, 100)
            self._set_cell_margins(c2, 80, 80, 100, 100)

        # ── 10. Save to Disk ──
        safe_prefix = re.sub(r'[^a-zA-Z0-9_\-]', '_', filename_prefix or "Approval_Note")
        out_filename = f"{safe_prefix}_{execution_id[:8]}.docx"
        out_path = self.artifacts_dir / out_filename
        doc.save(str(out_path))

        file_size = os.path.getsize(str(out_path))
        logger.info(f"Generated DOCX Approval Note: {out_path} ({file_size} bytes)")

        return {
            "filename": out_filename,
            "path": str(out_path),
            "size_bytes": file_size,
            "url": f"/api/workflows/executions/{execution_id}/artifact",
        }


# Singleton accessor
_docx_service_instance: Optional[DocxService] = None


def get_docx_service() -> DocxService:
    global _docx_service_instance
    if _docx_service_instance is None:
        _docx_service_instance = DocxService()
    return _docx_service_instance
