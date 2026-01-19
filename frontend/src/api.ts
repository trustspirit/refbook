import { Project, Resource, ChatRequest, ChatResponse, ShareSession, ShareInfo } from './types';

const API_BASE = '/api';

// ============ Project API ============

export async function fetchProjects(): Promise<Project[]> {
  const response = await fetch(`${API_BASE}/projects`);
  if (!response.ok) throw new Error('Failed to fetch projects');
  return response.json();
}

export async function createProject(name: string, description?: string): Promise<Project> {
  const response = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create project');
  }
  return response.json();
}

export async function updateProject(projectId: string, name: string, description?: string): Promise<Project> {
  const response = await fetch(`${API_BASE}/projects/${projectId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update project');
  }
  return response.json();
}

export async function deleteProject(projectId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/projects/${projectId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete project');
}

// ============ Resource API ============

export async function fetchResources(projectId: string): Promise<Resource[]> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/resources`);
  if (!response.ok) throw new Error('Failed to fetch resources');
  const data = await response.json();
  return data.resources;
}

export async function addResource(projectId: string, url: string, name?: string): Promise<Resource> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/resources`, {
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

export async function deleteResource(projectId: string, resourceId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/resources/${resourceId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete resource');
}

export async function refreshResource(projectId: string, resourceId: string): Promise<Resource> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/resources/${resourceId}/refresh`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to refresh resource');
  const data = await response.json();
  return data.resource;
}

// ============ Chat API ============

export async function sendMessage(projectId: string, request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/chat`, {
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

// ============ Share API ============

export async function createShare(projectId: string, name?: string): Promise<ShareSession> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create share link');
  }
  return response.json();
}

export async function fetchShares(projectId: string): Promise<ShareSession[]> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/share`);
  if (!response.ok) throw new Error('Failed to fetch shares');
  return response.json();
}

export async function fetchShareInfo(shareId: string): Promise<ShareInfo> {
  const response = await fetch(`${API_BASE}/share/${shareId}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Share link not found or expired');
    }
    throw new Error('Failed to fetch share info');
  }
  return response.json();
}

export async function deleteShare(shareId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/share/${shareId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete share');
}

export async function sendShareMessage(shareId: string, request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/share/${shareId}/chat`, {
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
