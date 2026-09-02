import { useState } from 'react';
import { Bot, Send, X, MessageSquare, Camera } from 'lucide-react';
import { apiClient } from '../../api/axios';

export function GeminiAssistant({ locationContext }: { locationContext?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', text: string, image_url?: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const sendMessage = async () => {
    if (!input.trim() && !imageFile) return;

    const userMessage = input.trim();
    const currentImagePreview = imagePreview; // Capture before clearing
    
    setMessages(prev => [...prev, { role: 'user', text: userMessage, image_url: currentImagePreview || undefined }]);
    setInput('');
    setImageFile(null);
    setImagePreview(null);
    setLoading(true);
    
    let imageBase64: string | undefined = undefined;
    if (imageFile) {
        imageBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(imageFile);
        });
    }

    try {
      const res = await apiClient.post('/ai/chat', {
        message: userMessage,
        locationContext: locationContext || "Unknown",
        image_base64: imageBase64
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
                  {msg.image_url && (
                    <img src={msg.image_url} alt="Uploaded by user" className="w-full max-w-[200px] rounded-lg mb-2 border border-white/20" />
                  )}
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
          <div className="p-3 bg-white/50 dark:bg-[#1a1018]/50 border-t border-[#C8A951]/20 flex flex-col gap-2">
            {imagePreview && (
              <div className="relative self-start animate-fade-in-up">
                <img src={imagePreview} className="h-16 w-16 object-cover rounded-lg border border-[#C8A951]/30 shadow-sm" alt="Preview" />
                <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute -top-2 -right-2 bg-white dark:bg-[#2d2019] text-red-500 rounded-full p-1 shadow-md hover:scale-110 transition-transform border border-red-500/20">
                  <X size={12} strokeWidth={3} />
                </button>
              </div>
            )}
            <div className="flex gap-2 w-full">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask a question or upload a photo..."
                className="flex-1 min-w-0 bg-[#f8f5f0] dark:bg-[#2d2019] px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#C8A951] dark:text-[#f0e8dc] border border-[#C8A951]/20 placeholder-[#8a7a6a] dark:placeholder-[#5a4a3a]"
              />
              <div className="flex gap-1.5 shrink-0">
                <label className="p-2.5 bg-[#f0e8dc] dark:bg-[#2d2019] text-[#7B1113] dark:text-[#C8A951] rounded-xl hover:brightness-95 transition-all shadow-sm cursor-pointer flex items-center justify-center border border-[#C8A951]/20">
                  <Camera size={18} />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setImageFile(e.target.files[0]);
                      setImagePreview(URL.createObjectURL(e.target.files[0]));
                    }
                  }} />
                </label>
                <button
                  onClick={sendMessage}
                  disabled={(!input.trim() && !imageFile) || loading}
                  className="p-2.5 bg-gradient-to-br from-[#7B1113] to-[#5a0c0e] text-[#C8A951] rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
