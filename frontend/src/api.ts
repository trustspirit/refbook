import { Resource, ChatRequest, ChatResponse } from './types';

const API_BASE = '/api';

export async function fetchResources(): Promise<Resource[]> {
  const response = await fetch(`${API_BASE}/resources`);
  if (!response.ok) throw new Error('Failed to fetch resources');
  const data = await response.json();
  return data.resources;
}

export async function addResource(url: string, name?: string): Promise<Resource> {
  const response = await fetch(`${API_BASE}/resources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, name }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to add resource');
  }
  return response.json();
}

export async function deleteResource(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/resources/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete resource');
}

export async function refreshResource(id: string): Promise<Resource> {
  const response = await fetch(`${API_BASE}/resources/${id}/refresh`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to refresh resource');
  const data = await response.json();
  return data.resource;
}

export async function sendMessage(request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to send message');
  }
  return response.json();
}
