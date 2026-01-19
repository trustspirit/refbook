export interface Resource {
  id: string;
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
