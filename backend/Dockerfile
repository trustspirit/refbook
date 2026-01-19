FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Download the embedding model during build
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy application code
COPY . .

# Create directory for ChromaDB persistence
RUN mkdir -p /app/chroma_db

# Expose port
EXPOSE 6061

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "6061"]
