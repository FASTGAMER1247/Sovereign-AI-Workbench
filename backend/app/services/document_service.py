import base64
import json
import logging
import os
import re
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import HTTPException, UploadFile, status

from app.config import Settings, get_settings
from app.models.schemas import (
    ChatMessage,
    ChatRequest,
    DocumentAnalysisRequest,
    DocumentAnalysisResponse,
    DocumentExtractionResponse,
    DocumentResponse,
    GroundedCitation,
    RAGAuditRequest,
    RAGAuditResponse,
)
from app.services.knowledge_service import KnowledgeService, get_knowledge_service
from app.services.model_service import ModelService, get_model_service

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}


class DocumentService:
    """Service managing document storage, metadata registry, extraction, and local AI analysis."""

    def __init__(
        self,
        settings: Optional[Settings] = None,
        model_service: Optional[ModelService] = None,
        knowledge_service: Optional[KnowledgeService] = None,
    ):
        self.settings = settings or get_settings()
        self.model_service = model_service or get_model_service()
        self.knowledge_service = knowledge_service or get_knowledge_service()
        self.storage_dir = Path(self.settings.DOCUMENTS_DIR)
        self.registry_file = self.storage_dir / "registry.json"
        self._ensure_storage_dir()
        self._registry: Dict[str, dict] = self._load_registry()

    def _ensure_storage_dir(self) -> None:
        """Create documents directory if it does not exist."""
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def _load_registry(self) -> Dict[str, dict]:
        """Load document metadata registry from disk."""
        if self.registry_file.exists():
            try:
                with open(self.registry_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading registry file {self.registry_file}: {e}")
                return {}
        return {}

    def _save_registry(self) -> None:
        """Persist document metadata registry to disk."""
        try:
            with open(self.registry_file, "w", encoding="utf-8") as f:
                json.dump(self._registry, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error saving registry file {self.registry_file}: {e}")

    @staticmethod
    def _sanitize_filename(filename: str) -> str:
        """Sanitize uploaded filename to prevent directory traversal and invalid chars."""
        # Strip path
        clean_name = Path(filename).name
        # Replace unsafe characters
        clean_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', clean_name)
        return clean_name or "uploaded_document"

    async def save_uploaded_file(self, file: UploadFile) -> DocumentResponse:
        """Validate and securely save an uploaded document."""
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file must have a valid filename."
            )

        sanitized_name = self._sanitize_filename(file.filename)
        file_ext = Path(sanitized_name).suffix.lower()

        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file extension '{file_ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            )

        # Read content to validate size
        content = await file.read()
        size_bytes = len(content)
        max_bytes = self.settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

        if size_bytes > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size ({size_bytes / (1024*1024):.2f} MB) exceeds maximum allowed limit of {self.settings.MAX_UPLOAD_SIZE_MB} MB."
            )

        if size_bytes == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty (0 bytes)."
            )

        doc_id = str(uuid.uuid4())
        stored_filename = f"{doc_id}{file_ext}"
        storage_path = self.storage_dir / stored_filename

        try:
            with open(storage_path, "wb") as f:
                f.write(content)
        except Exception as e:
            logger.exception(f"Failed to write uploaded file to {storage_path}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal storage error while saving document."
            )

        file_type = file_ext.lstrip(".")
        created_at = datetime.now(timezone.utc).isoformat()

        doc_record = {
            "id": doc_id,
            "filename": sanitized_name,
            "file_type": file_type,
            "size_bytes": size_bytes,
            "storage_path": str(storage_path),
            "created_at": created_at,
            "status": "uploaded",
            "extracted_text": None,
            "analysis": None,
            "error_message": None,
        }

        self._registry[doc_id] = doc_record
        self._save_registry()

        try:
            from app.services.audit_logger import audit_logger
            audit_logger.record_event(
                event_type="DOCUMENT_INGEST",
                severity="INFO",
                actor="system_operator",
                details={
                    "document_id": doc_id,
                    "filename": sanitized_name,
                    "file_type": file_type,
                    "size_bytes": size_bytes
                }
            )
        except Exception as err:
            logger.debug(f"Audit log emission skipped: {err}")

        logger.info(f"Document uploaded successfully: ID={doc_id}, Name={sanitized_name}, Type={file_type}, Size={size_bytes}B")

        return DocumentResponse(
            id=doc_id,
            filename=sanitized_name,
            file_type=file_type,
            size_bytes=size_bytes,
            created_at=created_at,
            status="uploaded",
            extracted_text_preview=None,
            error_message=None,
        )

    def list_documents(self) -> List[DocumentResponse]:
        """List all registered documents sorted by newest first."""
        docs = []
        for doc in self._registry.values():
            preview = None
            if doc.get("extracted_text"):
                preview = doc["extracted_text"][:150] + ("..." if len(doc["extracted_text"]) > 150 else "")
            docs.append(DocumentResponse(
                id=doc["id"],
                filename=doc["filename"],
                file_type=doc["file_type"],
                size_bytes=doc["size_bytes"],
                created_at=doc["created_at"],
                status=doc.get("status", "uploaded"),
                extracted_text_preview=preview,
                error_message=doc.get("error_message"),
            ))
        docs.sort(key=lambda d: d.created_at, reverse=True)
        return docs

    def get_document(self, document_id: str) -> DocumentResponse:
        """Get metadata for a specific document by ID."""
        doc = self._registry.get(document_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID '{document_id}' not found."
            )
        preview = None
        if doc.get("extracted_text"):
            preview = doc["extracted_text"][:150] + ("..." if len(doc["extracted_text"]) > 150 else "")
        return DocumentResponse(
            id=doc["id"],
            filename=doc["filename"],
            file_type=doc["file_type"],
            size_bytes=doc["size_bytes"],
            created_at=doc["created_at"],
            status=doc.get("status", "uploaded"),
            extracted_text_preview=preview,
            error_message=doc.get("error_message"),
        )

    async def extract_text(self, document_id: str) -> DocumentExtractionResponse:
        """Extract text from a document using PyMuPDF (PDF) or local Ollama Vision (Images)."""
        doc = self._registry.get(document_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID '{document_id}' not found."
            )

        storage_path = Path(doc["storage_path"])
        if not storage_path.exists():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Document file missing from storage path."
            )

        file_type = doc["file_type"].lower()
        extracted_text = ""
        method = "unknown"

        if file_type == "pdf":
            try:
                import fitz  # PyMuPDF
                pdf_doc = fitz.open(storage_path)
                pages_text = []
                for i, page in enumerate(pdf_doc):
                    page_text = page.get_text()
                    pages_text.append(f"--- Page {i + 1} ---\n{page_text.strip()}")
                extracted_text = "\n\n".join(pages_text).strip()
                method = "pymupdf"
                if not extracted_text:
                    extracted_text = "[No text content found on PDF pages. Document might contain scanned images or empty pages.]"
            except ImportError:
                logger.error("PyMuPDF (fitz) is not installed in the environment.")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="PyMuPDF library is not installed on the backend server."
                )
            except Exception as e:
                logger.exception(f"Error extracting text from PDF {document_id}: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to extract text from PDF: {str(e)}"
                )

        elif file_type in {"png", "jpg", "jpeg"}:
            # Multimodal Vision extraction using Ollama
            try:
                with open(storage_path, "rb") as f:
                    image_bytes = f.read()
                img_b64 = base64.b64encode(image_bytes).decode("utf-8")

                vision_prompt = (
                    "You are an expert document intelligence assistant. Analyze this document image. "
                    "Extract and transcribe all visible text, headers, table data, timestamps, numbers, "
                    "and visual observations accurately."
                )

                message = ChatMessage(
                    role="user",
                    content=vision_prompt,
                    images=[img_b64]
                )

                chat_req = ChatRequest(
                    messages=[message],
                    temperature=0.2,
                )

                response = await self.model_service.generate_chat(chat_req)
                extracted_text = response.response
                method = "ollama_vision"
            except Exception as e:
                logger.exception(f"Error extracting image content via Ollama vision for {document_id}: {e}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Local Ollama vision extraction failed: {str(e)}"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type '{file_type}' for extraction."
            )

        # Update registry
        doc["extracted_text"] = extracted_text
        doc["status"] = "extracted"
        self._save_registry()

        try:
            from app.services.audit_logger import audit_logger
            audit_logger.record_event(
                event_type="DOCUMENT_EXTRACT",
                severity="INFO",
                actor="document_service",
                details={
                    "document_id": doc["id"],
                    "filename": doc["filename"],
                    "method": method,
                    "char_count": len(extracted_text)
                }
            )
        except Exception as err:
            logger.debug(f"Audit log emission skipped: {err}")

        return DocumentExtractionResponse(
            document_id=doc["id"],
            filename=doc["filename"],
            file_type=doc["file_type"],
            extracted_text=extracted_text,
            char_count=len(extracted_text),
            method=method,
        )

    async def analyze_document(self, document_id: str, request: DocumentAnalysisRequest) -> DocumentAnalysisResponse:
        """Run local AI analysis on an ingested document."""
        doc = self._registry.get(document_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID '{document_id}' not found."
            )

        storage_path = Path(doc["storage_path"])
        file_type = doc["file_type"].lower()

        # If not already extracted, extract first
        if not doc.get("extracted_text"):
            await self.extract_text(document_id)
            doc = self._registry.get(document_id)

        extracted_text = doc.get("extracted_text", "")
        custom_prompt = request.prompt.strip() if request.prompt else None

        if file_type in {"png", "jpg", "jpeg"} and not custom_prompt:
            # If it's an image and no custom prompt, we can use the already generated vision extraction or analyze directly
            system_instruction = (
                "You are an industrial auditor analyzing an inspection report / document. "
                "Provide a structured analysis with: 1. Executive Summary, 2. Key Findings & Observations, "
                "3. Risk Level (Low/Medium/High/Critical) with justification, 4. Recommended Corrective Actions."
            )
            user_content = f"Based on the following extracted document information, perform a detailed industrial analysis:\n\n{extracted_text}"
            messages = [
                ChatMessage(role="system", content=system_instruction),
                ChatMessage(role="user", content=user_content),
            ]
        elif file_type == "pdf":
            system_instruction = (
                "You are an industrial document auditor analyzing a confidential technical document on-premise. "
                "Structure your evaluation clearly with: 1. Executive Summary, 2. Key Findings, 3. Risk Assessment, "
                "4. Recommended Actions."
            )
            if custom_prompt:
                user_content = f"Document Content:\n{extracted_text[:15000]}\n\nUser Question/Instruction: {custom_prompt}"
            else:
                user_content = f"Document Content:\n{extracted_text[:15000]}\n\nPlease provide a full technical audit and analysis of the document above."

            messages = [
                ChatMessage(role="system", content=system_instruction),
                ChatMessage(role="user", content=user_content),
            ]
        else:
            user_content = f"Document Content:\n{extracted_text[:15000]}\n\nInstruction: {custom_prompt or 'Analyze this document.'}"
            messages = [
                ChatMessage(role="user", content=user_content),
            ]

        chat_req = ChatRequest(
            messages=messages,
            model=request.model,
            temperature=0.3,
        )

        try:
            start_time = time.perf_counter()
            response = await self.model_service.generate_chat(chat_req)
            duration_ms = (time.perf_counter() - start_time) * 1000.0

            doc["analysis"] = response.response
            doc["status"] = "analyzed"
            self._save_registry()

            return DocumentAnalysisResponse(
                document_id=doc["id"],
                filename=doc["filename"],
                analysis=response.response,
                model=response.model,
                provider=response.provider,
                duration_ms=round(duration_ms, 2),
                prompt_tokens=response.prompt_eval_count,
                completion_tokens=response.eval_count,
                created_at=datetime.now(timezone.utc).isoformat(),
            )
        except Exception as e:
            logger.exception(f"Error during document analysis for {document_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Local document analysis failed: {str(e)}"
            )

    async def rag_audit_document(
        self,
        document_id: str,
        request: RAGAuditRequest = RAGAuditRequest(),
    ) -> RAGAuditResponse:
        """Run RAG-grounded document audit cross-referencing organizational standards/SOPs from ChromaDB."""
        doc = self._registry.get(document_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID '{document_id}' was not found in registry."
            )

        # Ensure text is extracted
        if not doc.get("extracted_text"):
            await self.extract_text(document_id)
            doc = self._registry.get(document_id)

        extracted_text = doc.get("extracted_text", "")
        if not extracted_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document contains no extractable text for RAG audit."
            )

        from app.services.retrieval_service import RetrievalService
        from app.services.rag_service import RAGService
        from app.services.embedding import get_embedding_provider
        from app.services.vector_store import get_vector_store

        embedding_provider = get_embedding_provider(self.settings)
        vector_store = get_vector_store(self.settings)
        retrieval_service = RetrievalService(embedding_provider=embedding_provider, vector_store=vector_store)
        rag_service = RAGService(retrieval_service=retrieval_service, model_service=self.model_service)

        try:
            start_time = time.perf_counter()
            # Retrieve relevant standard chunks from ChromaDB
            retrieval_query = f"{doc['filename']} {request.prompt or ''} {extracted_text[:400]}"
            scored_chunks = await retrieval_service.retrieve_top_chunks(
                query=retrieval_query,
                top_k=request.top_k_standards,
            )

            # Build grounded context & exact citations from ChromaDB metadata
            grounded_context, citations = rag_service.build_grounded_context(scored_chunks)

            system_instruction = (
                "You are a Senior Sovereign Industrial Compliance Auditor for high-stakes PSU, defense, and refinery operations. "
                "Your objective is to audit the provided inspection document strictly against the grounded organizational SOPs, "
                "safety codes, and engineering standards provided in the context.\n\n"
                "Produce a structured, rigorous Compliance Audit Report with the following sections:\n"
                "1. EXECUTIVE SUMMARY & AUDIT SCOPE\n"
                "2. OBSERVED FINDINGS & DEFECTS\n"
                "3. APPLICABLE STANDARDS & COMPLIANCE EVALUATION (Explicitly cite the standard name and page/section for each rule!)\n"
                "4. RISK MATRIX & SEVERITY RATING (Low / Medium / High / Critical with engineering justification)\n"
                "5. MANDATORY CORRECTIVE ACTION PLAN & TIMELINE"
            )

            user_content = f"--- INSPECTION DOCUMENT UNDER AUDIT ({doc['filename']}) ---\n{extracted_text[:12000]}\n\n"
            if grounded_context:
                user_content += f"{grounded_context}\n\n"
            else:
                user_content += "(Note: No specific standard matched in knowledge base. Evaluating based on general engineering best practices.)\n\n"

            if request.prompt:
                user_content += f"Specific Auditor Instructions: {request.prompt}\n\n"

            user_content += "Please perform the grounded technical compliance audit now citing the retrieved standards accurately."

            messages = [
                ChatMessage(role="system", content=system_instruction),
                ChatMessage(role="user", content=user_content),
            ]

            chat_req = ChatRequest(
                messages=messages,
                model=request.model,
                temperature=0.2,  # Low temperature for strict factual adherence to standards
            )

            response = await self.model_service.generate_chat(chat_req)
            duration_ms = (time.perf_counter() - start_time) * 1000.0

            doc["rag_analysis"] = response.response
            doc["status"] = "analyzed"
            self._save_registry()

            return RAGAuditResponse(
                document_id=doc["id"],
                filename=doc["filename"],
                analysis=response.response,
                grounded_citations=citations,
                model=response.model,
                provider=response.provider,
                duration_ms=round(duration_ms, 2),
                prompt_tokens=response.prompt_eval_count,
                completion_tokens=response.eval_count,
                created_at=datetime.now(timezone.utc).isoformat(),
            )
        except Exception as e:
            logger.exception(f"Error during RAG document audit for {document_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Local RAG document audit failed: {str(e)}"
            )


_global_document_service: Optional[DocumentService] = None


def get_document_service() -> DocumentService:
    global _global_document_service
    if _global_document_service is None:
        _global_document_service = DocumentService()
    return _global_document_service
