export interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  resource_count?: number;
  ready_resource_count?: number;
}

export interface Resource {
  id: string;
  project_id: string;
  url: string;
  name: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  chunk_count: number;
  created_at: string;
  updated_at: string;
  error_message?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

export interface Source {
  url: string;
  content: string;
  score: number;
}

export interface ChatRequest {
  message: string;
  resource_ids?: string[];
  conversation_history?: { role: string; content: string }[];
}

export interface ChatResponse {
  answer: string;
  sources: Source[];
}

export interface ShareSession {
  id: string;
  name: string;
  share_url: string;
  project_name: string;
  resource_count: number;
  created_at: string;
}

export interface ShareInfo {
  id: string;
  name: string;
  project_id: string;
  project_name: string;
  resources: { id: string; name: string; url: string }[];
  created_at: string;
}
