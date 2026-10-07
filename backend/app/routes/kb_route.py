"""
app/routes/kb_route.py
Knowledge Base routes enforcing Project-Level Isolation and Subscription Limits.
"""

from __future__ import annotations

import io
import os
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.dependencies.auth import get_current_user
from app.users.role_checker import require_role
from app.services.kb_service import (
    create_knowledge_base,
    delete_all_kb_for_project,
    delete_document_by_title,
    list_documents_grouped,
    get_document_full_text,
    UPLOAD_DIR
)
from app.services.retrieval_service import retrieve_top_n
from app.services.audit_logs_service import create_audit
from app.services.subscription_service import enforce_subscription_limit # 🔥 NEW IMPORT
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB limit
try:
    import pdfplumber
except ImportError:
    pdfplumber = None

router = APIRouter(prefix="/kb", tags=["Knowledge Base"])


class KBQuery(BaseModel):
    project_id: str = Field(..., description="ID of the project to search in.")
    query: str = Field(..., min_length=1, description="Search query text.")
    k:     int = Field(5, ge=1, le=20, description="Number of results to return.")



@router.post("/", status_code=status.HTTP_201_CREATED)
async def add_kb(
    request:      Request,
    project_id:   str        = Form(..., description="ID of the active project."),
    title:        str        = Form(None, description="Optional title."),
    content:      str        = Form(None, description="Raw text content."),
    file:         UploadFile = File(None, description="PDF file to parse."),
    current_user: dict       = Depends(require_role(["owner", "admin"])),
):
    # 🔒 TIER ENFORCEMENT
    await enforce_subscription_limit(current_user["org_id"], "kb_docs")

    extracted_content = content or ""
    doc_title = title
    doc_type = "text"
    saved_file_path = None

    if file:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        if not pdfplumber:
            raise HTTPException(status_code=500, detail="'pdfplumber' is not installed.")

        # 🔒 OOM PROTECTION: Read in chunks to safely enforce file size limits
        file_bytes = b""
        while chunk := await file.read(1024 * 1024):  # Read in 1MB chunks
            file_bytes += chunk
            if len(file_bytes) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, 
                    detail="File too large. Maximum allowed size is 10MB."
                )

        doc_type = "pdf"
        doc_title = doc_title or file.filename
        
        saved_file_path = os.path.join(UPLOAD_DIR, f"{current_user['org_id']}_{project_id}_{file.filename}")
        with open(saved_file_path, "wb") as f:
            f.write(file_bytes)
        try:
            pdf_file = io.BytesIO(file_bytes)
            extracted_content_accumulator = []
            
            with pdfplumber.open(pdf_file) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    tables = page.extract_tables()
                    table_markdowns = []
                    
                    for table in tables:
                        if table and len(table) > 0:
                            markdown_rows = []
                            for i, row in enumerate(table):
                                cleaned_row = [str(cell).strip().replace("\n", " ") if cell else "" for cell in row]
                                markdown_rows.append("| " + " | ".join(cleaned_row) + " |")
                                if i == 0:
                                    separator = ["---"] * len(row)
                                    markdown_rows.append("| " + " | ".join(separator) + " |")
                            table_markdowns.append("\n".join(markdown_rows))
                    
                    full_page_content = page_text
                    if table_markdowns:
                        full_page_content += "\n\n" + "\n\n".join(table_markdowns)
                    extracted_content_accumulator.append(full_page_content)
            
            extracted_content = "\n\n".join(extracted_content_accumulator)
        except Exception as e:
            if saved_file_path and os.path.exists(saved_file_path):
                os.remove(saved_file_path)
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {str(e)}")

    if not extracted_content.strip():
        raise HTTPException(status_code=400, detail="Text content or valid PDF must be provided.")

    final_payload = f"Title: {doc_title}\n\n{extracted_content}" if doc_title else extracted_content

    result = await create_knowledge_base(
        org_id    = current_user["org_id"],
        project_id= project_id,
        content   = final_payload,
        title     = doc_title or "Untitled Document",
        doc_type  = doc_type,
        file_path = saved_file_path
    )
    
    await create_audit(
        actor_id=current_user["user_id"],
        actor_name=current_user.get("username", "Unknown"),
        role=current_user.get("role", "member"),
        org_id=current_user["org_id"],
        action="kb.doc_uploaded",
        resource="knowledge_base",
        resource_id=doc_title or "pdf_document",
        request=request
    )

    return result


