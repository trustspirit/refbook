import { useState, useEffect } from 'react';
import { Resource, ChatMessage } from './types';
import { fetchResources, addResource, deleteResource, refreshResource, sendMessage } from './api';
import ResourcePanel from './components/ResourcePanel';
import ChatPanel from './components/ChatPanel';
import { BookOpen } from 'lucide-react';

function App() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    try {
      const data = await fetchResources();
      setResources(data);
    } catch (err) {
      console.error('Failed to load resources:', err);
    }
  };

  const handleAddResource = async (url: string) => {
    setError(null);
    try {
      const resource = await addResource(url);
      setResources(prev => [...prev, resource]);
      // Poll for status updates
      pollResourceStatus(resource.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add resource');
    }
  };

  const pollResourceStatus = async (resourceId: string) => {
    const checkStatus = async () => {
      try {
        const data = await fetchResources();
        setResources(data);
        const resource = data.find(r => r.id === resourceId);
        if (resource && resource.status === 'processing') {
          setTimeout(checkStatus, 2000);
        }
      } catch (err) {
        console.error('Failed to poll status:', err);
      }
    };
    setTimeout(checkStatus, 2000);
  };

  const handleDeleteResource = async (id: string) => {
    try {
      await deleteResource(id);
      setResources(prev => prev.filter(r => r.id !== id));
      setSelectedResources(prev => prev.filter(rid => rid !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete resource');
    }
  };

  const handleRefreshResource = async (id: string) => {
    try {
      const resource = await refreshResource(id);
      setResources(prev => prev.map(r => r.id === id ? resource : r));
      pollResourceStatus(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh resource');
    }
  };

  const handleToggleResource = (id: string) => {
    setSelectedResources(prev =>
      prev.includes(id)
        ? prev.filter(rid => rid !== id)
        : [...prev, id]
    );
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: ChatMessage = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendMessage({
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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-800">RefBook</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">URL-based RAG Chat</p>
        </div>
        <ResourcePanel
          resources={resources}
          selectedResources={selectedResources}
          onAdd={handleAddResource}
          onDelete={handleDeleteResource}
          onRefresh={handleRefreshResource}
          onToggle={handleToggleResource}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {error && (
          <div className="bg-red-50 border-b border-red-200 p-3 text-red-700 text-sm">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              Dismiss
            </button>
          </div>
        )}
        <ChatPanel
          messages={messages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          onClearChat={handleClearChat}
          hasResources={resources.some(r => r.status === 'ready')}
        />
      </div>
    </div>
  );
}

export default App;
