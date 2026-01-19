from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # OpenAI
    openai_api_key: str = ""
    
    # Database
    database_url: str = "sqlite:///./refbook.db"  # Default to SQLite for local dev
    
    # ChromaDB
    chroma_persist_directory: str = "./chroma_db"
    
    # Models
    embedding_model: str = "all-MiniLM-L6-v2"
    llm_model: str = "gpt-4o-mini"
    
    # Server
    host: str = "0.0.0.0"
    port: int = 6061
    
    # RAG Settings
    chunk_size: int = 1000
    chunk_overlap: int = 200
    top_k: int = 5
    
    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
