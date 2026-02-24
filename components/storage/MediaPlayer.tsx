
import React, { useState, useRef, useEffect } from 'react';
import { 
  PlayIcon, PauseIcon, XMarkIcon, SpeakerWaveIcon, 
  SpeakerXMarkIcon, ArrowsPointingOutIcon, MusicIcon 
} from '../Icons';

interface MediaPlayerProps {
  url: string;
  type: string;
  onClose: () => void;
}

const MediaPlayer: React.FC<MediaPlayerProps> = ({ url, type, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  
  // Audio Visualizer Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const requestRef = useRef<number | null>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  // Reset state when url changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setVolume(1);
    setIsMuted(false);
  }, [url]);

  // Initialize Web Audio API for Audio files
  useEffect(() => {
    if (type === 'audio' && mediaRef.current && !audioContextRef.current) {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContext();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256; // Defines data resolution
            analyser.smoothingTimeConstant = 0.8;
            
            const source = ctx.createMediaElementSource(mediaRef.current);
            source.connect(analyser);
            analyser.connect(ctx.destination);
            
            audioContextRef.current = ctx;
            analyserRef.current = analyser;
            sourceRef.current = source;
        } catch (e) {
            console.error("Audio Visualizer Init Failed:", e);
        }
    }

    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        audioContextRef.current = null;
        analyserRef.current = null;
        sourceRef.current = null;
    };
  }, [type, url]);

  // Visualizer Animation Loop
  const drawVisualizer = () => {
      if (!canvasRef.current || !analyserRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let rotation = 0;

      const renderFrame = () => {
          if (!analyserRef.current || !canvasRef.current) return;
          
          requestRef.current = requestAnimationFrame(renderFrame);
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const radius = Math.min(centerX, centerY) * 0.4; // Base radius for bars
          
          // Bass reactivity for Icon
          let bassSum = 0;
          for (let i = 0; i < 10; i++) bassSum += dataArray[i];
          const bassScale = 1 + (bassSum / 10 / 255) * 0.15;
          if (iconRef.current) {
              iconRef.current.style.transform = `scale(${bassScale})`;
          }

          // Draw Circular Bars
          const barCount = 64; // Number of bars to draw
          const angleStep = (Math.PI * 2) / barCount;
          
          rotation += 0.002; // Slow rotation

          for (let i = 0; i < barCount; i++) {
              // Map visualizer bars to frequency data
              // We skip the very high frequencies (upper half) as they are often empty in music
              const dataIndex = Math.floor((i / barCount) * (bufferLength * 0.7));
              const value = dataArray[dataIndex];
              const percent = value / 255;
              const barHeight = percent * (Math.min(centerX, centerY) * 0.5);
              
              const angle = (i * angleStep) + rotation;
              
              const x1 = centerX + Math.cos(angle) * radius;
              const y1 = centerY + Math.sin(angle) * radius;
              const x2 = centerX + Math.cos(angle) * (radius + barHeight + 5);
              const y2 = centerY + Math.sin(angle) * (radius + barHeight + 5);
              
              // Dynamic Color
              const hue = 260 + (percent * 60); // Violet (260) to Pink/Red (320)
              const lightness = 50 + (percent * 30);
              const alpha = 0.4 + (percent * 0.6);
              
              ctx.strokeStyle = `hsla(${hue}, 90%, ${lightness}%, ${alpha})`;
              ctx.lineWidth = 4;
              ctx.lineCap = 'round';
              
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
          }
          
          // Inner Glow Ring
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius - 5, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(139, 92, 246, 0.2)';
          ctx.lineWidth = 2;
          ctx.stroke();
      };
      
      // Handle resize
      const handleResize = () => {
          const parent = canvas.parentElement;
          if (parent) {
              const dpr = window.devicePixelRatio || 1;
              canvas.width = parent.clientWidth * dpr;
              canvas.height = parent.clientHeight * dpr;
              ctx.scale(dpr, dpr);
              // reset internal dimensions for CSS to work properly
              canvas.style.width = `${parent.clientWidth}px`;
              canvas.style.height = `${parent.clientHeight}px`;
          }
      };
      
      handleResize();
      window.addEventListener('resize', handleResize);
      renderFrame();
      
      return () => window.removeEventListener('resize', handleResize);
  };

  useEffect(() => {
      if (isPlaying && type === 'audio') {
          // Resume context if suspended (browser autoplay policy)
          if (audioContextRef.current?.state === 'suspended') {
              audioContextRef.current.resume();
          }
          // Start drawing loop
          const cleanup = drawVisualizer();
          // eslint-disable-next-line
          return () => {
              if (cleanup) cleanup(); // Remove resize listener
              if (requestRef.current) cancelAnimationFrame(requestRef.current);
          };
      } else {
          if (requestRef.current) cancelAnimationFrame(requestRef.current);
      }
  }, [isPlaying, type]);

  const togglePlay = () => {
    if (mediaRef.current) {
        if (isPlaying) {
            mediaRef.current.pause();
        } else {
            mediaRef.current.play();
        }
        setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
        setCurrentTime(mediaRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (mediaRef.current) {
        setDuration(mediaRef.current.duration);
        mediaRef.current.play().then(() => setIsPlaying(true)).catch(e => {
            console.log("Autoplay prevented:", e);
            setIsPlaying(false);
        });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (mediaRef.current) {
        mediaRef.current.currentTime = time;
        setCurrentTime(time);
    }
  };
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const vol = parseFloat(e.target.value);
      if (mediaRef.current) {
          mediaRef.current.volume = vol;
          setVolume(vol);
          setIsMuted(vol === 0);
      }
  };

  const toggleMute = () => {
      if (mediaRef.current) {
          const newMuted = !isMuted;
          mediaRef.current.muted = newMuted;
          setIsMuted(newMuted);
      }
  };

  const toggleFullscreen = () => {
      const container = document.getElementById('media-container');
      if (container) {
          if (!document.fullscreenElement) {
              container.requestFullscreen().catch(err => console.log(err));
          } else {
              document.exitFullscreen();
          }
      }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-300 rounded-3xl overflow-hidden">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-slate-800/80 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-white/10 z-[60]"
        >
            <XMarkIcon className="w-5 h-5" />
        </button>

        <div id="media-container" className="relative w-full h-full flex flex-col items-center justify-center group/media bg-black/50 rounded-2xl overflow-hidden">
            {type === 'video' && (
                <div className="relative w-full h-full flex items-center justify-center">
                    <video 
                        ref={mediaRef as React.RefObject<HTMLVideoElement>} 
                        src={url} 
                        className="w-full h-full object-contain"
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onClick={togglePlay}
                        onEnded={() => setIsPlaying(false)}
                        onWaiting={() => setIsBuffering(true)}
                        onPlaying={() => setIsBuffering(false)}
                        onCanPlay={() => setIsBuffering(false)}
                        crossOrigin="anonymous"
                        preload="auto"
                        playsInline
                    />
                    
                    {/* Buffering Indicator */}
                    {isBuffering && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                            <div className="w-16 h-16 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
                        </div>
                    )}

                    {/* Controls Overlay for Video */}
                    <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 transition-opacity duration-300 ${!isPlaying ? 'opacity-100' : 'opacity-0 group-hover/media:opacity-100'}`}>
                        <div className="flex flex-col gap-2">
                            <input 
                                type="range" 
                                min="0" 
                                max={duration || 0} 
                                value={currentTime} 
                                onChange={handleSeek}
                                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-violet-500 hover:accent-violet-400"
                            />
                            <div className="flex items-center justify-between text-white/90">
                                <div className="flex items-center gap-4">
                                    <button onClick={togglePlay} className="hover:text-violet-400 transition-colors">
                                        {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                                    </button>
                                    <span className="text-xs font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
                                    <div className="flex items-center gap-2 group/vol">
                                        <button onClick={toggleMute} className="hover:text-violet-400">
                                            {isMuted || volume === 0 ? <SpeakerXMarkIcon className="w-5 h-5" /> : <SpeakerWaveIcon className="w-5 h-5" />}
                                        </button>
                                        <input 
                                        type="range" 
                                        min="0" 
                                        max="1" 
                                        step="0.1" 
                                        value={volume} 
                                        onChange={handleVolumeChange}
                                        className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white hover:accent-violet-400"
                                        />
                                    </div>
                                </div>
                                <button onClick={toggleFullscreen} className="hover:text-violet-400">
                                    <ArrowsPointingOutIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {type === 'audio' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-900/50 backdrop-blur-md relative overflow-hidden">
                        
                        {/* Audio Visualization Canvas */}
                        <div className="absolute inset-0 z-0">
                            <canvas ref={canvasRef} className="w-full h-full block" />
                        </div>

                        {/* Central Music Icon Container */}
                        <div className="relative mb-12 z-10">
                            <div ref={iconRef} className="relative w-32 h-32 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-[0_0_60px_rgba(124,58,237,0.4)] border-4 border-white/10 transition-transform duration-75 ease-out">
                                <MusicIcon className="w-12 h-12 md:w-20 md:h-20 text-white drop-shadow-md" />
                            </div>
                            
                            {/* Static Glow behind icon (independent of pulse) */}
                            <div className="absolute inset-0 rounded-full bg-violet-500/20 blur-3xl -z-10 transform scale-150"></div>
                        </div>
                        
                        <audio 
                            ref={mediaRef as React.RefObject<HTMLAudioElement>} 
                            src={url} 
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onEnded={() => setIsPlaying(false)}
                            onWaiting={() => setIsBuffering(true)}
                            onPlaying={() => setIsBuffering(false)}
                            onCanPlay={() => setIsBuffering(false)}
                            className="hidden" 
                            crossOrigin="anonymous"
                            preload="auto"
                        />
                        
                        {/* Buffering Indicator for Audio */}
                        {isBuffering && (
                            <div className="absolute top-6 right-6 z-30">
                                <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
                            </div>
                        )}
                        
                        {/* Custom Audio Controls */}
                        <div className="w-full max-w-sm glass-bright rounded-2xl p-4 border border-white/10 bg-slate-900/80 relative z-20 backdrop-blur-xl">
                            <div className="flex flex-col gap-3">
                                <input 
                                    type="range" 
                                    min="0" 
                                    max={duration || 0} 
                                    value={currentTime} 
                                    onChange={handleSeek}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                                />
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono text-slate-400">{formatTime(currentTime)}</span>
                                    <span className="text-[10px] font-mono text-slate-400">{formatTime(duration)}</span>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                    <button onClick={toggleMute} className="text-slate-400 hover:text-white transition-colors">
                                        {isMuted || volume === 0 ? <SpeakerXMarkIcon className="w-4 h-4" /> : <SpeakerWaveIcon className="w-4 h-4" />}
                                    </button>
                                    
                                    <button 
                                        onClick={togglePlay} 
                                        className="w-10 h-10 flex items-center justify-center bg-white text-slate-900 rounded-full hover:bg-violet-400 hover:text-white transition-all shadow-lg hover:scale-105 active:scale-95"
                                    >
                                        {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5 ml-0.5" />}
                                    </button>
                                    
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="1" 
                                        step="0.1" 
                                        value={volume} 
                                        onChange={handleVolumeChange}
                                        className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-400 hover:accent-white transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                </div>
            )}
            
            {type === 'image' && (
                <div className="w-full h-full flex items-center justify-center bg-black/40">
                        <img src={url} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                </div>
            )}
            
            {!['video', 'audio', 'image'].includes(type) && (
                <div className="text-center">
                    <p className="text-red-400 font-bold mb-2">Format Not Supported</p>
                    <p className="text-sm text-slate-500">The file type {type} cannot be played natively.</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default MediaPlayer;
