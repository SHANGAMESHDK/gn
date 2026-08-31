import { useState } from 'react';
import { Bot, Send, X, MessageSquare } from 'lucide-react';
import { apiClient } from '../../api/axios';

export function GeminiAssistant({ locationContext }: { locationContext?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const res = await apiClient.post('/ai/chat', {
        message: userMessage,
        locationContext: locationContext || "Unknown"
      });
      setMessages(prev => [...prev, { role: 'assistant', text: res.data.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I'm having trouble connecting to my servers right now." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 p-4 bg-gradient-to-br from-[#7B1113] to-[#5a0c0e] text-[#C8A951] rounded-full shadow-lg shadow-[#7B1113]/30 hover:shadow-[#7B1113]/50 hover:scale-105 transition-all z-[900] group border border-[#C8A951]/20"
        >
          <MessageSquare size={24} />
          <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#2d2019] text-[#f0e8dc] text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-[#C8A951]/20 font-medium">
            Ask Radhimaa
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[350px] h-[500px] bg-white/95 dark:bg-[#110810]/95 backdrop-blur-md rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[#C8A951]/20 z-[1000] animate-fade-in-up">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#7B1113] to-[#5a0c0e] text-white p-4 flex items-center justify-between border-b border-[#C8A951]/20">
            <div className="flex items-center gap-2">
              <Bot size={20} className="text-[#C8A951]" />
              <span className="font-bold tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>Radhimaa AI</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded-lg transition-colors text-white/80 hover:text-white">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-[#8a7a6a] dark:text-[#b0a090] mt-4 text-sm font-medium">
                Hi! Ask me anything about the campus, stalls, or how to get around.
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-[13px] font-medium shadow-sm ${msg.role === 'user'
                    ? 'bg-gradient-to-br from-[#7B1113] to-[#6a0e10] text-white rounded-tr-none'
                    : 'bg-[#f0e8dc] dark:bg-[#2d2019] text-[#2d2019] dark:text-[#f0e8dc] rounded-tl-none border border-[#C8A951]/10'
                  }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#f0e8dc] dark:bg-[#2d2019] p-3 rounded-2xl rounded-tl-none border border-[#C8A951]/10">
                  <div className="flex gap-1.5 px-1">
                    <div className="w-1.5 h-1.5 bg-[#7B1113]/50 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-[#7B1113]/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1.5 h-1.5 bg-[#7B1113]/50 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 bg-white/50 dark:bg-[#1a1018]/50 border-t border-[#C8A951]/20 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask a question..."
              className="flex-1 bg-[#f8f5f0] dark:bg-[#2d2019] px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#C8A951] dark:text-[#f0e8dc] border border-[#C8A951]/20 placeholder-[#8a7a6a] dark:placeholder-[#5a4a3a]"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="p-2.5 bg-gradient-to-br from-[#7B1113] to-[#5a0c0e] text-[#C8A951] rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-sm"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
