import { useState } from 'react';
import { Resource } from '../types';
import { Plus, Trash2, RefreshCw, Link, Check, Loader2, AlertCircle, FileText } from 'lucide-react';

interface ResourcePanelProps {
  resources: Resource[];
  selectedResources: string[];
  onAdd: (url: string) => void;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsAdding(true);
    await onAdd(url.trim());
    setUrl('');
    setIsAdding(false);
  };

  const getStatusIcon = (status: Resource['status']) => {
    switch (status) {
      case 'ready':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Loader2 className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: Resource['status']) => {
    switch (status) {
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Add Resource Form */}
      <form onSubmit={handleSubmit} className="p-4 border-b border-gray-200">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter URL..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isAdding}
            />
          </div>
          <button
            type="submit"
            disabled={isAdding || !url.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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
      <div className="flex-1 overflow-y-auto p-2">
        {resources.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No resources added yet</p>
            <p className="text-xs mt-1">Add URLs to start chatting</p>
          </div>
        ) : (
          <div className="space-y-2">
            {resources.map((resource) => (
              <div
                key={resource.id}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  selectedResources.includes(resource.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                onClick={() => resource.status === 'ready' && onToggle(resource.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(resource.status)}
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {resource.name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-1">{resource.url}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs ${
                        resource.status === 'ready' ? 'text-green-600' :
                        resource.status === 'error' ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {getStatusText(resource.status)}
                      </span>
                      {resource.status === 'ready' && (
                        <span className="text-xs text-gray-400">
                          {resource.chunk_count} chunks
                        </span>
                      )}
                    </div>
                    {resource.error_message && (
                      <p className="text-xs text-red-500 mt-1">{resource.error_message}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRefresh(resource.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Refresh"
                      disabled={resource.status === 'processing'}
                    >
                      <RefreshCw className={`w-4 h-4 ${resource.status === 'processing' ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(resource.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
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
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            {selectedResources.length === 0
              ? 'Click resources to filter chat (all selected by default)'
              : `${selectedResources.length} resource${selectedResources.length > 1 ? 's' : ''} selected`}
          </p>
        </div>
      )}
    </div>
  );
}
