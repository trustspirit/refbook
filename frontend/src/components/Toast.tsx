import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const styles = {
  success: 'bg-cyber-500/10 border-cyber-500/30 text-cyber-300',
  error: 'bg-red-500/10 border-red-500/30 text-red-300',
  warning: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
  info: 'bg-accent-500/10 border-accent-500/30 text-accent-300',
};

const iconStyles = {
  success: 'text-cyber-400',
  error: 'text-red-400',
  warning: 'text-amber-400',
  info: 'text-accent-400',
};

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: () => void }) {
  const Icon = icons[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onRemove]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border backdrop-blur-md shadow-soft animate-slide-in ${styles[toast.type]}`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${iconStyles[toast.type]}`} />
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button
        onClick={onRemove}
        className="p-1 hover:bg-white/5 rounded-lg transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function Toast({ toasts, onRemove }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => onRemove(toast.id)} />
      ))}
    </div>
  );
}
