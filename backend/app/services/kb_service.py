
"""
app/services/kb_service.py
Knowledge Base service handling chunking, embedding generation, MongoDB persistence, and document retrieval.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from bson import ObjectId

from app.db.knowledge_base import kb_collections
from app.core.embedding_model import embedding_model

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _chunk_text(text: str, chunk_size: int = 800, chunk_overlap: int = 100) -> List[str]:
    """Splits text by paragraphs while keeping entire Markdown tables intact."""
    sections = [s.strip() for s in text.split("\n\n") if s.strip()]
    chunks = []
    current_chunk = ""

    for section in sections:
        if len(current_chunk) + len(section) + 2 <= chunk_size:
            current_chunk = f"{current_chunk}\n\n{section}".strip()
        else:
            if current_chunk:
                chunks.append(current_chunk)
            
            if len(section) > chunk_size and "|" in section:
                chunks.append(section)
                current_chunk = ""
            elif len(section) > chunk_size:
                start = 0
                while start < len(section):
                    end = start + chunk_size
                    chunks.append(section[start:end].strip())
                    start += (chunk_size - chunk_overlap)
                current_chunk = ""
            else:
                current_chunk = section

    if current_chunk:
        chunks.append(current_chunk)

    return chunks if chunks else [text]


def generate_embedding(text: str) -> List[float]:
    return embedding_model.encode(text).tolist()


async def create_knowledge_base(
    org_id: str, 
    project_id:str,
    content: str, 
    title: str | None = None,
    doc_type: str = "text",
    file_path: Optional[str] = None
) -> Dict[str, Any]:
    chunks = _chunk_text(content)
    total_chunks = len(chunks)
    created_at = datetime.now(timezone.utc)
    
    saved_docs = []
    for index, chunk_text in enumerate(chunks):
        embedding = generate_embedding(chunk_text)
        
        doc = {
            "org_id": ObjectId(org_id) if ObjectId.is_valid(org_id) else org_id,
            "project_id":project_id,
            "title": title or "Document",
            "doc_type": doc_type,  # 'pdf' or 'text'
            "file_path": file_path,
            "content": chunk_text,
            "chunk_index": index,
            "total_chunks": total_chunks,
            "embedding": embedding,
            "created_at": created_at,
        }
        
        result = await kb_collections.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        saved_docs.append(doc)

    return {
        "message": "Knowledge base ingested successfully",
        "title": title,
        "doc_type": doc_type,
        "total_chunks": total_chunks,
        "first_doc_id": saved_docs[0]["_id"] if saved_docs else None,
    }


async def list_documents_grouped(org_id: str,project_id:str) -> List[Dict[str, Any]]:
    """Groups chunks by document title and provides complete document metadata for the UI."""
    org_filters = [org_id]
    if ObjectId.is_valid(org_id):
        org_filters.append(ObjectId(org_id))

    pipeline = [
        {"$match": {"org_id": {"$in": org_filters},"project_id":project_id}},
        {"$sort": {"chunk_index": 1}},
        {
            "$group": {
                "_id": "$title",
                "first_id": {"$first": "$_id"},
                "doc_type": {"$first": "$doc_type"},
                "file_path": {"$first": "$file_path"},
                "total_chunks": {"$first": "$total_chunks"},
                "created_at": {"$first": "$created_at"},
                "content": {"$first": "$content"},
            }
        },
        {"$sort": {"created_at": -1}}
    ]

    grouped_docs = await kb_collections.aggregate(pipeline).to_list(length=100)

    results = []
    for doc in grouped_docs:
        title = doc.get("_id") or "Untitled Document"
        is_pdf = bool(
            doc.get("doc_type") == "pdf" 
            or doc.get("file_path") 
            or str(title).lower().endswith(".pdf")
        )
        
        results.append({
            "id": str(doc.get("first_id", title)),
            "title": title,
            "content": doc.get("content", ""),
            "doc_type": "pdf" if is_pdf else "text",
            "has_file": bool(doc.get("file_path") and os.path.exists(doc.get("file_path", ""))),
            "total_chunks": doc.get("total_chunks", 1),
            "created_at": doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at") or ""),
        })
    return results



async def get_document_full_text(org_id: str, project_id: str, title: str) -> Dict[str, Any]:
    """Retrieves all chunks of a document for a specific project and reconstructs the text."""
    org_filters = [org_id]
    if ObjectId.is_valid(org_id):
        org_filters.append(ObjectId(org_id))

    # ADDED: "project_id": project_id to the query
    cursor = kb_collections.find(
        {"org_id": {"$in": org_filters}, "project_id": project_id, "title": title}
    ).sort("chunk_index", 1)

    chunks = await cursor.to_list(length=500)
    if not chunks:
        return {}

    full_text = "\n\n".join([c.get("content", "") for c in chunks])
    first_chunk = chunks[0]

    return {
        "title": title,
        "doc_type": first_chunk.get("doc_type", "text"),
        "total_chunks": len(chunks),
        "created_at": first_chunk.get("created_at"),
        "has_file": bool(first_chunk.get("file_path") and os.path.exists(first_chunk.get("file_path", ""))),
        "content": full_text
    }


async def delete_document_by_title(org_id: str, project_id: str, title: str) -> int:
    """Deletes a document and its local file, strictly scoped to the project."""
    org_filters = [org_id]
    if ObjectId.is_valid(org_id):
        org_filters.append(ObjectId(org_id))

    # ADDED: "project_id": project_id to the sample check
    sample = await kb_collections.find_one({
        "org_id": {"$in": org_filters}, 
        "project_id": project_id, 
        "title": title
    })
    
    if sample and sample.get("file_path") and os.path.exists(sample["file_path"]):
        try:
            os.remove(sample["file_path"])
        except OSError:
            pass

    # ADDED: "project_id": project_id to the deletion query
    res = await kb_collections.delete_many({
        "org_id": {"$in": org_filters}, 
        "project_id": project_id, 
        "title": title
    })
    return res.deleted_count

async def delete_all_kb_for_project(org_id: str, project_id: str) -> int:
    """Wipes all knowledge base vectors for a specific project."""
    org_filters = [org_id]
    if ObjectId.is_valid(org_id):
        org_filters.append(ObjectId(org_id))

    # ADDED: "project_id": project_id to ensure we only clear this specific project
    res = await kb_collections.delete_many({
        "org_id": {"$in": org_filters},
        "project_id": project_id
    })
    return res.deleted_count

