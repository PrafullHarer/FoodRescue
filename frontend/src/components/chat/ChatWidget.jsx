import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, 
  MessageSquare, 
  Send, 
  ThumbsUp, 
  ThumbsDown, 
  Trash2, 
  X, 
  Minimize2, 
  Sparkles, 
  ArrowUpRight 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';

export default function ChatWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState({});

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const initialGreeting = user
    ? `Hello **${user.full_name || 'Friend'}**! 👋 I am your FoodRescue AI Assistant. You are logged in as a verified **${user.role?.toUpperCase()}**.\n\nHow can I help you today with surplus food donations, claims, deliveries, or platform navigation?`
    : `Hello! 👋 Welcome to **FoodRescue**. I am your platform AI assistant.\n\nI can help you learn how to donate surplus food, claim meals for community shelters, deliver as a volunteer courier, or find any feature on the website!`;

  const [messages, setMessages] = useState([
    {
      id: 'init_welcome',
      sender: 'bot',
      text: initialGreeting,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Suggested starter prompts based on user role
  const getStarters = () => {
    if (!user) {
      return [
        { label: '🍲 How do I donate food?', query: 'How do I donate food?' },
        { label: '🤝 How do NGOs claim food?', query: 'How do NGOs claim surplus food?' },
        { label: '📄 Where is the receipt option?', query: 'Where is the receipt option?' },
        { label: '📞 Contact Support', query: 'How do I contact support?' }
      ];
    }
    if (user.role === 'provider') {
      return [
        { label: '🍲 How do I post a donation?', query: 'How do I donate food?' },
        { label: '📄 Download Tax Receipt', query: 'Where can I download my receipt?' },
        { label: '📦 Status of my last donation', query: 'What is the status of my last donation?' },
        { label: '📞 Contact Support', query: 'How do I contact support?' }
      ];
    }
    if (user.role === 'ngo') {
      return [
        { label: '🤝 How do I claim food?', query: 'How do NGOs claim surplus food?' },
        { label: '📄 Where is the receipt option?', query: 'Where is the receipt option?' },
        { label: '📦 Status of my last donation', query: 'What is the status of my last donation?' },
        { label: '📞 Contact Support', query: 'How do I contact support?' }
      ];
    }
    if (user.role === 'volunteer') {
      return [
        { label: '🚴 How to accept missions?', query: 'How do volunteer rescue missions work?' },
        { label: '📱 How to scan QR codes?', query: 'Where do I find QR code scanning?' },
        { label: '📦 My deliveries', query: 'Where do I find my deliveries?' },
        { label: '📞 Contact Support', query: 'How do I contact support?' }
      ];
    }
    return [
      { label: '🗺️ Donation Hotspots', query: 'Where can I find donation hotspots?' },
      { label: '⚠️ Incident Monitoring', query: 'Where can I review incidents?' },
      { label: '📄 Where is the receipt option?', query: 'Where is the receipt option?' },
      { label: '📞 Contact Support', query: 'How do I contact support?' }
    ];
  };

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build lightweight conversation history for context
      const history = messages.slice(-8).map((m) => ({
        sender: m.sender,
        text: m.text
      }));

      const res = await api.post('/chat/message', {
        message: text,
        history
      });

      const botReply = res.data?.reply || "I'm sorry, I couldn't process that response. Please try again or visit [Contact Support](/contact).";

      const botMsg = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: botReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errMsg = {
        id: `bot_err_${Date.now()}`,
        sender: 'bot',
        text: "I encountered a network difficulty reaching the server. Please check your connection or contact our team at [Contact Support](/contact).",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (messageId, rating) => {
    if (feedbackGiven[messageId]) return;
    setFeedbackGiven((prev) => ({ ...prev, [messageId]: rating }));

    try {
      await api.post('/chat/feedback', {
        messageId,
        feedback: rating
      });
    } catch (err) {
      console.warn('Feedback submission error:', err.message);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: `init_clear_${Date.now()}`,
        sender: 'bot',
        text: initialGreeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setFeedbackGiven({});
  };

  // Helper to parse markdown links and bold formatting into interactive elements
  const renderFormattedText = (rawText) => {
    if (!rawText) return null;

    // Split text by lines
    const lines = rawText.split('\n');

    return lines.map((line, lineIdx) => {
      // Handle list items
      const isListItem = /^\s*[-*]\s+/.test(line);
      const isNumbered = /^\s*\d+\.\s+/.test(line);

      // Parse markdown links: [Text](URL)
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = linkRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        const linkText = match[1];
        const linkUrl = match[2];

        parts.push(
          <button
            key={`link_${lineIdx}_${match.index}`}
            onClick={() => {
              if (linkUrl.startsWith('/')) {
                navigate(linkUrl);
              } else if (linkUrl.startsWith('http')) {
                window.open(linkUrl, '_blank', 'noopener,noreferrer');
              } else if (linkUrl.startsWith('mailto:')) {
                window.location.href = linkUrl;
              }
            }}
            className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-lime-400 font-semibold underline underline-offset-2 hover:text-emerald-700 dark:hover:text-lime-300 transition-colors mx-0.5 cursor-pointer"
          >
            {linkText}
            <ArrowUpRight className="w-3 h-3 inline" />
          </button>
        );
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      // Process bold formatting **bold**
      const formattedParts = parts.map((part, pIdx) => {
        if (typeof part !== 'string') return part;
        const boldRegex = /\*\*([^*]+)\*\*/g;
        const subParts = [];
        let subLast = 0;
        let bMatch;

        while ((bMatch = boldRegex.exec(part)) !== null) {
          if (bMatch.index > subLast) {
            subParts.push(part.substring(subLast, bMatch.index));
          }
          subParts.push(
            <strong key={`b_${lineIdx}_${pIdx}_${bMatch.index}`} className="font-semibold text-gray-900 dark:text-gray-100">
              {bMatch[1]}
            </strong>
          );
          subLast = bMatch.index + bMatch[0].length;
        }
        if (subLast < part.length) {
          subParts.push(part.substring(subLast));
        }
        return subParts;
      });

      return (
        <div 
          key={`line_${lineIdx}`} 
          className={`leading-relaxed text-sm ${isListItem || isNumbered ? 'pl-2 my-0.5' : 'my-1'} ${line.startsWith('###') ? 'font-bold text-base text-gray-900 dark:text-white mt-2 mb-1' : ''}`}
        >
          {formattedParts}
        </div>
      );
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans print:hidden">
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          aria-label="Open FoodRescue AI Assistant"
          className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-600 to-lime-600 hover:from-emerald-500 hover:to-lime-500 text-white rounded-full shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/50 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
        >
          <div className="relative">
            <Bot className="w-6 h-6 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-lime-300 rounded-full border-2 border-emerald-700" />
          </div>
          <span className="font-semibold text-sm tracking-wide hidden sm:inline">
            FoodRescue AI
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-800/60 text-lime-200 border border-lime-400/30">
            Online
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`flex flex-col bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden ${
            isMinimized
              ? 'w-72 h-14'
              : 'w-[92vw] sm:w-[410px] h-[580px] max-h-[85vh]'
          }`}
          role="region"
          aria-label="FoodRescue AI Chat Assistant"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-700 via-emerald-800 to-neutral-900 text-white border-b border-emerald-600/30 select-none">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600/60 border border-emerald-400/40">
                <Bot className="w-4 h-4 text-lime-300" />
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-lime-400 rounded-full ring-2 ring-emerald-900" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
                  FoodRescue AI
                  <Sparkles className="w-3.5 h-3.5 text-lime-400" />
                </h3>
                <p className="text-[11px] text-emerald-200/90 font-medium">
                  {user ? `Role: ${user.role?.toUpperCase()}` : 'Guest Visitor'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Clear Chat */}
              {!isMinimized && (
                <button
                  onClick={clearChat}
                  title="Clear conversation"
                  aria-label="Clear conversation"
                  className="p-1.5 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {/* Minimize / Expand */}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expand' : 'Minimize'}
                aria-label={isMinimized ? 'Expand chat' : 'Minimize chat'}
                className="p-1.5 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <Minimize2 className="w-4 h-4" />
              </button>

              {/* Close */}
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                aria-label="Close chat"
                className="p-1.5 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body (when expanded) */}
          {!isMinimized && (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 dark:bg-neutral-950/40 text-gray-800 dark:text-gray-200">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        msg.sender === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-none'
                          : 'bg-white dark:bg-neutral-800/90 border border-gray-200/80 dark:border-neutral-700/60 text-gray-800 dark:text-gray-100 rounded-bl-none'
                      }`}
                    >
                      {renderFormattedText(msg.text)}

                      {/* Bot Message Feedback & Timestamp */}
                      <div className="flex items-center justify-between gap-3 mt-1.5 pt-1 border-t border-black/5 dark:border-white/5 text-[10px] text-gray-500 dark:text-gray-400">
                        <span>{msg.timestamp}</span>

                        {msg.sender === 'bot' && msg.id !== 'init_welcome' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleFeedback(msg.id, 'up')}
                              aria-label="Thumbs up"
                              title="Helpful"
                              className={`p-1 rounded transition-colors cursor-pointer ${
                                feedbackGiven[msg.id] === 'up'
                                  ? 'text-emerald-600 dark:text-lime-400 bg-emerald-50 dark:bg-emerald-950/40'
                                  : 'hover:text-gray-700 dark:hover:text-gray-200'
                              }`}
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleFeedback(msg.id, 'down')}
                              aria-label="Thumbs down"
                              title="Not helpful"
                              className={`p-1 rounded transition-colors cursor-pointer ${
                                feedbackGiven[msg.id] === 'down'
                                  ? 'text-red-500 bg-red-50 dark:bg-red-950/40'
                                  : 'hover:text-gray-700 dark:hover:text-gray-200'
                              }`}
                            >
                              <ThumbsDown className="w-3 h-3" />
                            </button>
                            {feedbackGiven[msg.id] && (
                              <span className="text-[10px] text-emerald-600 dark:text-lime-400 font-medium ml-0.5">
                                Thanks!
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loading Typing Indicator */}
                {isLoading && (
                  <div className="flex items-start gap-2">
                    <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Starters (Only when conversation is short) */}
              {messages.length <= 2 && (
                <div className="px-3 py-2 bg-gray-100/70 dark:bg-neutral-900 border-t border-gray-200/60 dark:border-neutral-800 flex flex-wrap gap-1.5">
                  {getStarters().map((st, idx) => (
                    <button
                      key={`st_${idx}`}
                      onClick={() => handleSendMessage(st.query)}
                      className="px-2.5 py-1 text-xs rounded-full bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 hover:border-emerald-500 dark:hover:border-lime-500 hover:text-emerald-600 dark:hover:text-lime-300 text-gray-700 dark:text-gray-300 transition-colors shadow-xs cursor-pointer"
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <div className="p-3 bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-800">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask about donations, receipts, routes..."
                    maxLength={1000}
                    disabled={isLoading}
                    aria-label="Ask FoodRescue AI"
                    className="flex-1 px-3.5 py-2 text-sm bg-gray-50 dark:bg-neutral-800/90 border border-gray-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-lime-500/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading}
                    aria-label="Send message"
                    className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-lime-600 hover:from-emerald-500 hover:to-lime-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-sm transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
                <div className="flex justify-between items-center px-1 mt-1.5 text-[10px] text-gray-400 dark:text-gray-500">
                  <span>Scope: FoodRescue platform guidance only</span>
                  <span>{inputMessage.length}/1000</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
