
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob, Type, FunctionDeclaration } from '@google/genai';
import { Mic, MicOff, Loader2, X, Volume2, Bot, Info } from 'lucide-react';
import { Product } from '../types.ts';

interface VoiceAssistantProps {
  products: Product[];
  businessName: string;
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ products, businessName }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  // Helper: Base64 decoding
  const decodeBase64 = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  // Helper: PCM Decoding
  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  // Helper: PCM Encoding
  const encodePCM = (data: Float32Array): Blob => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) {
      int16[i] = data[i] * 32768;
    }
    let binary = '';
    const bytes = new Uint8Array(int16.buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return {
      data: btoa(binary),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const stopSession = () => {
    setIsActive(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  const startSession = async () => {
    setIsConnecting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const queryStockFn: FunctionDeclaration = {
        name: 'queryStock',
        parameters: {
          type: Type.OBJECT,
          description: 'Get the current stock level of a specific product.',
          properties: {
            productName: { type: Type.STRING, description: 'The name of the product to check.' },
          },
          required: ['productName'],
        },
      };

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = encodePCM(inputData);
              sessionPromiseRef.current?.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
              const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
              const bytes = decodeBase64(base64Audio);
              const buffer = await decodeAudioData(bytes, outputCtx, 24000, 1);
              
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (message.serverContent?.outputTranscription) {
               setTranscript(prev => (prev + ' ' + message.serverContent?.outputTranscription?.text).trim());
            }

            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'queryStock') {
                  const target = products.find(p => p.name.toLowerCase().includes((fc.args as any).productName.toLowerCase()));
                  const result = target 
                    ? `We have ${target.currentStock} ${target.unit} of ${target.name} in stock.` 
                    : "I couldn't find that exact product in your inventory.";
                  
                  sessionPromiseRef.current?.then(session => {
                    session.sendToolResponse({
                      functionResponses: { id: fc.id, name: fc.name, response: { result } }
                    });
                  });
                }
              }
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => console.error('Live API Error:', e),
          onclose: () => stopSession(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          tools: [{ functionDeclarations: [queryStockFn] }],
          systemInstruction: `You are a helpful inventory voice assistant for "${businessName}". 
          You can help the user check stock levels using the queryStock tool. 
          Be concise and professional. Speak in a friendly, helpful tone.`
        },
      });

      sessionPromiseRef.current = sessionPromise;
    } catch (err) {
      console.error("Failed to start voice session:", err);
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3">
      {isActive && (
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl w-72 mb-2 animate-in slide-in-from-bottom-4 fade-in duration-300 border border-slate-800">
           <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                 <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Live AI Session</span>
              </div>
              <button onClick={stopSession} className="text-slate-400 hover:text-white transition-colors">
                 <X size={16} />
              </button>
           </div>
           <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-600 rounded-xl">
                 <Bot size={20} />
              </div>
              <p className="text-xs font-medium leading-relaxed">
                Listening... Ask me about stock levels or say "Check Coffee stock".
              </p>
           </div>
           <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 animate-[shimmer_2s_infinite]"></div>
           </div>
        </div>
      )}

      <button 
        onClick={isActive ? stopSession : startSession}
        disabled={isConnecting}
        className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-90 group ${
          isActive 
          ? 'bg-rose-600 hover:bg-rose-700 text-white' 
          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
        }`}
      >
        {isConnecting ? (
          <Loader2 className="animate-spin" size={28} />
        ) : isActive ? (
          <MicOff size={28} />
        ) : (
          <Mic size={28} />
        )}
        
        {!isActive && !isConnecting && (
          <span className="absolute -top-12 right-0 bg-white text-slate-900 text-[10px] font-black uppercase px-3 py-1.5 rounded-xl shadow-lg border border-slate-100 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Voice Assistant
          </span>
        )}
        
        {isActive && (
          <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping"></div>
        )}
      </button>
    </div>
  );
};

export default VoiceAssistant;
