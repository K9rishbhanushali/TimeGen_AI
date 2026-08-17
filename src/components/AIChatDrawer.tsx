import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AIChatMessage } from '../types';
import { aiService } from '../services/api';

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({ isOpen, onClose, onRefreshData }) => {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome_1',
      sender: 'ai',
      text: 'Hello! I am TimeGen AI Assistant. Ask me about college resources, lab availability, teacher workload, conflict explanations, or natural-language scheduling suggestions!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const msgText = textToSend || input;
    if (!msgText.trim() || isLoading) return;

    const userMsg: AIChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: msgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const res = await aiService.chat(msgText, messages);
      const aiMsg: AIChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        proposedAction: res.proposedAction,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: AIChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'ai',
        text: `Sorry, I encountered an issue analyzing the request: ${(err as Error).message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const samplePrompts = [
    'Why does TYIT1 have two batches?',
    'Which labs are available Wednesday afternoon?',
    'How many hours does Prof. Sharma teach?',
    'Show TYIT1 timetable summary',
  ];

  return (
    <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-[#16191f] border-l border-gray-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-[#16191f]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
              TimeGen Assistant <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            </h2>
            <p className="text-[10px] text-gray-500">Gemini 3.6 Flash Intelligence</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`p-3 rounded-lg border text-xs leading-relaxed ${
              msg.sender === 'user'
                ? 'bg-gray-900 border-gray-800 text-gray-300'
                : 'bg-gray-800 border-gray-700 text-gray-200'
            }`}
          >
            <span
              className={`font-bold uppercase text-[9px] block mb-1 ${
                msg.sender === 'user' ? 'text-gray-500' : 'text-indigo-400'
              }`}
            >
              {msg.sender === 'user' ? 'You' : 'Assistant'}
            </span>
            <div className="whitespace-pre-wrap">{msg.text}</div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-2 text-xs text-indigo-400 bg-gray-800 p-3 rounded-lg border border-gray-700 w-fit">
            <Bot className="w-3.5 h-3.5 animate-bounce" />
            <span>Analyzing college timetable & database...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggested Prompts */}
      <div className="p-3 border-t border-gray-800 bg-[#16191f]">
        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 font-semibold">
          Suggested Queries:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              disabled={isLoading}
              className="text-[11px] bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 px-2 py-1 rounded text-left transition-colors cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800 bg-[#16191f]">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="relative"
        >
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about schedules..."
            className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 pl-3 pr-9 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1.5 text-gray-400 hover:text-white disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