@router.get("/")
async def list_kb(
    project_id: str = Query(..., description="ID of the active project."),
    current_user: dict = Depends(get_current_user),
):
    docs = await list_documents_grouped(org_id=current_user["org_id"], project_id=project_id)
    return {
        "org_id": current_user["org_id"],
        "project_id": project_id,
        "count":  len(docs),
        "docs":   docs,
        "documents": docs,
    }


@router.get("/document/{title}")
async def get_document(
    title: str,
    project_id: str = Query(..., description="ID of the active project."),
    current_user: dict = Depends(get_current_user),
):
    doc = await get_document_full_text(org_id=current_user["org_id"], project_id=project_id, title=title)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc


@router.get("/file/{title}")
async def get_pdf_file(
    title: str,
    project_id: str = Query(..., description="ID of the active project."),
    current_user: dict = Depends(get_current_user),
):
    doc = await get_document_full_text(org_id=current_user["org_id"], project_id=project_id, title=title)
    if not doc or not doc.get("has_file"):
        raise HTTPException(status_code=404, detail="Original PDF file not found on server.")

    filename = title if title.lower().endswith(".pdf") else f"{title}.pdf"
    file_path = os.path.join(UPLOAD_DIR, f"{current_user['org_id']}_{project_id}_{filename}")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File path does not exist.")

    return FileResponse(path=file_path, media_type="application/pdf", filename=filename)


@router.delete("/document/{title}")
async def delete_document(
    title: str,
    request: Request,
    project_id: str = Query(..., description="ID of the active project."),
    current_user: dict = Depends(require_role(["owner", "admin"])),
):
    deleted_chunks = await delete_document_by_title(
        org_id=current_user["org_id"],
        project_id=project_id,
        title=title
    )
    if deleted_chunks == 0:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    await create_audit(
        actor_id=current_user["user_id"],
        actor_name=current_user.get("username", "Unknown"),
        role=current_user.get("role", "member"),
        org_id=current_user["org_id"],
        action="kb.doc_deleted",
        resource="knowledge_base",
        resource_id=title,
        request=request
    )
    
    return {"message": f"Document '{title}' deleted.", "deleted_chunks": deleted_chunks}


@router.post("/search")
async def search_kb(
    data: KBQuery,
    current_user: dict = Depends(get_current_user),
):
    results = await retrieve_top_n(
        query      = data.query,
        org_id     = current_user["org_id"],
        project_id = data.project_id,
        k          = data.k,
    )
    return {
        "org_id":  current_user["org_id"],
        "project_id": data.project_id,
        "query":   data.query,
        "results": results,
    }


@router.delete("/")
async def clear_kb(
    request: Request,
    project_id: str = Query(..., description="ID of the active project."),
    current_user: dict = Depends(require_role(["owner"])),
):
    count = await delete_all_kb_for_project(org_id=current_user["org_id"], project_id=project_id)
    
    await create_audit(
        actor_id=current_user["user_id"],
        actor_name=current_user.get("username", "Unknown"),
        role=current_user.get("role", "member"),
        org_id=current_user["org_id"],
        action="kb.cleared",
        resource="knowledge_base",
        resource_id=project_id,
        request=request
    )
    
    return {
        "message": f"Knowledge base for project {project_id} cleared.",
        "org_id":  current_user["org_id"],
        "project_id": project_id,
        "docs_deleted": count,
    }