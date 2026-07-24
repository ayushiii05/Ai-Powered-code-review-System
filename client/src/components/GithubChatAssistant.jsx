import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Send, Bot, User, Trash2, Copy, SearchCode, FolderTree, BookOpen, Clock, Settings, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const QUICK_ACTIONS = [
  { label: 'Explain Architecture', prompt: 'Can you provide a detailed explanation of how this repository is architected?', icon: FolderTree },
  { label: 'Where is the database logic?', prompt: 'Where does the database connection and querying happen in this codebase?', icon: SearchCode },
  { label: 'How are routes handled?', prompt: 'How is routing handled in this repository?', icon: SearchCode },
  { label: 'Find Security Flaws', prompt: 'Are there any overarching security vulnerabilities across this project?', icon: Settings },
  { label: 'Explain Data Flow', prompt: 'Can you explain the data flow from the frontend to the backend?', icon: Clock },
  { label: 'How to deploy?', prompt: 'What would be the best way to deploy this specific project?', icon: Zap },
  { label: 'Generate API Docs', prompt: 'Generate an API documentation summary for the routes you see.', icon: BookOpen },
];

const GithubChatAssistant = ({ repositoryId, repository }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (repositoryId) {
      fetchChatHistory();
    } else {
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repositoryId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatHistory = async () => {
    try {
      const { data } = await api.get(`/github/chat/${repositoryId}`);
      if (data.success && data.data.length > 0) {
        setMessages(data.data);
      } else {
        setMessages([{ role: 'assistant', content: `Hello! I am your AI Repository Assistant. I've analyzed **${repository?.repositoryName || 'this repository'}**. Ask me anything about the architecture, files, or logic!` }]);
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
      toast.error('Failed to load chat history');
    }
  };

  const handleSend = async (messageText = input) => {
    if (!messageText.trim()) return;

    const userMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data } = await api.post(`/github/chat/${repositoryId}`, {
        message: messageText
      });

      if (data.success) {
        setMessages(prev => [...prev, data.data.aiResponse]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error.response?.data?.message || 'Failed to get AI response');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = async () => {
    if (!repositoryId) return;
    
    try {
      await api.delete(`/github/chat/${repositoryId}`);
      setMessages([{ role: 'assistant', content: `Hello! I am your AI Repository Assistant. I've analyzed **${repository?.repositoryName || 'this repository'}**. Ask me anything about the architecture, files, or logic!` }]);
      toast.success('Chat history cleared');
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast.error('Failed to clear chat');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const hasChat = messages.length > 1 || isLoading;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in">
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50 dark:bg-gray-900/30">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="flex-shrink-0 mx-2 mt-1">
                {msg.role === 'user' ? (
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center border border-purple-200 dark:border-purple-800">
                    <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                )}
              </div>
              <div className={`relative px-4 py-3 rounded-2xl shadow-sm group ${
                msg.role === 'user' 
                  ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-tr-sm' 
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm'
              }`}>
                {msg.role === 'assistant' && (
                  <button 
                    onClick={() => copyToClipboard(msg.content)}
                    className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100 dark:bg-gray-700 rounded-md"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
                
                <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : 'dark:prose-invert'} ${msg.role === 'assistant' ? 'text-[13px] leading-relaxed' : ''}`}>
                  <ReactMarkdown
                    components={{
                      code({node, inline, className, children, ...props}) {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                          <div className="relative group/code mt-2 mb-2">
                            <button
                              onClick={() => copyToClipboard(String(children).replace(/\n$/, ''))}
                              className="absolute top-2 right-2 p-1.5 bg-gray-800 text-gray-300 hover:text-white rounded-md opacity-0 group-hover/code:opacity-100 transition-opacity z-10"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <SyntaxHighlighter
                              style={vscDarkPlus}
                              language={match[1]}
                              PreTag="div"
                              className="rounded-lg overflow-hidden text-xs"
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          </div>
                        ) : (
                          <code className={`${inline ? 'bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono text-xs text-purple-600 dark:text-purple-400' : ''} ${className}`} {...props}>
                            {children}
                          </code>
                        )
                      }
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex flex-row max-w-[85%]">
              <div className="flex-shrink-0 mx-2 mt-1">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center border border-purple-200 dark:border-purple-800">
                  <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white dark:bg-gray-800 p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
          {QUICK_ACTIONS.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                disabled={isLoading}
                onClick={() => handleSend(action.prompt)}
                className="flex-shrink-0 flex items-center px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-full text-xs font-medium transition-colors border border-purple-100 dark:border-purple-900/50 disabled:opacity-50 whitespace-nowrap"
              >
                <Icon className="w-3 h-3 mr-1.5" />
                {action.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-end gap-2 bg-gray-50 dark:bg-gray-900 p-2 rounded-xl border border-gray-200 dark:border-gray-700 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 transition-all">
          <button 
            onClick={handleClearChat}
            disabled={!hasChat || isLoading}
            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI about this repository..."
            className="flex-1 max-h-32 min-h-[40px] bg-transparent resize-none outline-none px-2 py-2 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GithubChatAssistant;
