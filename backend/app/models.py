from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ResourceStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"


class ResourceCreate(BaseModel):
    url: str
    name: Optional[str] = None


class Resource(BaseModel):
    id: str
    url: str
    name: str
    status: ResourceStatus
    chunk_count: int = 0
    created_at: datetime
    updated_at: datetime
    error_message: Optional[str] = None


class ResourceList(BaseModel):
    resources: List[Resource]
    total: int


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    resource_ids: Optional[List[str]] = None  # If None, use all resources
    conversation_history: Optional[List[ChatMessage]] = []


class ChatResponse(BaseModel):
    answer: str
    sources: List[dict]  # Contains source chunks with metadata


class RefreshRequest(BaseModel):
    resource_id: str


class RefreshResponse(BaseModel):
    success: bool
    message: str
    resource: Optional[Resource] = None
