import { Phone, Video, X, Camera, Mic, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRef, useEffect, useState } from 'react';

interface CallInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'audio' | 'video';
  onSnapshot?: (base64: string) => void;
}

export default function CallInterface({ isOpen, onClose, type, onSnapshot }: CallInterfaceProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen && type === 'video') {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(s => {
          setStream(s);
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(err => console.error("Camera error:", err));
    }
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [isOpen, type]);

  useEffect(() => {
    let interval: any;
    if (isOpen && type === 'video' && onSnapshot) {
      interval = setInterval(() => {
        if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0);
          const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
          onSnapshot(base64);
        }
      }, 8000); // Snapshot every 8 seconds for guidance
    }
    return () => clearInterval(interval);
  }, [isOpen, type, onSnapshot]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -20, x: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20, x: 20 }}
          className="fixed top-4 right-4 z-50 w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          <canvas ref={canvasRef} className="hidden" />
          <div className="relative aspect-video bg-zinc-800 flex items-center justify-center overflow-hidden">
            {type === 'video' ? (
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center animate-pulse">
                  <Volume2 className="w-10 h-10 text-white" />
                </div>
                <span className="text-zinc-400 font-medium">Chotu is listening...</span>
              </div>
            )}
            
            <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-md rounded-full flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
              <span className="text-[10px] text-white font-bold uppercase tracking-widest">Live Guidance</span>
            </div>

            <button 
              onClick={onClose}
              className="absolute top-2 right-2 p-1.5 bg-zinc-950/50 hover:bg-red-500/80 text-white rounded-full transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="p-4 bg-zinc-900 flex justify-center gap-6">
            <button className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-300">
              <Mic size={20} />
            </button>
            <button className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-300">
              <Camera size={20} />
            </button>
            <button 
              onClick={onClose}
              className="p-3 bg-red-500 hover:bg-red-600 rounded-full text-white"
            >
              <Phone className="rotate-[135deg]" size={20} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
