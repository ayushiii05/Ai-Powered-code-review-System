import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Send, Bot, User, Trash2, Copy, SearchCode, Bug, Zap, BookOpen, CheckCircle, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const QUICK_ACTIONS = [
  { label: 'Explain Entire Code', prompt: 'Please provide a detailed explanation of what this entire code does.', icon: SearchCode },
  { label: 'Explain Line by Line', prompt: 'Can you break this down and explain it to me line by line?', icon: SearchCode },
  { label: 'Improve Readability', prompt: 'How can I make this code cleaner and more readable?', icon: BookOpen },
  { label: 'Find Bugs', prompt: 'Can you find any bugs or edge cases in this code?', icon: Bug },
  { label: 'Find Security Issues', prompt: 'Are there any security vulnerabilities in this code?', icon: SearchCode },
  { label: 'Explain Time Complexity', prompt: 'What is the time and space complexity of this code?', icon: Clock },
  { label: 'Generate Comments', prompt: 'Please generate helpful inline comments for this code.', icon: CheckCircle },
  { label: 'Refactor Code', prompt: 'Please refactor this code to be more modular and maintainable.', icon: Zap },
  { label: 'Generate API Documentation', prompt: 'Generate API documentation for these functions.', icon: BookOpen },
];

const ChatAssistant = ({ reviewId, language, code, reviewResult }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (reviewId) {
      fetchChatHistory();
    } else {
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatHistory = async () => {
    try {
      const { data } = await api.get(`/review/chat/${reviewId}`);
      if (data.success && data.data.length > 0) {
        setMessages(data.data);
      } else {
        setMessages([{ role: 'assistant', content: 'Hello! I am your AI Code Assistant. Ask me anything about this code!' }]);
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
      const { data } = await api.post('/review/chat', {
        reviewId,
        language,
        code,
        review: reviewResult,
        message: messageText
      });

      if (data.success) {
        setMessages(prev => [...prev, data.data.aiResponse]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to get AI response');
      // Remove the user message if it failed
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
    if (!reviewId) {
      setMessages([{ role: 'assistant', content: 'Hello! I am your AI Code Assistant. Ask me anything about this code!' }]);
      return;
    }
    
    try {
      await api.delete(`/review/chat/${reviewId}`);
      setMessages([{ role: 'assistant', content: 'Hello! I am your AI Code Assistant. Ask me anything about this code!' }]);
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

  // Do not render chat if there's no code or review yet
  if (!code || !reviewResult) return null;

  const hasChat = messages.length > 1 || isLoading;

  return (
    <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col animate-fade-in">
      {/* Header */}
      {hasChat && (
        <div className="bg-gray-900 px-6 py-4 flex justify-between items-center border-b border-gray-800">
          <h2 className="text-lg font-bold text-white flex items-center">
            <Bot className="w-5 h-5 mr-2 text-purple-400" />
            AI Chat Assistant
          </h2>
          <button 
            onClick={handleClearChat}
            className="text-gray-400 hover:text-red-400 transition-colors flex items-center text-sm"
            title="Clear Conversation"
          >
            <Trash2 className="w-4 h-4 mr-1" /> Clear
          </button>
        </div>
      )}

      {/* Messages Area */}
      {hasChat && (
        <div className="max-h-[500px] overflow-y-auto p-6 bg-gray-50/50 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* Avatar */}
              <div className="flex-shrink-0 mx-3 mt-1">
                {msg.role === 'user' ? (
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center border border-purple-200">
                    <Bot className="w-5 h-5 text-purple-600" />
                  </div>
                )}
              </div>

              {/* Message Bubble */}
              <div className={`relative px-5 py-4 rounded-2xl shadow-sm group ${
                msg.role === 'user' 
                  ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-tr-sm' 
                  : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
              }`}>
                {msg.role === 'assistant' && (
                  <button 
                    onClick={() => copyToClipboard(msg.content)}
                    className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100 rounded-md"
                    title="Copy response"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
                
                <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                  <ReactMarkdown
                    components={{
                      code({node, inline, className, children, ...props}) {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                          <div className="relative group/code mt-4 mb-4">
                            <button
                              onClick={() => copyToClipboard(String(children).replace(/\n$/, ''))}
                              className="absolute top-2 right-2 p-1.5 bg-gray-800 text-gray-300 hover:text-white rounded-md opacity-0 group-hover/code:opacity-100 transition-opacity"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <SyntaxHighlighter
                              style={vscDarkPlus}
                              language={match[1]}
                              PreTag="div"
                              className="rounded-xl overflow-hidden"
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          </div>
                        ) : (
                          <code className={`${inline ? 'bg-gray-100/10 px-1.5 py-0.5 rounded font-mono text-sm' : ''} ${className}`} {...props}>
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
              <div className="flex-shrink-0 mx-3 mt-1">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center border border-purple-200">
                  <Bot className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="bg-white border border-gray-200 px-5 py-4 rounded-2xl rounded-tl-sm flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      )}

      {/* Input Area */}
      <div className={`bg-white p-4 ${hasChat ? 'border-t border-gray-200' : ''}`}>
        
        {/* Quick Actions */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-hide">
          {QUICK_ACTIONS.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                disabled={isLoading}
                onClick={() => handleSend(action.prompt)}
                className="flex-shrink-0 flex items-center px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-full text-xs font-medium transition-colors border border-purple-100 disabled:opacity-50"
              >
                <Icon className="w-3.5 h-3.5 mr-1.5" />
                {action.label}
              </button>
            );
          })}
        </div>

        {/* Textbox */}
        <div className="flex items-end gap-3 bg-gray-50 p-2 rounded-xl border border-gray-200 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI a question... (Shift+Enter for new line)"
            className="flex-1 max-h-32 min-h-[44px] bg-transparent resize-none outline-none px-2 py-2 text-sm text-gray-700 placeholder-gray-400"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;
