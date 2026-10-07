

"""
app/services/retrieval_service.py
Fast Hybrid RAG retrieval combining Vector Search and Lexical/Keyword Search with Project Isolation.
"""

from __future__ import annotations

import re
import numpy as np
from typing import List, Dict, Any
from bson import ObjectId

from app.db.knowledge_base import kb_collections
from app.core.embedding_model import embedding_model


def _cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    a = np.array(vec_a, dtype=np.float32)
    b = np.array(vec_b, dtype=np.float32)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


async def _get_vector_candidates(
    org_filters: list, 
    project_id: str, 
    query: str, 
    limit: int = 10
) -> List[Dict[str, Any]]:
    # Filter strictly by both org_id and project_id
    cursor = kb_collections.find({
        "org_id": {"$in": org_filters},
        "project_id": project_id,
    })
    candidates = await cursor.to_list(length=10_000)

    if not candidates:
        return []

    query_embedding = embedding_model.encode(query).tolist()

    scored = []
    for doc in candidates:
        doc_emb = doc.get("embedding")
        if not doc_emb:
            continue
        sim = _cosine_similarity(query_embedding, doc_emb)
        scored.append((sim, doc))

    scored.sort(key=lambda x: x[0], reverse=True)
    
    return [
        {
            "id": str(doc["_id"]),
            "content": doc.get("content", ""),
            "title": doc.get("title", ""),
            "chunk_index": doc.get("chunk_index", 0),
            "score": round(score, 4),
        }
        for score, doc in scored[:limit]
    ]


async def _get_keyword_candidates(
    org_filters: list, 
    project_id: str, 
    query: str, 
    limit: int = 10
) -> List[Dict[str, Any]]:
    if not query or len(query.strip()) < 1:
        return []

    # Base filter includes both org_id and project_id
    base_filter = {
        "org_id": {"$in": org_filters},
        "project_id": project_id,
    }
    words = [w for w in re.split(r"\W+", query.strip()) if len(w) >= 2]

    or_clauses = []
    if words:
        regex_phrase = re.compile(re.escape(query.strip()), re.IGNORECASE)
        or_clauses.append({"content": {"$regex": regex_phrase}})
        or_clauses.append({"title": {"$regex": regex_phrase}})

        for w in words:
            word_regex = re.compile(rf"\b{re.escape(w)}\b", re.IGNORECASE)
            or_clauses.append({"content": {"$regex": word_regex}})

    query_filter = {**base_filter, "$or": or_clauses} if or_clauses else base_filter

    cursor = kb_collections.find(query_filter).limit(limit)
    docs = await cursor.to_list(length=limit)

    return [
        {
            "id": str(doc["_id"]),
            "content": doc.get("content", ""),
            "title": doc.get("title", ""),
            "chunk_index": doc.get("chunk_index", 0),
            "score": 0.5,
        }
        for doc in docs
    ]


async def retrieve_top_n(
    query: str,
    org_id: str,
    project_id: str,
    k: int = 5,
) -> list[dict]:
    org_filters = [org_id]
    if ObjectId.is_valid(org_id):
        org_filters.append(ObjectId(org_id))

    vector_candidates = await _get_vector_candidates(org_filters, project_id, query, limit=10)
    keyword_candidates = await _get_keyword_candidates(org_filters, project_id, query, limit=10)

    # Merge and deduplicate candidates by chunk ID
    seen_ids = set()
    merged_candidates: List[Dict[str, Any]] = []

    for item in vector_candidates + keyword_candidates:
        if item["id"] not in seen_ids:
            seen_ids.add(item["id"])
            merged_candidates.append(item)

    if not merged_candidates:
        return []

    # Sort merged candidates by score descending
    merged_candidates.sort(key=lambda x: x.get("score", 0.0), reverse=True)
    return merged_candidates[:k]


async def retrieve_context_string(
    query: str,
    org_id: str,
    project_id: str,
    k: int = 5,
) -> str:
    chunks = await retrieve_top_n(query=query, org_id=org_id, project_id=project_id, k=k)

    if not chunks:
        return ""

    parts = [
        f"[Chunk {i+1} | score={c.get('score', 0.0)}]\n{c['content']}"
        for i, c in enumerate(chunks)
    ]

    return "\n\n---\n\n".join(parts)
