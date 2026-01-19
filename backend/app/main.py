from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.models import (
    ResourceCreate,
    Resource,
    ResourceList,
    ChatRequest,
    ChatResponse,
    RefreshRequest,
    RefreshResponse,
)
from app.rag_service import rag_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown."""
    # Startup: Initialize embeddings model (warm up)
    print("Starting RefBook API...")
    _ = rag_service.embeddings  # Pre-load embeddings
    print("RAG service initialized")
    yield
    # Shutdown
    print("Shutting down RefBook API...")


app = FastAPI(
    title="RefBook API",
    description="NotebookLM-style RAG service for URL-based knowledge retrieval",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


# Resource endpoints
@app.post("/api/resources", response_model=Resource, status_code=status.HTTP_201_CREATED)
async def create_resource(resource: ResourceCreate):
    """Add a new resource from URL."""
    try:
        result = await rag_service.add_resource(
            url=resource.url,
            name=resource.name
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add resource: {str(e)}")


@app.get("/api/resources", response_model=ResourceList)
async def list_resources():
    """List all resources."""
    resources = rag_service.get_all_resources()
    return ResourceList(resources=resources, total=len(resources))


@app.get("/api/resources/{resource_id}", response_model=Resource)
async def get_resource(resource_id: str):
    """Get a specific resource."""
    resource = rag_service.get_resource(resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return resource


@app.delete("/api/resources/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(resource_id: str):
    """Delete a resource."""
    success = await rag_service.delete_resource(resource_id)
    if not success:
        raise HTTPException(status_code=404, detail="Resource not found")
    return None


@app.post("/api/resources/{resource_id}/refresh", response_model=RefreshResponse)
async def refresh_resource(resource_id: str):
    """Refresh a resource by re-scraping and updating the RAG index."""
    try:
        resource = await rag_service.refresh_resource(resource_id)
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


# Chat endpoint
@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat with the RAG system."""
    try:
        result = await rag_service.chat(
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
