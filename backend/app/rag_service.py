import os
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema import Document

from app.config import get_settings
from app.models import Project, Resource, ResourceStatus, ChatMessage, ShareSession
from app.database import SessionLocal, ProjectDB, ResourceDB, ShareSessionDB, ResourceStatusEnum, init_db
from app.scraper import scraper


class RAGService:
    """Service for managing RAG operations with project support."""
    
    def __init__(self):
        self.settings = get_settings()
        self._embeddings = None
        self._vectorstore = None
        self._llm = None
        
        # Initialize database
        init_db()
        
        # Text splitter for chunking
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.settings.chunk_size,
            chunk_overlap=self.settings.chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        
        # System prompt for RAG
        self.system_prompt = """You are a helpful assistant that answers questions based ONLY on the provided context.
If the context doesn't contain enough information to answer the question, say "I don't have enough information in the provided resources to answer this question."
Always cite which source(s) you used to answer the question.

Context:
{context}

Previous conversation:
{history}
"""
    
    def _get_db(self):
        """Get a database session."""
        return SessionLocal()
    
    def _db_to_project(self, db_project: ProjectDB) -> Project:
        """Convert DB model to Pydantic model."""
        return Project(
            id=db_project.id,
            name=db_project.name,
            description=db_project.description,
            created_at=db_project.created_at,
            updated_at=db_project.updated_at
        )
    
    def _db_to_resource(self, db_resource: ResourceDB) -> Resource:
        """Convert DB model to Pydantic model."""
        return Resource(
            id=db_resource.id,
            project_id=db_resource.project_id,
            url=db_resource.url,
            name=db_resource.name,
            status=ResourceStatus(db_resource.status.value),
            chunk_count=db_resource.chunk_count,
            created_at=db_resource.created_at,
            updated_at=db_resource.updated_at,
            error_message=db_resource.error_message
        )
    
    def _db_to_share_session(self, db_session: ShareSessionDB) -> ShareSession:
        """Convert DB model to Pydantic model."""
        return ShareSession(
            id=db_session.id,
            project_id=db_session.project_id,
            name=db_session.name,
            created_at=db_session.created_at
        )
    
    @property
    def embeddings(self):
        """Lazy load embeddings model."""
        if self._embeddings is None:
            self._embeddings = HuggingFaceEmbeddings(
                model_name=self.settings.embedding_model,
                model_kwargs={'device': 'cpu'},
                encode_kwargs={'normalize_embeddings': True}
            )
        return self._embeddings
    
    @property
    def vectorstore(self):
        """Lazy load or create vector store."""
        if self._vectorstore is None:
            persist_dir = self.settings.chroma_persist_directory
            os.makedirs(persist_dir, exist_ok=True)
            
            self._vectorstore = Chroma(
                collection_name="refbook",
                embedding_function=self.embeddings,
                persist_directory=persist_dir
            )
        return self._vectorstore
    
    @property
    def llm(self):
        """Lazy load LLM."""
        if self._llm is None:
            self._llm = ChatOpenAI(
                model=self.settings.llm_model,
                api_key=self.settings.openai_api_key,
                temperature=0.7
            )
        return self._llm
    
    # ============ Project Methods ============
    
    def create_project(self, name: str, description: Optional[str] = None) -> Project:
        """Create a new project."""
        db = self._get_db()
        try:
            db_project = ProjectDB(
                id=str(uuid.uuid4()),
                name=name,
                description=description
            )
            db.add(db_project)
            db.commit()
            db.refresh(db_project)
            return self._db_to_project(db_project)
        finally:
            db.close()
    
    def get_project(self, project_id: str) -> Optional[Project]:
        """Get a project by ID."""
        db = self._get_db()
        try:
            db_project = db.query(ProjectDB).filter(ProjectDB.id == project_id).first()
            return self._db_to_project(db_project) if db_project else None
        finally:
            db.close()
    
    def get_all_projects(self) -> List[Project]:
        """Get all projects."""
        db = self._get_db()
        try:
            db_projects = db.query(ProjectDB).order_by(ProjectDB.created_at.desc()).all()
            return [self._db_to_project(p) for p in db_projects]
        finally:
            db.close()
    
    def update_project(self, project_id: str, name: Optional[str] = None, description: Optional[str] = None) -> Optional[Project]:
        """Update a project."""
        db = self._get_db()
        try:
            db_project = db.query(ProjectDB).filter(ProjectDB.id == project_id).first()
            if not db_project:
                return None
            
            if name is not None:
                db_project.name = name
            if description is not None:
                db_project.description = description
            db_project.updated_at = datetime.utcnow()
            
            db.commit()
            db.refresh(db_project)
            return self._db_to_project(db_project)
        finally:
            db.close()
    
    async def delete_project(self, project_id: str) -> bool:
        """Delete a project and all its resources."""
        db = self._get_db()
        try:
            db_project = db.query(ProjectDB).filter(ProjectDB.id == project_id).first()
            if not db_project:
                return False
            
            # Delete vectors for all resources in this project
            db_resources = db.query(ResourceDB).filter(ResourceDB.project_id == project_id).all()
            for resource in db_resources:
                await self._delete_resource_vectors(resource.id)
            
            # Delete project (cascade will delete resources and share sessions)
            db.delete(db_project)
            db.commit()
            return True
        finally:
            db.close()
    
    def get_project_stats(self, project_id: str) -> Dict[str, int]:
        """Get resource stats for a project."""
        db = self._get_db()
        try:
            resources = db.query(ResourceDB).filter(ResourceDB.project_id == project_id).all()
            return {
                "total": len(resources),
                "ready": len([r for r in resources if r.status == ResourceStatusEnum.READY]),
                "processing": len([r for r in resources if r.status == ResourceStatusEnum.PROCESSING]),
                "error": len([r for r in resources if r.status == ResourceStatusEnum.ERROR])
            }
        finally:
            db.close()
    
    # ============ Resource Methods ============
    
    async def add_resource(self, project_id: str, url: str, name: Optional[str] = None) -> Resource:
        """Add a new resource to a project."""
        db = self._get_db()
        try:
            # Check project exists
            db_project = db.query(ProjectDB).filter(ProjectDB.id == project_id).first()
            if not db_project:
                raise ValueError(f"Project {project_id} not found")
            
            resource_id = str(uuid.uuid4())
            db_resource = ResourceDB(
                id=resource_id,
                project_id=project_id,
                url=url,
                name=name or url,
                status=ResourceStatusEnum.PROCESSING
            )
            db.add(db_resource)
            db.commit()
            db.refresh(db_resource)
            
            # Process in background
            try:
                title, content = await scraper.scrape_url(url)
                
                if name is None:
                    db_resource.name = title
                
                chunk_count = await self._process_content(project_id, resource_id, url, content)
                
                db_resource.chunk_count = chunk_count
                db_resource.status = ResourceStatusEnum.READY
                db_resource.updated_at = datetime.utcnow()
                
            except Exception as e:
                db_resource.status = ResourceStatusEnum.ERROR
                db_resource.error_message = str(e)
                db_resource.updated_at = datetime.utcnow()
            
            db.commit()
            db.refresh(db_resource)
            return self._db_to_resource(db_resource)
        finally:
            db.close()
    
    async def _process_content(self, project_id: str, resource_id: str, url: str, content: str) -> int:
        """Process content and add to vector store."""
        chunks = self.text_splitter.split_text(content)
        
        documents = [
            Document(
                page_content=chunk,
                metadata={
                    "project_id": project_id,
                    "resource_id": resource_id,
                    "url": url,
                    "chunk_index": i
                }
            )
            for i, chunk in enumerate(chunks)
        ]
        
        if documents:
            self.vectorstore.add_documents(documents)
        
        return len(documents)
    
    async def refresh_resource(self, project_id: str, resource_id: str) -> Resource:
        """Refresh a resource by re-scraping and updating vectors."""
        db = self._get_db()
        try:
            db_resource = db.query(ResourceDB).filter(
                ResourceDB.id == resource_id,
                ResourceDB.project_id == project_id
            ).first()
            
            if not db_resource:
                raise ValueError(f"Resource {resource_id} not found")
            
            db_resource.status = ResourceStatusEnum.PROCESSING
            db_resource.updated_at = datetime.utcnow()
            db.commit()
            
            try:
                await self._delete_resource_vectors(resource_id)
                title, content = await scraper.scrape_url(db_resource.url)
                chunk_count = await self._process_content(project_id, resource_id, db_resource.url, content)
                
                db_resource.chunk_count = chunk_count
                db_resource.status = ResourceStatusEnum.READY
                db_resource.error_message = None
                db_resource.updated_at = datetime.utcnow()
                
            except Exception as e:
                db_resource.status = ResourceStatusEnum.ERROR
                db_resource.error_message = str(e)
                db_resource.updated_at = datetime.utcnow()
            
            db.commit()
            db.refresh(db_resource)
            return self._db_to_resource(db_resource)
        finally:
            db.close()
    
    async def _delete_resource_vectors(self, resource_id: str):
        """Delete all vectors for a resource."""
        try:
            results = self.vectorstore.get(where={"resource_id": resource_id})
            if results and results.get("ids"):
                self.vectorstore.delete(ids=results["ids"])
        except Exception:
            pass
    
    async def delete_resource(self, project_id: str, resource_id: str) -> bool:
        """Delete a resource and its vectors."""
        db = self._get_db()
        try:
            db_resource = db.query(ResourceDB).filter(
                ResourceDB.id == resource_id,
                ResourceDB.project_id == project_id
            ).first()
            
            if not db_resource:
                return False
            
            await self._delete_resource_vectors(resource_id)
            db.delete(db_resource)
            db.commit()
            return True
        finally:
            db.close()
    
    def get_resource(self, resource_id: str) -> Optional[Resource]:
        """Get a resource by ID."""
        db = self._get_db()
        try:
            db_resource = db.query(ResourceDB).filter(ResourceDB.id == resource_id).first()
            return self._db_to_resource(db_resource) if db_resource else None
        finally:
            db.close()
    
    def get_project_resources(self, project_id: str) -> List[Resource]:
        """Get all resources for a project."""
        db = self._get_db()
        try:
            db_resources = db.query(ResourceDB).filter(
                ResourceDB.project_id == project_id
            ).order_by(ResourceDB.created_at.desc()).all()
            return [self._db_to_resource(r) for r in db_resources]
        finally:
            db.close()
    
    # ============ Share Session Methods ============
    
    def create_share_session(self, project_id: str, name: Optional[str] = None) -> ShareSession:
        """Create a share session for a project."""
        db = self._get_db()
        try:
            db_project = db.query(ProjectDB).filter(ProjectDB.id == project_id).first()
            if not db_project:
                raise ValueError(f"Project {project_id} not found")
            
            ready_count = db.query(ResourceDB).filter(
                ResourceDB.project_id == project_id,
                ResourceDB.status == ResourceStatusEnum.READY
            ).count()
            
            if ready_count == 0:
                raise ValueError("No ready resources to share")
            
            session_id = str(uuid.uuid4())[:8]
            db_session = ShareSessionDB(
                id=session_id,
                project_id=project_id,
                name=name or db_project.name
            )
            db.add(db_session)
            db.commit()
            db.refresh(db_session)
            return self._db_to_share_session(db_session)
        finally:
            db.close()
    
    def get_share_session(self, session_id: str) -> Optional[ShareSession]:
        """Get a share session by ID."""
        db = self._get_db()
        try:
            db_session = db.query(ShareSessionDB).filter(ShareSessionDB.id == session_id).first()
            return self._db_to_share_session(db_session) if db_session else None
        finally:
            db.close()
    
    def get_share_session_resources(self, session_id: str) -> List[Resource]:
        """Get resources for a share session."""
        db = self._get_db()
        try:
            db_session = db.query(ShareSessionDB).filter(ShareSessionDB.id == session_id).first()
            if not db_session:
                return []
            
            db_resources = db.query(ResourceDB).filter(
                ResourceDB.project_id == db_session.project_id,
                ResourceDB.status == ResourceStatusEnum.READY
            ).all()
            return [self._db_to_resource(r) for r in db_resources]
        finally:
            db.close()
    
    def delete_share_session(self, session_id: str) -> bool:
        """Delete a share session."""
        db = self._get_db()
        try:
            db_session = db.query(ShareSessionDB).filter(ShareSessionDB.id == session_id).first()
            if not db_session:
                return False
            db.delete(db_session)
            db.commit()
            return True
        finally:
            db.close()
    
    def get_project_share_sessions(self, project_id: str) -> List[ShareSession]:
        """Get all share sessions for a project."""
        db = self._get_db()
        try:
            db_sessions = db.query(ShareSessionDB).filter(
                ShareSessionDB.project_id == project_id
            ).order_by(ShareSessionDB.created_at.desc()).all()
            return [self._db_to_share_session(s) for s in db_sessions]
        finally:
            db.close()
    
    # ============ Chat Methods ============
    
    async def chat(
        self,
        project_id: str,
        message: str,
        resource_ids: Optional[List[str]] = None,
        conversation_history: Optional[List[ChatMessage]] = None
    ) -> Dict[str, Any]:
        """Chat with the RAG system for a specific project."""
        
        # Build filter for this project
        if resource_ids:
            where_filter = {
                "$and": [
                    {"project_id": project_id},
                    {"resource_id": {"$in": resource_ids}}
                ]
            }
        else:
            where_filter = {"project_id": project_id}
        
        try:
            results = self.vectorstore.similarity_search_with_score(
                message,
                k=self.settings.top_k,
                filter=where_filter
            )
        except Exception:
            results = []
        
        if not results:
            return {
                "answer": "I don't have any resources to search. Please add some URLs first.",
                "sources": []
            }
        
        context_parts = []
        sources = []
        for doc, distance in results:
            context_parts.append(f"[Source: {doc.metadata.get('url', 'Unknown')}]\n{doc.page_content}")
            similarity = 1 / (1 + float(distance))
            sources.append({
                "url": doc.metadata.get("url", ""),
                "content": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                "score": similarity
            })
        
        context = "\n\n---\n\n".join(context_parts)
        
        history = ""
        if conversation_history:
            history_parts = []
            for msg in conversation_history[-5:]:
                history_parts.append(f"{msg.role}: {msg.content}")
            history = "\n".join(history_parts)
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", self.system_prompt),
            ("human", "{question}")
        ])
        
        chain = prompt | self.llm
        response = await chain.ainvoke({
            "context": context,
            "history": history,
            "question": message
        })
        
        return {
            "answer": response.content,
            "sources": sources
        }


# Singleton instance
rag_service = RAGService()
