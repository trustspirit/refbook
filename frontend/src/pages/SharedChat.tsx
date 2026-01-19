import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChatMessage, ShareInfo } from '../types';
import { fetchShareInfo, sendShareMessage } from '../api';
import ChatPanel from '../components/ChatPanel';
import { Sparkles, AlertCircle, Loader2, FileText, ArrowLeft, FolderOpen } from 'lucide-react';

export default function SharedChat() {
  const { shareId } = useParams<{ shareId: string }>();
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (shareId) {
      loadShareInfo();
    }
  }, [shareId]);

  const loadShareInfo = async () => {
    try {
      setInitialLoading(true);
      const info = await fetchShareInfo(shareId!);
      setShareInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shared chat');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!shareId) return;

    const userMessage: ChatMessage = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendShareMessage(shareId, {
        message: content,
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

  if (initialLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-dark-950 bg-mesh">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 bg-gradient-to-br from-accent-500/20 to-cyber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-accent-500/20">
            <Loader2 className="w-8 h-8 animate-spin text-accent-400" />
          </div>
          <p className="text-dark-300 font-medium">Loading shared chat...</p>
        </div>
      </div>
    );
  }

  if (!shareInfo) {
    return (
      <div className="flex h-screen items-center justify-center bg-dark-950 bg-mesh">
        <div className="text-center max-w-md px-4 animate-fade-in">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-3">Share Link Not Found</h1>
          <p className="text-dark-400 mb-8 leading-relaxed">
            {error || 'This share link may have expired or been deleted.'}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-accent-500 to-accent-600 text-white rounded-xl hover:from-accent-600 hover:to-accent-700 transition-all shadow-glow"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-dark-950 bg-mesh">
      {/* Header */}
      <div className="flex-shrink-0 glass border-b border-dark-800/50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-cyber-500 rounded-xl flex items-center justify-center shadow-glow">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-white text-lg">{shareInfo.name}</h1>
              <div className="flex items-center gap-2 text-xs text-dark-400 mt-0.5">
                <FolderOpen className="w-3 h-3" />
                <span>{shareInfo.project_name}</span>
                <span className="text-dark-600">•</span>
                <span>{shareInfo.resources.length} resource{shareInfo.resources.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
          
          {/* Resources badge */}
          <div className="hidden sm:flex items-center gap-2">
            {shareInfo.resources.slice(0, 3).map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-800 rounded-full text-xs text-dark-300 border border-dark-700"
                title={r.url}
              >
                <FileText className="w-3 h-3" />
                <span className="max-w-[100px] truncate font-medium">{r.name}</span>
              </div>
            ))}
            {shareInfo.resources.length > 3 && (
              <div className="px-3 py-1.5 bg-accent-500/10 rounded-full text-xs text-accent-300 font-medium border border-accent-500/20">
                +{shareInfo.resources.length - 3} more
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex-shrink-0 bg-red-500/10 border-b border-red-500/20 p-3 text-red-400 text-sm text-center">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 text-red-400 hover:text-red-300 underline font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 min-h-0 max-w-4xl w-full mx-auto">
        <ChatPanel
          messages={messages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          onClearChat={handleClearChat}
          hasResources={shareInfo.resources.length > 0}
        />
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 glass border-t border-dark-800/50 py-3 px-4 text-center">
        <p className="text-xs text-dark-500">
          Powered by <span className="font-semibold text-gradient">RefBook</span>
        </p>
      </div>
    </div>
  );
}
