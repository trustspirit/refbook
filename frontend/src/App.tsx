import { useState, useEffect, useCallback } from 'react';
import { Project, Resource, ChatMessage } from './types';
import { 
  fetchProjects, createProject, deleteProject,
  fetchResources, addResource, deleteResource, refreshResource, 
  sendMessage 
} from './api';
import ProjectSelector from './components/ProjectSelector';
import ResourcePanel from './components/ResourcePanel';
import ChatPanel from './components/ChatPanel';
import ShareModal from './components/ShareModal';
import Toast, { ToastMessage } from './components/Toast';
import { Sparkles, Share2 } from 'lucide-react';

function App() {
  // Project state
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(true);

  // Resource state
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast helpers
  const addToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Load resources when project changes
  useEffect(() => {
    if (currentProject) {
      loadResources();
      setMessages([]); // Clear chat when switching projects
      setSelectedResources([]);
    } else {
      setResources([]);
    }
  }, [currentProject?.id]);

  const loadProjects = async () => {
    try {
      setProjectsLoading(true);
      const data = await fetchProjects();
      setProjects(data);
      // Auto-select first project if exists
      if (data.length > 0 && !currentProject) {
        setCurrentProject(data[0]);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setProjectsLoading(false);
    }
  };

  const loadResources = async () => {
    if (!currentProject) return;
    try {
      const data = await fetchResources(currentProject.id);
      setResources(data);
    } catch (err) {
      console.error('Failed to load resources:', err);
    }
  };

  // Project handlers
  const handleCreateProject = async (name: string, description?: string) => {
    setError(null);
    try {
      const project = await createProject(name, description);
      setProjects(prev => [...prev, project]);
      setCurrentProject(project);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (currentProject?.id === projectId) {
        const remaining = projects.filter(p => p.id !== projectId);
        setCurrentProject(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  const handleSelectProject = (project: Project) => {
    setCurrentProject(project);
  };

  // Resource handlers
  const handleAddResource = async (url: string) => {
    if (!currentProject) return;
    setError(null);
    try {
      const resource = await addResource(currentProject.id, url);
      setResources(prev => [...prev, resource]);
      addToast('info', `Adding "${resource.name}"...`);
      pollResourceStatus(resource.id, resource.name);
      loadProjects();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add resource';
      setError(message);
      addToast('error', message);
    }
  };

  const pollResourceStatus = async (resourceId: string, resourceName?: string) => {
    if (!currentProject) return;
    const checkStatus = async () => {
      try {
        const data = await fetchResources(currentProject.id);
        setResources(data);
        const resource = data.find(r => r.id === resourceId);
        if (resource && resource.status === 'processing') {
          setTimeout(checkStatus, 2000);
        } else if (resource) {
          loadProjects();
          if (resource.status === 'ready') {
            addToast('success', `"${resource.name}" is ready!`);
          } else if (resource.status === 'error') {
            addToast('error', `Failed to process "${resource.name}"`);
          }
        }
      } catch (err) {
        console.error('Failed to poll status:', err);
      }
    };
    setTimeout(checkStatus, 2000);
  };

  const handleDeleteResource = async (id: string) => {
    if (!currentProject) return;
    const resource = resources.find(r => r.id === id);
    try {
      await deleteResource(currentProject.id, id);
      setResources(prev => prev.filter(r => r.id !== id));
      setSelectedResources(prev => prev.filter(rid => rid !== id));
      loadProjects();
      addToast('success', `"${resource?.name || 'Resource'}" deleted`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete resource';
      setError(message);
      addToast('error', message);
    }
  };

  const handleRefreshResource = async (id: string) => {
    if (!currentProject) return;
    const resource = resources.find(r => r.id === id);
    addToast('info', `Refreshing "${resource?.name || 'resource'}"...`);
    try {
      const updated = await refreshResource(currentProject.id, id);
      setResources(prev => prev.map(r => r.id === id ? updated : r));
      pollResourceStatus(id, updated.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh resource';
      setError(message);
      addToast('error', message);
    }
  };

  const handleToggleResource = (id: string) => {
    setSelectedResources(prev =>
      prev.includes(id)
        ? prev.filter(rid => rid !== id)
        : [...prev, id]
    );
  };

  // Chat handlers
  const handleSendMessage = async (content: string) => {
    if (!currentProject) return;

    const userMessage: ChatMessage = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendMessage(currentProject.id, {
        message: content,
        resource_ids: selectedResources.length > 0 ? selectedResources : undefined,
        conversation_history: messages.map(m => ({ role: m.role, content: m.content })),
      });

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const readyResourceCount = resources.filter(r => r.status === 'ready').length;

  return (
    <div className="flex h-screen overflow-hidden bg-dark-950 bg-mesh">
      {/* Sidebar */}
      <div className="w-80 glass border-r border-dark-800/50 flex flex-col min-h-0">
        {/* Header */}
        <div className="p-5 border-b border-dark-800/50 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-cyber-500 rounded-xl flex items-center justify-center shadow-glow">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white tracking-tight">RefBook</h1>
                <p className="text-xs text-dark-400">AI Knowledge Assistant</p>
              </div>
            </div>
            {currentProject && (
              <button
                onClick={() => setShowShareModal(true)}
                disabled={readyResourceCount === 0}
                className="p-2 text-dark-400 hover:text-accent-400 hover:bg-accent-500/10 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {/* Project Selector */}
          <ProjectSelector
            projects={projects}
            currentProject={currentProject}
            onSelectProject={handleSelectProject}
            onCreateProject={handleCreateProject}
            onDeleteProject={handleDeleteProject}
            isLoading={projectsLoading}
          />
        </div>

        {/* Resource Panel */}
        {currentProject ? (
          <ResourcePanel
            resources={resources}
            selectedResources={selectedResources}
            onAdd={handleAddResource}
            onDelete={handleDeleteResource}
            onRefresh={handleRefreshResource}
            onToggle={handleToggleResource}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-sm text-dark-500 text-center leading-relaxed">
              Create or select a project to start adding resources
            </p>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {error && (
          <div className="bg-red-500/10 border-b border-red-500/20 p-3 text-red-400 text-sm flex-shrink-0 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300 font-medium text-xs uppercase tracking-wide"
            >
              Dismiss
            </button>
          </div>
        )}
        
        {currentProject ? (
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onClearChat={handleClearChat}
            hasResources={readyResourceCount > 0}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center animate-fade-in">
              <div className="w-24 h-24 bg-gradient-to-br from-accent-500/20 to-cyber-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-accent-500/20">
                <Sparkles className="w-12 h-12 text-accent-400" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-3">Welcome to RefBook</h2>
              <p className="text-dark-400 max-w-sm mx-auto leading-relaxed">
                Your AI-powered knowledge assistant. Create a project to get started.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {currentProject && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          projectId={currentProject.id}
          projectName={currentProject.name}
          resourceCount={readyResourceCount}
        />
      )}

      {/* Toast Notifications */}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default App;
