import { useState, useRef, useEffect } from 'react';
import { ChatMessage, Source } from '../types';
import { Send, Trash2, Loader2, Bot, User, ExternalLink, FileText, ChevronDown, ChevronUp, Sparkles, Copy, Check, Quote, Link2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onClearChat: () => void;
  hasResources: boolean;
}

// 코드 블록 컴포넌트
function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-dark-700 bg-dark-950">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-dark-900 border-b border-dark-700">
        <span className="text-xs font-medium text-dark-400 uppercase tracking-wider">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-dark-400 hover:text-white hover:bg-dark-700 rounded-md transition-all"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-cyber-400" />
              <span className="text-cyber-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* 코드 */}
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language || 'text'}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: '#0f0f1a',
          fontSize: '0.875rem',
          lineHeight: '1.6',
        }}
      >
        {children.trim()}
      </SyntaxHighlighter>
    </div>
  );
}

// 인라인 코드 컴포넌트
function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 bg-accent-500/20 text-accent-300 rounded font-mono text-sm border border-accent-500/30">
      {children}
    </code>
  );
}

// 인용문 컴포넌트
function BlockQuote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="my-4 pl-4 border-l-2 border-accent-500 bg-accent-500/5 py-3 pr-4 rounded-r-lg">
      <div className="flex gap-3">
        <Quote className="w-4 h-4 text-accent-400 flex-shrink-0 mt-1" />
        <div className="text-dark-200 italic">{children}</div>
      </div>
    </blockquote>
  );
}

// URL을 링크로 변환하는 함수
function linkifyText(text: string): React.ReactNode {
  const urlPattern = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
  const parts = text.split(urlPattern);
  
  return parts.map((part, index) => {
    if (part.match(urlPattern)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyber-400 hover:text-cyber-300 underline decoration-cyber-400/50 hover:decoration-cyber-300 underline-offset-2 inline-flex items-center gap-1 break-all"
        >
          {part}
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
        </a>
      );
    }
    return part;
  });
}

// 출처 라인 포맷터
function formatSourceLine(text: string): React.ReactNode {
  const sourcePattern = /^(출처|Source|참고|Reference|Ref)\s*[:：]\s*(.+)$/i;
  const match = text.match(sourcePattern);
  
  if (match) {
    const [, label, content] = match;
    return (
      <div className="flex items-start gap-3 my-3 p-4 bg-cyber-500/10 border border-cyber-500/30 rounded-xl hover:bg-cyber-500/15 transition-colors">
        <Link2 className="w-4 h-4 text-cyber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-cyber-400 uppercase tracking-wider">{label}</span>
          <div className="text-sm text-dark-200 mt-1 break-words">
            {linkifyText(content)}
          </div>
        </div>
      </div>
    );
  }
  
  return text;
}

