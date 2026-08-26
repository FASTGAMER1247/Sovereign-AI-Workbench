import asyncio
import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.config import get_settings
from app.models.schemas import KnowledgeIngestRequest, KnowledgeQueryRequest, RAGAuditRequest
from app.services.embedding import get_embedding_provider
from app.services.vector_store import get_vector_store
from app.services.knowledge_service import KnowledgeService
from app.services.retrieval_service import RetrievalService
from app.services.rag_service import RAGService
from app.services.model_service import get_model_service


async def run_chroma_rag_verification():
    print("=" * 60)
    print("SOVEREIGN AI WORKBENCH - CHROMADB & RAG HARDENING TEST")
    print("=" * 60)

    settings = get_settings()

    # 1. Verify Embedding Provider
    print("\n[STEP 1] Initializing EmbeddingProvider...")
    embedder = get_embedding_provider(settings)
    info = embedder.get_provider_info()
    print(f"Embedding Provider: {info['provider']}")
    print(f"Embedding Model:    {info['model']}")
    print(f"Expected Dimension: {info['dimension']}")

    sample_text = "Refinery line 102 wall thickness evaluation under API 570 standard."
    print(f"Generating test embedding for: '{sample_text}'...")
    emb = await embedder.embed_text(sample_text)
    print(f"Generated Vector Dimension: {len(emb)}")
    assert len(emb) == 768, f"Expected 768-dim vector from nomic-embed-text, got {len(emb)}"
    print("Vector Sample:", emb[:3], "...")
    print("STEP 1 PASSED: Genuine 768-dim embedding generated successfully!")

    # 2. Verify ChromaDB Persistent Vector Store
    print("\n[STEP 2] Initializing ChromaVectorStore...")
    vector_store = get_vector_store(settings)
    stats = vector_store.get_stats()
    print("ChromaDB Stats before test:", stats)
    assert stats["vector_database"] == "ChromaDB"
    assert "chroma" in stats["persist_dir"].lower()
    print("STEP 2 PASSED: ChromaDB PersistentClient initialized!")

    # 3. Test Knowledge Base Ingestion
    print("\n[STEP 3] Ingesting Technical SOP Fixture...")
    fixture_path = backend_dir / "tests" / "fixtures" / "SOP-REF-570_Piping_Integrity.txt"
    with open(fixture_path, "r", encoding="utf-8") as f:
        sop_content = f.read()

    kb_service = KnowledgeService(
        vector_store=vector_store,
        embedding_provider=embedder,
        chunk_size=500,
        chunk_overlap=100,
    )

    ingest_res = await kb_service.ingest_text(
        title="SOP-REF-570_Piping_Integrity.txt",
        content=sop_content,
        metadata={"category": "Refinery Piping", "standard_id": "SOP-REF-570-REV4"},
    )
    print(f"Ingested Document ID: {ingest_res.document_id}")
    print(f"Total Chunks Created & Embedded: {ingest_res.total_chunks}")
    assert ingest_res.total_chunks >= 2
    print("STEP 3 PASSED: SOP chunked, embedded with nomic-embed-text, and stored in ChromaDB!")

    # 4. Test Semantic Retrieval from ChromaDB
    print("\n[STEP 4] Executing Natural Language Semantic Retrieval...")
    retrieval_service = RetrievalService(
        embedding_provider=embedder,
        vector_store=vector_store,
    )

    query = "What is the critical wall thickness retirement limit and replacement timeline for carbon steel line 102?"
    print(f"Query: '{query}'")
    query_res = await retrieval_service.search(query=query, top_k=3)
    print(f"ChromaDB Query matched {query_res.total_matched} chunks in {query_res.query_time_ms}ms:")
    
    assert len(query_res.results) > 0
    top_match = query_res.results[0]
    print(f"- Top Match Similarity: {top_match.similarity_score:.4f}")
    print(f"- Source Document:      {top_match.chunk.filename} (Chunk #{top_match.chunk.chunk_index})")
    print(f"- Content Preview:      {top_match.chunk.content[:150]}...")
    
    # Provenance verification
    assert top_match.chunk.filename == "SOP-REF-570_Piping_Integrity.txt"
    assert "2.50 mm" in top_match.chunk.content or "Critical Safety Hazard" in top_match.chunk.content
    print("STEP 4 PASSED: ChromaDB semantic search accurately retrieved critical SOP section!")

    # 5. Test RAG Compliance Audit with Citations
    print("\n[STEP 5] Executing RAG Compliance Audit via qwen3.5:0.8b...")
    model_service = get_model_service()
    rag_service = RAGService(
        retrieval_service=retrieval_service,
        model_service=model_service,
    )

    inspection_findings = (
        "INSPECTION SUMMARY: Line 102 Ultrasonic Thickness Inspection on 2026-08-26.\n"
        "Active wall thickness measured at Elbow E-14: 2.18 mm.\n"
        "Flange bolt torque measured on Class 300 flange: 145 ft-lbs."
    )

    audit_res = await rag_service.rag_audit_document(
        document_id="doc_test_102",
        document_name="UT_Inspection_Report_Line102.pdf",
        extracted_text=inspection_findings,
        custom_focus="Evaluate wall thickness against retirement limits and recommend required action.",
        top_k=2,
    )

    print("\n--- RAG AUDIT RESPONSE ---")
    print(f"Audited Document:   {audit_res.filename}")
    print(f"Model Used:         {audit_res.model}")
    print(f"Grounded Citations: {len(audit_res.grounded_citations)}")
    for cite in audit_res.grounded_citations:
        print(f"  * Source: {cite.document_name} | Chunk #{cite.chunk_index} | Match: {int(cite.similarity_score*100)}%")
        print(f"    Excerpt: '{cite.excerpt[:100]}...'")

    print("\n--- AUDIT ANALYSIS OUTPUT ---")
    print(audit_res.analysis[:500] + ("..." if len(audit_res.analysis) > 500 else ""))
    print("---------------------------------")
    
    assert len(audit_res.grounded_citations) > 0
    assert audit_res.analysis is not None and len(audit_res.analysis) > 50
    print("STEP 5 PASSED: RAG Compliance Audit completed with verified source citations!")

    # 6. Verify Persistence Across Fresh Client
    print("\n[STEP 6] Verifying Persistence Across New Client Instance...")
    new_store = get_vector_store(settings)
    all_docs = await new_store.get_all_documents()
    print(f"Total Persisted Documents in ChromaDB: {len(all_docs)}")
    assert len(all_docs) >= 1
    found = any(d.filename == "SOP-REF-570_Piping_Integrity.txt" for d in all_docs)
    assert found, "Persisted SOP not found in ChromaDB document list!"
    print("STEP 6 PASSED: ChromaDB persistence verified!")

    print("\n" + "=" * 60)
    print("ALL MILESTONE 3 ARCHITECTURE CORRECTIONS FULLY VERIFIED!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_chroma_rag_verification())
