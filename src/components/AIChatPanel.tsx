'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Zap } from 'lucide-react';
import clsx from 'clsx';
import { useAI } from '@/hooks/use-ai';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChatPanel() {
  const { askQuestion, isLoading } = useAI();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([
    'Who has the best form in SD2?',
    'Which team is most likely to win the title?',
    'Which team has the best away record?',
  ]);

  const handleSubmit = async (question: string) => {
    if (!question.trim()) return;
    const userMsg: Message = { role: 'user', content: question.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSuggestions([]);

    const result = await askQuestion(question.trim());
    if (result) {
      setMessages(prev => [...prev, { role: 'assistant', content: result.answer }]);
      if (result.suggestedFollowUps?.length) setSuggestions(result.suggestedFollowUps);
    } else {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I couldn\'t process that. Check GEMINI_API_KEY is configured.' }]);
    }
  };

  if (!isOpen) {
    return (
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-accent hover:bg-accent-light text-white rounded-full p-3.5 shadow-elevated transition z-50"
        title="Ask AI"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageCircle size={22} />
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-4 right-4 w-80 md:w-96 bg-surface-card border border-surface-border rounded-card shadow-elevated z-50 flex flex-col max-h-[500px]"
      >
        <div className="flex items-center justify-between p-3 border-b border-surface-border">
          <h3 className="text-sm font-medium text-accent-light flex items-center gap-2">
            <Zap size={14} />
            Ask AI
          </h3>
          <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white transition p-1" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px]">
          {messages.length === 0 && (
            <p className="text-xs text-gray-600 text-center mt-4">
              Ask me anything about the Wrexham &amp; District Pool League
            </p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={clsx(
              'text-sm rounded-xl p-3',
              msg.role === 'user'
                ? 'bg-info-muted/30 text-info-light ml-8 rounded-br-sm'
                : 'bg-surface-elevated text-gray-300 mr-8 rounded-bl-sm'
            )}>
              {msg.content}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 mr-8">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              Thinking...
            </div>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSubmit(s)}
                disabled={isLoading}
                className="text-[11px] bg-surface hover:bg-surface-elevated text-gray-400 hover:text-white rounded-full px-2.5 py-1 transition border border-surface-border/30"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={e => { e.preventDefault(); handleSubmit(input); }} className="p-3 border-t border-surface-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask a question..."
              disabled={isLoading}
              className="flex-1 bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-baize min-h-[44px]"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={clsx(
                'px-3 py-2 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center',
                isLoading || !input.trim() ? 'bg-surface-elevated text-gray-600' : 'bg-accent hover:bg-accent-light text-white'
              )}
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  );
}
