from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ResourceStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"


# Project models
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class Project(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ProjectList(BaseModel):
    projects: List[Project]
    total: int


class ProjectWithStats(Project):
    resource_count: int = 0
    ready_resource_count: int = 0


# Resource models
class ResourceCreate(BaseModel):
    url: str
    name: Optional[str] = None


class Resource(BaseModel):
    id: str
    project_id: str
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


# Chat models
class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    resource_ids: Optional[List[str]] = None  # If None, use all resources in project
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


# Share models
class ShareSession(BaseModel):
    id: str
    project_id: str
    name: str
    created_at: datetime


class ShareCreate(BaseModel):
    name: Optional[str] = None


class ShareResponse(BaseModel):
    id: str
    name: str
    share_url: str
    project_name: str
    resource_count: int
    created_at: datetime
