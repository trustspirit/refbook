import { useState } from 'react';
import { Resource } from '../types';
import { Plus, Trash2, RefreshCw, Link, Check, Loader2, AlertCircle, FileText } from 'lucide-react';

interface ResourcePanelProps {
  resources: Resource[];
  selectedResources: string[];
  onAdd: (url: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: (id: string) => Promise<void>;
  onToggle: (id: string) => void;
}

export default function ResourcePanel({
  resources,
  selectedResources,
  onAdd,
  onDelete,
  onRefresh,
  onToggle,
}: ResourcePanelProps) {
  const [url, setUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsAdding(true);
    try {
      await onAdd(url.trim());
      setUrl('');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRefresh = async (id: string) => {
    setRefreshingIds(prev => new Set(prev).add(id));
    try {
      await onRefresh(id);
    } finally {
      setRefreshingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingIds(prev => new Set(prev).add(id));
    try {
      await onDelete(id);
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const getStatusIcon = (resource: Resource) => {
    if (refreshingIds.has(resource.id) || resource.status === 'processing') {
      return <Loader2 className="w-4 h-4 text-accent-400 animate-spin" />;
    }
    switch (resource.status) {
      case 'ready':
        return <Check className="w-4 h-4 text-cyber-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Loader2 className="w-4 h-4 text-dark-500" />;
    }
  };

  const getStatusText = (resource: Resource) => {
    if (refreshingIds.has(resource.id)) {
      return 'Refreshing...';
    }
    switch (resource.status) {
      case 'ready':
        return 'Ready';
      case 'processing':
        return 'Processing...';
      case 'error':
        return 'Error';
      default:
        return 'Pending';
    }
  };

  const isResourceBusy = (resource: Resource) => {
    return refreshingIds.has(resource.id) || 
           deletingIds.has(resource.id) || 
           resource.status === 'processing';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* Add Resource Form */}
      <form onSubmit={handleSubmit} className="p-4 border-b border-dark-800/50 flex-shrink-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter URL..."
              className="w-full pl-10 pr-3 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-sm text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500/50 transition-all"
              disabled={isAdding}
            />
          </div>
          <button
            type="submit"
            disabled={isAdding || !url.trim()}
            className="px-3.5 py-2.5 bg-gradient-to-r from-accent-500 to-accent-600 text-white rounded-lg hover:from-accent-600 hover:to-accent-700 disabled:from-dark-700 disabled:to-dark-700 disabled:text-dark-500 disabled:cursor-not-allowed transition-all"
          >
            {isAdding ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>

      {/* Resource List */}
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {resources.length === 0 ? (
          <div className="text-center py-10 text-dark-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-dark-800 rounded-xl flex items-center justify-center border border-dark-700">
              <FileText className="w-8 h-8 text-dark-600" />
            </div>
            <p className="text-sm font-medium text-dark-400">No resources added yet</p>
            <p className="text-xs mt-1.5 text-dark-500">Add URLs to start chatting</p>
          </div>
        ) : (
          <div className="space-y-2">
            {resources.map((resource) => (
              <div
                key={resource.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  deletingIds.has(resource.id) ? 'opacity-50' : ''
                } ${
                  selectedResources.includes(resource.id)
                    ? 'border-accent-500/50 bg-accent-500/10'
                    : 'border-dark-700 bg-dark-900/50 hover:border-dark-600'
                } ${resource.status === 'ready' && !isResourceBusy(resource) ? 'cursor-pointer' : ''}`}
                onClick={() => resource.status === 'ready' && !isResourceBusy(resource) && onToggle(resource.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(resource)}
                      <span className="text-sm font-medium text-dark-100 truncate">
                        {resource.name}
                      </span>
                    </div>
                    <p className="text-xs text-dark-500 truncate mt-1.5 ml-6">{resource.url}</p>
                    <div className="flex items-center gap-2 mt-1.5 ml-6">
                      <span className={`text-xs font-medium ${
                        refreshingIds.has(resource.id) ? 'text-accent-400' :
                        resource.status === 'ready' ? 'text-cyber-400' :
                        resource.status === 'error' ? 'text-red-400' : 'text-accent-400'
                      }`}>
                        {getStatusText(resource)}
                      </span>
                      {resource.status === 'ready' && !refreshingIds.has(resource.id) && (
                        <span className="text-xs text-dark-500">
                          {resource.chunk_count} chunks
                        </span>
                      )}
                    </div>
                    {resource.error_message && (
                      <p className="text-xs text-red-400 mt-1.5 ml-6">{resource.error_message}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRefresh(resource.id);
                      }}
                      className={`p-1.5 rounded-lg transition-all ${
                        isResourceBusy(resource)
                          ? 'text-accent-500/50 cursor-not-allowed'
                          : 'text-dark-400 hover:text-accent-400 hover:bg-accent-500/10'
                      }`}
                      title="Refresh"
                      disabled={isResourceBusy(resource)}
                    >
                      <RefreshCw className={`w-4 h-4 ${
                        refreshingIds.has(resource.id) || resource.status === 'processing' 
                          ? 'animate-spin' 
                          : ''
                      }`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(resource.id);
                      }}
                      className={`p-1.5 rounded-lg transition-all ${
                        deletingIds.has(resource.id)
                          ? 'text-red-500/50 cursor-not-allowed'
                          : 'text-dark-400 hover:text-red-400 hover:bg-red-500/10'
                      }`}
                      title="Delete"
                      disabled={deletingIds.has(resource.id)}
                    >
                      {deletingIds.has(resource.id) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selection Info */}
      {resources.length > 0 && (
        <div className="p-3 border-t border-dark-800/50 bg-dark-900/30 flex-shrink-0">
          <p className="text-xs text-dark-500 text-center">
            {selectedResources.length === 0
              ? 'Click resources to filter chat'
              : `${selectedResources.length} resource${selectedResources.length > 1 ? 's' : ''} selected`}
          </p>
        </div>
      )}
    </div>
  );
}
