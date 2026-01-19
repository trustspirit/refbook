import os
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
import asyncio

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema import Document

from app.config import get_settings
from app.models import Resource, ResourceStatus, ChatMessage
from app.scraper import scraper


class RAGService:
    """Service for managing RAG operations."""
    
    def __init__(self):
        self.settings = get_settings()
        self._embeddings = None
        self._vectorstore = None
        self._llm = None
        self._resources: Dict[str, Resource] = {}
        
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
    
    async def add_resource(self, url: str, name: Optional[str] = None) -> Resource:
        """Add a new resource from URL."""
        resource_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Create resource entry
        resource = Resource(
            id=resource_id,
            url=url,
            name=name or url,
            status=ResourceStatus.PROCESSING,
            created_at=now,
            updated_at=now
        )
        self._resources[resource_id] = resource
        
        try:
            # Scrape content
            title, content = await scraper.scrape_url(url)
            
            if name is None:
                resource.name = title
            
            # Process and store
            chunk_count = await self._process_content(resource_id, url, content)
            
            resource.chunk_count = chunk_count
            resource.status = ResourceStatus.READY
            resource.updated_at = datetime.utcnow()
            
        except Exception as e:
            resource.status = ResourceStatus.ERROR
            resource.error_message = str(e)
            resource.updated_at = datetime.utcnow()
        
        return resource
    
    async def _process_content(self, resource_id: str, url: str, content: str) -> int:
        """Process content and add to vector store."""
        # Split into chunks
        chunks = self.text_splitter.split_text(content)
        
        # Create documents with metadata
        documents = [
            Document(
                page_content=chunk,
                metadata={
                    "resource_id": resource_id,
                    "url": url,
                    "chunk_index": i
                }
            )
            for i, chunk in enumerate(chunks)
        ]
        
        # Add to vector store
        if documents:
            self.vectorstore.add_documents(documents)
        
        return len(documents)
    
    async def refresh_resource(self, resource_id: str) -> Resource:
        """Refresh a resource by re-scraping and updating vectors."""
        if resource_id not in self._resources:
            raise ValueError(f"Resource {resource_id} not found")
        
        resource = self._resources[resource_id]
        resource.status = ResourceStatus.PROCESSING
        resource.updated_at = datetime.utcnow()
        
        try:
            # Delete old vectors for this resource
            await self._delete_resource_vectors(resource_id)
            
            # Re-scrape
            title, content = await scraper.scrape_url(resource.url)
            
            # Re-process
            chunk_count = await self._process_content(resource_id, resource.url, content)
            
            resource.chunk_count = chunk_count
            resource.status = ResourceStatus.READY
            resource.updated_at = datetime.utcnow()
            
        except Exception as e:
            resource.status = ResourceStatus.ERROR
            resource.error_message = str(e)
            resource.updated_at = datetime.utcnow()
        
        return resource
    
    async def _delete_resource_vectors(self, resource_id: str):
        """Delete all vectors for a resource."""
        try:
            # Get all IDs for this resource
            results = self.vectorstore.get(
                where={"resource_id": resource_id}
            )
            if results and results.get("ids"):
                self.vectorstore.delete(ids=results["ids"])
        except Exception:
            pass  # Collection might not exist yet
    
    async def delete_resource(self, resource_id: str) -> bool:
        """Delete a resource and its vectors."""
        if resource_id not in self._resources:
            return False
        
        await self._delete_resource_vectors(resource_id)
        del self._resources[resource_id]
        return True
    
    def get_resource(self, resource_id: str) -> Optional[Resource]:
        """Get a resource by ID."""
        return self._resources.get(resource_id)
    
    def get_all_resources(self) -> List[Resource]:
        """Get all resources."""
        return list(self._resources.values())
    
    async def chat(
        self,
        message: str,
        resource_ids: Optional[List[str]] = None,
        conversation_history: Optional[List[ChatMessage]] = None
    ) -> Dict[str, Any]:
        """Chat with the RAG system."""
        
        # Build filter if specific resources are requested
        where_filter = None
        if resource_ids:
            where_filter = {"resource_id": {"$in": resource_ids}}
        
        # Search for relevant chunks
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
        
        # Build context from results
        context_parts = []
        sources = []
        for doc, score in results:
            context_parts.append(f"[Source: {doc.metadata.get('url', 'Unknown')}]\n{doc.page_content}")
            sources.append({
                "url": doc.metadata.get("url", ""),
                "content": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                "score": float(score)
            })
        
        context = "\n\n---\n\n".join(context_parts)
        
        # Build conversation history
        history = ""
        if conversation_history:
            history_parts = []
            for msg in conversation_history[-5:]:  # Last 5 messages
                history_parts.append(f"{msg.role}: {msg.content}")
            history = "\n".join(history_parts)
        
        # Create prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", self.system_prompt),
            ("human", "{question}")
        ])
        
        # Generate response
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
