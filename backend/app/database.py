from sqlalchemy import create_engine, Column, String, Text, DateTime, Integer, Enum as SQLEnum, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import enum
import os

from app.config import get_settings

settings = get_settings()

# Database URL
DATABASE_URL = settings.database_url

# Create engine
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

# Session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class
Base = declarative_base()


class ResourceStatusEnum(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"


# Database Models
class ProjectDB(Base):
    __tablename__ = "projects"
    
    id = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    resources = relationship("ResourceDB", back_populates="project", cascade="all, delete-orphan")
    share_sessions = relationship("ShareSessionDB", back_populates="project", cascade="all, delete-orphan")


class ResourceDB(Base):
    __tablename__ = "resources"
    
    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    url = Column(Text, nullable=False)
    name = Column(String(500), nullable=False)
    status = Column(SQLEnum(ResourceStatusEnum), default=ResourceStatusEnum.PENDING)
    chunk_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("ProjectDB", back_populates="resources")


class ShareSessionDB(Base):
    __tablename__ = "share_sessions"
    
    id = Column(String(8), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    project = relationship("ProjectDB", back_populates="share_sessions")


def init_db():
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
