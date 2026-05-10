import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  Send, 
  Image as ImageIcon, 
  Phone, 
  Video, 
  Sparkles, 
  User, 
  Bot,
  Loader2,
  Menu,
  BookOpen,
  HeartPulse,
  Compass,
  LayoutDashboard,
  PlusCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { chatWithChotu, generateChotuImage } from './lib/gemini';
import { useVoice } from './hooks/useVoice';
import CallInterface from './components/CallInterface';
import { cn } from './lib/utils';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  type: 'text' | 'image';
  timestamp: Date;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: "Namaste! I am Chotu, your friendly AI companion. How can I help you today? We can talk about your studies, health, or even do some palmistry! If you are feeling lost, just start a video call and I will guide you.",
      type: 'text',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [callState, setCallState] = useState<{ open: boolean, type: 'audio' | 'video' }>({ open: false, type: 'audio' });
  const [isVisionGuiding, setIsVisionGuiding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const { startListening, transcript, isListening, speak, isSpeaking, setTranscript } = useVoice();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleVisionSnapshot = useCallback(async (base64: string) => {
    if (!isVisionGuiding || isLoading) return;
    try {
      const response = await chatWithChotu(
        "I am blind and need you to describe exactly what you see in the camera right now to help me navigate or understand my surroundings. Speak directly to me.",
        [], 
        true, 
        base64
      );
      if (response) speak(response);
    } catch (err) {
      console.error("Vision guidance error:", err);
    }
  }, [isVisionGuiding, isLoading, speak]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle voice transcript
  useEffect(() => {
    if (transcript && !isListening) {
      handleSend(transcript);
      setTranscript('');
    }
  }, [transcript, isListening]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      type: 'text',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Check if user wants an image
      if (text.toLowerCase().includes('generate') || text.toLowerCase().includes('create image')) {
        const imageUrl = await generateChotuImage(text);
        if (imageUrl) {
          const chotuMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: imageUrl,
            type: 'image',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, chotuMsg]);
          speak("I've created this image for you.");
        }
      } else {
        const history = messages.map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }));
        
        const response = await chatWithChotu(text, history);
        const chotuMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: response || "I'm sorry, I'm a bit lost. Can you repeat that?",
          type: 'text',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, chotuMsg]);
        
        // ONLY speak if user explicitly asks for it in the text
        const voiceTriggers = ['speak', 'say it', 'read this', 'tell me', 'bolo', 'sunao'];
        if (voiceTriggers.some(t => text.toLowerCase().includes(t))) {
          speak(response || "");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      const fileMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: isImage || isVideo ? content : `Uploaded file: ${file.name}`,
        type: 'text', // We handle media rendering separately
        timestamp: new Date()
      };

      setMessages(prev => [...prev, fileMsg]);
      
      // Let Chotu acknowledge the file
      setIsLoading(true);
      const response = await chatWithChotu(`I just uploaded a ${file.type}: ${file.name}. Can you help me with this?`, []);
      const chotuMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: response || "I've received your file! What should we do with it?",
        type: 'text',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, chotuMsg]);
      setIsLoading(false);
    };

    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  };

  const toggleCall = (type: 'audio' | 'video') => {
    setCallState({ open: true, type });
    if (type === 'video') {
      setIsVisionGuiding(true);
      speak("Starting video guidance. I will be your eyes.");
    }
  };

  return (
    <div className={cn(
      "flex h-screen overflow-hidden font-sans transition-colors duration-300",
      isDarkMode ? "bg-zinc-950 text-zinc-100" : "bg-[#faf9f6] text-zinc-900"
    )}>
      <main className={cn(
        "flex-1 flex flex-col relative w-full h-full overflow-hidden transition-colors duration-300",
        isDarkMode ? "bg-zinc-950" : "bg-white"
      )}>
        <header className={cn(
          "px-4 py-3 border-b flex items-center justify-between sticky top-0 z-40 transition-colors",
          isDarkMode ? "bg-zinc-950/80 border-zinc-800" : "bg-white/80 border-zinc-100",
          "backdrop-blur-md"
        )}>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-tr from-orange-500 to-amber-400 rounded-full flex items-center justify-center shadow-lg">
              <Bot className="text-white" size={18} />
            </div>
            <div>
              <h1 className="font-bold text-sm">Chotu</h1>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] opacity-60 font-medium">Friend Online</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={toggleTheme}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all"
            >
              {isDarkMode ? <Sparkles size={18} className="text-yellow-400" /> : <Bot size={18} className="text-zinc-500" />}
            </button>
            <button 
              onClick={() => toggleCall('audio')}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-orange-500 transition-all active:scale-95"
            >
              <Phone size={18} />
            </button>
            <button 
              onClick={() => toggleCall('video')}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-orange-500 transition-all active:scale-95"
            >
              <Video size={18} />
            </button>
          </div>
        </header>

        <div 
          ref={scrollRef}
          className={cn(
            "flex-1 overflow-y-auto px-4 py-6 space-y-4 scroll-smooth",
            isDarkMode ? "bg-zinc-950" : "bg-gradient-to-b from-white to-orange-50/10"
          )}
        >
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex w-full",
                msg.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "max-w-[85%] flex gap-2 items-end",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}>
                <div className={cn(
                  "p-3.5 rounded-2xl text-[14px] leading-relaxed shadow-sm",
                  msg.role === 'user' 
                    ? "bg-orange-500 text-white rounded-br-none shadow-orange-500/20" 
                    : (isDarkMode ? "bg-zinc-900 text-zinc-100 rounded-bl-none border border-zinc-800" : "bg-white border border-zinc-100 text-zinc-700 rounded-tl-none")
                )}>
                  {msg.type === 'image' ? (
                    <img 
                      src={msg.content} 
                      alt="Generated" 
                      className="rounded-lg w-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:text-inherit">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                  <div className={cn(
                    "mt-1 text-[8px] font-medium opacity-50",
                    msg.role === 'user' ? "text-right" : "text-left"
                  )}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className={cn(
                "p-3.5 rounded-2xl rounded-tl-none border shadow-sm flex items-center gap-2",
                isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-100"
              )}>
                <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
                <span className="text-[10px] text-zinc-400">Chotu is typing...</span>
              </div>
            </div>
          )}
        </div>

        <footer className={cn(
          "p-4 pb-8 transition-colors",
          isDarkMode ? "bg-zinc-950 border-t border-zinc-900" : "bg-white border-t border-zinc-100"
        )}>
          <div className="max-w-md mx-auto flex items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept="image/*,video/*,.pdf,.doc,.docx,.txt"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 transition-transform active:scale-90 text-zinc-400 hover:text-orange-500"
            >
              <PlusCircle size={20} />
            </button>
            <div className={cn(
              "flex-1 flex items-center rounded-2xl px-3 py-1.5 transition-all border",
              isDarkMode ? "bg-zinc-900 border-zinc-800 focus-within:border-orange-500/50" : "bg-zinc-50 border-zinc-200 focus-within:border-orange-500"
            )}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(input);
                  }
                }}
                placeholder="Message Chotu..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-[14px] py-1.5 resize-none max-h-24 min-h-[36px]"
                rows={1}
              />
              <button 
                onClick={handleSend.bind(null, input)}
                disabled={!input.trim() || isLoading}
                className="p-2 transition-transform active:scale-90 text-orange-500 disabled:opacity-30"
              >
                <Send size={20} />
              </button>
            </div>
            
            <button 
              onClick={startListening}
              disabled={isListening || isLoading}
              className={cn(
                "p-3.5 rounded-full transition-all shadow-md active:scale-90",
                isListening 
                  ? "bg-red-500 text-white animate-pulse shadow-red-500/40" 
                  : (isDarkMode ? "bg-zinc-800 text-orange-500" : "bg-orange-500 text-white shadow-orange-500/30")
              )}
            >
              <Mic size={20} />
            </button>
          </div>
        </footer>

        {/* Call Overlays */}
        <CallInterface 
          isOpen={callState.open} 
          onClose={() => {
            setCallState({ ...callState, open: false });
            setIsVisionGuiding(false);
          }} 
          type={callState.type} 
          onSnapshot={handleVisionSnapshot}
        />
      </main>

      {/* Floating Status (for accessibility) */}
      {isSpeaking && (
        <div className="fixed bottom-24 right-8 bg-zinc-900 text-white px-4 py-2 rounded-full text-xs flex items-center gap-2 shadow-2xl z-50">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
          Chotu is speaking...
        </div>
      )}
    </div>
  );
}

function ToolIcon({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 group cursor-pointer">
      <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 group-hover:bg-orange-50 group-hover:text-orange-500 group-hover:border-orange-100 transition-all">
        {icon}
      </div>
      <span className="text-[10px] font-medium text-zinc-400 group-hover:text-orange-600 transition-colors">{label}</span>
    </div>
  );
}