// Markdown 렌더러 컴포넌트
function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match && !className;
          
          if (isInline) {
            return <InlineCode>{children}</InlineCode>;
          }
          
          return (
            <CodeBlock language={match ? match[1] : ''}>
              {String(children).replace(/\n$/, '')}
            </CodeBlock>
          );
        },
        blockquote({ children }) {
          return <BlockQuote>{children}</BlockQuote>;
        },
        p({ children }) {
          if (typeof children === 'string') {
            const formatted = formatSourceLine(children);
            if (formatted !== children) {
              return <>{formatted}</>;
            }
          }
          
          if (Array.isArray(children)) {
            const firstChild = children[0];
            if (typeof firstChild === 'string') {
              const formatted = formatSourceLine(firstChild);
              if (formatted !== firstChild) {
                return <>{formatted}</>;
              }
            }
          }
          
          return <p className="my-2.5 leading-relaxed text-dark-200">{children}</p>;
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-400 hover:text-accent-300 underline decoration-accent-400/50 hover:decoration-accent-300 underline-offset-2 transition-colors inline-flex items-center gap-1"
            >
              {children}
              <ExternalLink className="w-3 h-3" />
            </a>
          );
        },
        ul({ children }) {
          return <ul className="my-3 ml-4 space-y-1.5 list-disc list-outside marker:text-accent-400">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="my-3 ml-4 space-y-1.5 list-decimal list-outside marker:text-accent-400 marker:font-semibold">{children}</ol>;
        },
        li({ children }) {
          return <li className="text-dark-200 pl-1.5">{children}</li>;
        },
        h1({ children }) {
          return <h1 className="text-xl font-bold text-white mt-5 mb-3 pb-2 border-b border-dark-700">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-lg font-bold text-white mt-5 mb-2">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-base font-semibold text-dark-100 mt-4 mb-2">{children}</h3>;
        },
        strong({ children }) {
          return <strong className="font-semibold text-white">{children}</strong>;
        },
        em({ children }) {
          return <em className="italic text-dark-200">{children}</em>;
        },
        table({ children }) {
          return (
            <div className="my-4 overflow-x-auto rounded-xl border border-dark-700">
              <table className="min-w-full divide-y divide-dark-700">{children}</table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="bg-dark-800">{children}</thead>;
        },
        th({ children }) {
          return <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">{children}</th>;
        },
        td({ children }) {
          return <td className="px-4 py-3 text-sm text-dark-300 border-t border-dark-800">{children}</td>;
        },
        hr() {
          return <hr className="my-6 border-dark-700" />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function SourceCard({ source, index }: { source: Source; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getDomain = (url: string) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return url;
    }
  };

  const getRelevancePercent = (score: number) => {
    const relevance = Math.max(0, Math.min(100, score * 100));
    return Math.round(relevance);
  };

  const relevance = getRelevancePercent(source.score);
  
  const getRelevanceColor = (percent: number) => {
    if (percent >= 70) return { bg: 'bg-cyber-500', text: 'text-cyber-400', light: 'bg-cyber-500/10 border-cyber-500/30' };
    if (percent >= 50) return { bg: 'bg-accent-500', text: 'text-accent-400', light: 'bg-accent-500/10 border-accent-500/30' };
    return { bg: 'bg-dark-500', text: 'text-dark-400', light: 'bg-dark-700/50 border-dark-600' };
  };

  const colors = getRelevanceColor(relevance);

  return (
    <div className="group border border-dark-700 rounded-xl overflow-hidden hover:border-accent-500/50 transition-all duration-200 bg-dark-900/50">
      <div 
        className="flex items-center gap-3 p-3.5 cursor-pointer hover:bg-dark-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-accent-500 to-cyber-500 text-white rounded-lg flex items-center justify-center text-xs font-semibold">
          {index + 1}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-dark-400 flex-shrink-0" />
            <span className="text-sm font-medium text-dark-100 truncate">
              {getDomain(source.url)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className={`px-2.5 py-1 rounded-full text-xs font-medium border ${colors.light} ${colors.text}`}>
            {relevance}% match
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-dark-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-dark-400" />
          )}
        </div>
      </div>

      <div className="h-1 bg-dark-800">
        <div 
          className={`h-full ${colors.bg} transition-all duration-500`}
          style={{ width: `${relevance}%` }}
        />
      </div>

      {isExpanded && (
        <div className="p-4 bg-dark-800/50 border-t border-dark-700 animate-fade-in">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-accent-400 hover:text-accent-300 hover:underline mb-3"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="truncate max-w-[300px]">{source.url}</span>
          </a>
          
          <div className="p-4 bg-dark-900 rounded-xl border border-dark-700">
            <p className="text-xs text-dark-400 font-medium mb-2 uppercase tracking-wider">
              Matched Content
            </p>
            <p className="text-sm text-dark-200 leading-relaxed whitespace-pre-wrap">
              {source.content}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SourcesSection({ sources }: { sources: Source[] }) {
  const [showAll, setShowAll] = useState(false);
  const displaySources = showAll ? sources : sources.slice(0, 2);
  const hasMore = sources.length > 2;

  return (
    <div className="mt-5 pt-5 border-t border-dark-700">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-accent-500/10 to-cyber-500/10 rounded-full border border-accent-500/20">
          <Sparkles className="w-3.5 h-3.5 text-accent-400" />
          <span className="text-xs font-semibold text-accent-300">
            {sources.length} Source{sources.length !== 1 ? 's' : ''} Referenced
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {displaySources.map((source, idx) => (
          <SourceCard key={idx} source={source} index={idx} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 w-full py-2.5 text-xs font-medium text-dark-300 hover:text-white hover:bg-dark-800 rounded-xl transition-all flex items-center justify-center gap-1.5 border border-dark-700 hover:border-dark-600"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show {sources.length - 2} more source{sources.length - 2 !== 1 ? 's' : ''}
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default function ChatPanel({
  messages,
  isLoading,
  onSendMessage,
  onClearChat,
  hasResources,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-dark-950">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-dark-800/50 glass">
        <h2 className="text-lg font-semibold text-white">Chat</h2>
        {messages.length > 0 && (
          <button
            onClick={onClearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-dark-400 animate-fade-in">
            <div className="w-24 h-24 mb-6 bg-gradient-to-br from-accent-500/20 to-cyber-500/20 rounded-3xl flex items-center justify-center border border-accent-500/20">
              <Bot className="w-12 h-12 text-accent-400" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-3">Start a Conversation</h3>
            <p className="text-sm text-center max-w-md text-dark-400 leading-relaxed">
              {hasResources
                ? 'Ask me anything about your added resources. I\'ll answer based only on the content from your URLs.'
                : 'Add some URLs in the sidebar to get started. I\'ll help you explore and understand the content.'}
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-accent-500 to-cyber-500 rounded-xl flex items-center justify-center shadow-glow">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              <div
                className={`max-w-[75%] ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-accent-600 to-accent-700 text-white rounded-2xl rounded-tr-md px-5 py-4'
                    : 'bg-dark-900 border border-dark-700 rounded-2xl rounded-tl-md px-6 py-5'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="text-sm">
                    <MarkdownRenderer content={message.content} />
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                )}
                
                {message.sources && message.sources.length > 0 && (
                  <SourcesSection sources={message.sources} />
                )}
              </div>
              {message.role === 'user' && (
                <div className="flex-shrink-0 w-10 h-10 bg-dark-700 rounded-xl flex items-center justify-center border border-dark-600">
                  <User className="w-5 h-5 text-dark-300" />
                </div>
              )}
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-4 justify-start animate-fade-in">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-accent-500 to-cyber-500 rounded-xl flex items-center justify-center shadow-glow animate-pulse-slow">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-dark-900 border border-dark-700 rounded-2xl rounded-tl-md px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-accent-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-accent-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-accent-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm text-dark-400">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-5 border-t border-dark-800/50 glass">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasResources ? "Ask about your resources..." : "Add resources to start chatting..."}
              disabled={!hasResources || isLoading}
              rows={1}
              className="w-full px-5 py-3.5 bg-dark-900 border border-dark-700 rounded-xl resize-none text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500/50 disabled:bg-dark-800 disabled:cursor-not-allowed transition-all"
              style={{ minHeight: '52px', maxHeight: '120px' }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || !hasResources || isLoading}
            className="px-5 py-3.5 bg-gradient-to-r from-accent-500 to-accent-600 text-white rounded-xl hover:from-accent-600 hover:to-accent-700 disabled:from-dark-700 disabled:to-dark-700 disabled:text-dark-500 disabled:cursor-not-allowed transition-all shadow-glow hover:shadow-glow-lg"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
        <p className="text-xs text-dark-500 mt-3 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
