'use client';

import { useState } from 'react';
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
    'Can Four Dogs A still win the title?',
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
      if (result.suggestedFollowUps?.length) {
        setSuggestions(result.suggestedFollowUps);
      }
    } else {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I couldn\'t process that question. Make sure GEMINI_API_KEY is configured.',
        },
      ]);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-3 shadow-lg transition z-50"
        title="Ask AI about the league"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 md:w-96 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 flex flex-col max-h-[500px]">
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <h3 className="text-sm font-medium text-purple-400 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Ask AI
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white text-lg"
        >
          &times;
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px]">
        {messages.length === 0 && (
          <p className="text-xs text-gray-500 text-center mt-4">
            Ask me anything about the Wrexham &amp; District Pool League
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={
              'text-sm rounded-lg p-2 ' +
              (msg.role === 'user'
                ? 'bg-blue-900/30 text-blue-200 ml-8'
                : 'bg-gray-700 text-gray-300 mr-8')
            }
          >
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-400 mr-8">
            <div className="animate-spin w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full" />
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
              className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-full px-2 py-1 transition"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={e => {
          e.preventDefault();
          handleSubmit(input);
        }}
        className="p-3 border-t border-gray-700"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={isLoading}
            className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-3 py-2 rounded-lg text-sm transition"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
