import { useState } from 'react';
import { ShareSession } from '../types';
import { createShare } from '../api';
import { X, Link2, Copy, Check, Loader2, ExternalLink } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  resourceCount: number;
}

export default function ShareModal({ isOpen, onClose, projectId, projectName, resourceCount }: ShareModalProps) {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [shareResult, setShareResult] = useState<ShareSession | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const result = await createShare(projectId, name || undefined);
      setShareResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create share link');
    } finally {
      setIsCreating(false);
    }
  };

  const getShareUrl = () => {
    if (!shareResult) return '';
    return `${window.location.origin}/s/${shareResult.id}`;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getShareUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setName('');
    setShareResult(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-dark-900 border border-dark-700 rounded-2xl shadow-soft max-w-md w-full mx-4 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-cyber-500 rounded-xl flex items-center justify-center shadow-glow">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-white">Share Project</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {!shareResult ? (
            <>
              <p className="text-sm text-dark-300 mb-5 leading-relaxed">
                Create a public link to share <strong className="text-white">"{projectName}"</strong>. Anyone with the link can ask questions about your {resourceCount} resource{resourceCount !== 1 ? 's' : ''}.
              </p>

              {/* Name input */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-dark-200 mb-2">
                  Custom name (optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={projectName}
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500/50 transition-all"
                />
              </div>

              {error && (
                <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Create button */}
              <button
                onClick={handleCreate}
                disabled={isCreating || resourceCount === 0}
                className="w-full py-3 bg-gradient-to-r from-accent-500 to-accent-600 text-white rounded-xl hover:from-accent-600 hover:to-accent-700 disabled:from-dark-700 disabled:to-dark-700 disabled:text-dark-500 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-glow hover:shadow-glow-lg"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    Create Share Link
                  </>
                )}
              </button>

              {resourceCount === 0 && (
                <p className="mt-3 text-xs text-amber-400 text-center">
                  Add some resources first to create a share link.
                </p>
              )}
            </>
          ) : (
            <>
              <div className="text-center mb-5">
                <div className="w-14 h-14 bg-gradient-to-br from-cyber-400 to-cyber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow-cyan">
                  <Check className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">Link Created!</h3>
                <p className="text-sm text-dark-400 mt-1.5">
                  Share this link with anyone to let them chat with your resources.
                </p>
              </div>

              {/* Share URL */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-dark-200 mb-2">
                  Share URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={getShareUrl()}
                    readOnly
                    className="flex-1 px-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-sm text-dark-300"
                  />
                  <button
                    onClick={handleCopy}
                    className="px-4 py-3 bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-xl transition-all flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-cyber-400" />
                        <span className="text-sm font-medium text-cyber-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-dark-300" />
                        <span className="text-sm font-medium text-dark-300">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 bg-accent-500/10 border border-accent-500/20 rounded-xl mb-5">
                <p className="text-xs text-accent-300 leading-relaxed">
                  <strong>Note:</strong> This link shares access to {shareResult.resource_count} resource{shareResult.resource_count !== 1 ? 's' : ''} in this project. 
                  Users can chat but cannot add, edit, or delete resources.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 py-3 border border-dark-700 text-dark-200 rounded-xl hover:bg-dark-800 transition-all font-medium"
                >
                  Close
                </button>
                <a
                  href={getShareUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 bg-gradient-to-r from-accent-500 to-accent-600 text-white rounded-xl hover:from-accent-600 hover:to-accent-700 transition-all flex items-center justify-center gap-2 font-medium shadow-glow"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Link
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
