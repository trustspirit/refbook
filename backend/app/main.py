from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import List

from app.config import get_settings
from app.models import (
    ProjectCreate,
    Project,
    ProjectList,
    ProjectWithStats,
    ResourceCreate,
    Resource,
    ResourceList,
    ChatRequest,
    ChatResponse,
    RefreshResponse,
    ShareCreate,
    ShareResponse,
)
from app.rag_service import rag_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown."""
    print("Starting RefBook API...")
    _ = rag_service.embeddings
    print("RAG service initialized")
    yield
    print("Shutting down RefBook API...")


app = FastAPI(
    title="RefBook API",
    description="NotebookLM-style RAG service for URL-based knowledge retrieval",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


# ============ Project Endpoints ============

@app.post("/api/projects", response_model=Project, status_code=status.HTTP_201_CREATED)
async def create_project(project: ProjectCreate):
    """Create a new project."""
    result = rag_service.create_project(
        name=project.name,
        description=project.description
    )
    return result


@app.get("/api/projects", response_model=List[ProjectWithStats])
async def list_projects():
    """List all projects with stats."""
    projects = rag_service.get_all_projects()
    result = []
    for p in projects:
        stats = rag_service.get_project_stats(p.id)
        result.append(ProjectWithStats(
            **p.model_dump(),
            resource_count=stats["total"],
            ready_resource_count=stats["ready"]
        ))
    return result


@app.get("/api/projects/{project_id}", response_model=ProjectWithStats)
async def get_project(project_id: str):
    """Get a specific project."""
    project = rag_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    stats = rag_service.get_project_stats(project_id)
    return ProjectWithStats(
        **project.model_dump(),
        resource_count=stats["total"],
        ready_resource_count=stats["ready"]
    )


@app.put("/api/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, project: ProjectCreate):
    """Update a project."""
    result = rag_service.update_project(
        project_id=project_id,
        name=project.name,
        description=project.description
    )
    if not result:
        raise HTTPException(status_code=404, detail="Project not found")
    return result


@app.delete("/api/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: str):
    """Delete a project and all its resources."""
    success = await rag_service.delete_project(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return None


# ============ Resource Endpoints ============

@app.post("/api/projects/{project_id}/resources", response_model=Resource, status_code=status.HTTP_201_CREATED)
async def create_resource(project_id: str, resource: ResourceCreate):
    """Add a new resource to a project."""
    try:
        result = await rag_service.add_resource(
            project_id=project_id,
            url=resource.url,
            name=resource.name
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add resource: {str(e)}")


@app.get("/api/projects/{project_id}/resources", response_model=ResourceList)
async def list_resources(project_id: str):
    """List all resources in a project."""
    project = rag_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    resources = rag_service.get_project_resources(project_id)
    return ResourceList(resources=resources, total=len(resources))


@app.get("/api/projects/{project_id}/resources/{resource_id}", response_model=Resource)
async def get_resource(project_id: str, resource_id: str):
    """Get a specific resource."""
    resource = rag_service.get_resource(resource_id)
    if not resource or resource.project_id != project_id:
        raise HTTPException(status_code=404, detail="Resource not found")
    return resource


@app.delete("/api/projects/{project_id}/resources/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(project_id: str, resource_id: str):
    """Delete a resource."""
    success = await rag_service.delete_resource(project_id, resource_id)
    if not success:
        raise HTTPException(status_code=404, detail="Resource not found")
    return None


@app.post("/api/projects/{project_id}/resources/{resource_id}/refresh", response_model=RefreshResponse)
async def refresh_resource(project_id: str, resource_id: str):
    """Refresh a resource by re-scraping."""
    try:
        resource = await rag_service.refresh_resource(project_id, resource_id)
        return RefreshResponse(
            success=True,
            message="Resource refreshed successfully",
            resource=resource
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        return RefreshResponse(
            success=False,
            message=f"Failed to refresh resource: {str(e)}"
        )


# ============ Chat Endpoints ============

@app.post("/api/projects/{project_id}/chat", response_model=ChatResponse)
async def chat(project_id: str, request: ChatRequest):
    """Chat with resources in a project."""
    project = rag_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        result = await rag_service.chat(
            project_id=project_id,
            message=request.message,
            resource_ids=request.resource_ids,
            conversation_history=request.conversation_history
        )
        return ChatResponse(
            answer=result["answer"],
            sources=result["sources"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


# ============ Share Endpoints ============

@app.post("/api/projects/{project_id}/share", response_model=ShareResponse, status_code=status.HTTP_201_CREATED)
async def create_share(project_id: str, share: ShareCreate):
    """Create a share link for a project."""
    try:
        session = rag_service.create_share_session(
            project_id=project_id,
            name=share.name
        )
        project = rag_service.get_project(project_id)
        resources = rag_service.get_share_session_resources(session.id)
        return ShareResponse(
            id=session.id,
            name=session.name,
            share_url=f"/s/{session.id}",
            project_name=project.name if project else "",
            resource_count=len(resources),
            created_at=session.created_at
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/projects/{project_id}/share", response_model=List[ShareResponse])
async def list_shares(project_id: str):
    """List all share sessions for a project."""
    sessions = rag_service.get_project_share_sessions(project_id)
    project = rag_service.get_project(project_id)
    return [
        ShareResponse(
            id=s.id,
            name=s.name,
            share_url=f"/s/{s.id}",
            project_name=project.name if project else "",
            resource_count=len(rag_service.get_share_session_resources(s.id)),
            created_at=s.created_at
        )
        for s in sessions
    ]


@app.get("/api/share/{share_id}")
async def get_share(share_id: str):
    """Get share session info for public access."""
    session = rag_service.get_share_session(share_id)
    if not session:
        raise HTTPException(status_code=404, detail="Share link not found")
    
    project = rag_service.get_project(session.project_id)
    resources = rag_service.get_share_session_resources(share_id)
    
    return {
        "id": session.id,
        "name": session.name,
        "project_id": session.project_id,
        "project_name": project.name if project else "",
        "resources": [
            {"id": r.id, "name": r.name, "url": r.url}
            for r in resources
        ],
        "created_at": session.created_at
    }


@app.delete("/api/share/{share_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_share(share_id: str):
    """Delete a share session."""
    success = rag_service.delete_share_session(share_id)
    if not success:
        raise HTTPException(status_code=404, detail="Share link not found")
    return None


@app.post("/api/share/{share_id}/chat", response_model=ChatResponse)
async def share_chat(share_id: str, request: ChatRequest):
    """Chat with shared project resources."""
    session = rag_service.get_share_session(share_id)
    if not session:
        raise HTTPException(status_code=404, detail="Share link not found")
    
    try:
        result = await rag_service.chat(
            project_id=session.project_id,
            message=request.message,
            resource_ids=request.resource_ids,
            conversation_history=request.conversation_history
        )
        return ChatResponse(
            answer=result["answer"],
            sources=result["sources"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True
    )
