
import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { XMarkIcon, QrCodeIcon, BoltIcon, BoltSlashIcon } from '../Icons';
import ModernSpinner from './ModernSpinner';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  title?: string;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose, title = "Scan QR Code" }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<number>();
  const foundCodeRef = useRef<boolean>(false);
  
  // Torch/Flashlight State
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        
        // Check for Torch capability
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        
        // Capabilities check (Type casting to any as basic TS lib doesn't fully cover image capture specs yet)
        const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
        if (capabilities.torch) {
            setHasTorch(true);
        }
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          // Wait for video to load metadata to avoid play issues
          videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play();
              requestRef.current = requestAnimationFrame(tick);
          };
        }
      } catch (err: any) {
        console.error("Camera access error:", err);
        setError("Camera access denied or unavailable. Please ensure you have granted camera permissions.");
        setLoading(false);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => {
            // Turn off torch before stopping if needed
            if (trackRef.current && torchOn) {
                trackRef.current.applyConstraints({ advanced: [{ torch: false } as any] }).catch(() => {});
            }
            track.stop()
        });
      }
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const toggleTorch = async () => {
      if (!trackRef.current) return;
      try {
          await trackRef.current.applyConstraints({
              advanced: [{ torch: !torchOn } as any]
          });
          setTorchOn(!torchOn);
      } catch (e) {
          console.error("Failed to toggle torch:", e);
      }
  };

  const tick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      setLoading(false);
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Sync canvas size to video size
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
          }

          // Draw current video frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          if (!foundCodeRef.current) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            // jsQR might fail on some frames, that's okay
            try {
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                  inversionAttempts: "dontInvert",
              });

              if (code && code.data) {
                  // Draw AR Overlay
                  const { topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner } = code.location;
                  const color = "#10b981"; // Emerald-500

                  // Draw Box
                  ctx.lineWidth = 4;
                  ctx.strokeStyle = color;
                  ctx.beginPath();
                  ctx.moveTo(topLeftCorner.x, topLeftCorner.y);
                  ctx.lineTo(topRightCorner.x, topRightCorner.y);
                  ctx.lineTo(bottomRightCorner.x, bottomRightCorner.y);
                  ctx.lineTo(bottomLeftCorner.x, bottomLeftCorner.y);
                  ctx.lineTo(topLeftCorner.x, topLeftCorner.y);
                  ctx.stroke();

                  // Draw Credit Text
                  const text = "Dev: JuniorSir";
                  ctx.font = "bold 16px 'Courier New', monospace";
                  const textWidth = ctx.measureText(text).width;
                  const textX = (topLeftCorner.x + topRightCorner.x) / 2 - textWidth / 2;
                  const textY = topLeftCorner.y - 15;

                  // Text Background
                  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
                  ctx.fillRect(textX - 8, textY - 16, textWidth + 16, 22);
                  
                  // Text Foreground
                  ctx.fillStyle = color;
                  ctx.fillText(text, textX, textY);
                  
                  // Mark as found to prevent duplicate scans immediately
                  foundCodeRef.current = true;
                  
                  // Slight delay to allow user to see AR effect
                  setTimeout(() => {
                      onScan(code.data);
                  }, 800);
              }
            } catch(e) {
                // Ignore decoding errors for this frame
            }
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(tick);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in duration-300">
      <div className="absolute top-6 left-0 right-0 flex justify-between items-center px-6 z-20">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <QrCodeIcon className="w-5 h-5 text-emerald-400" />
            {title}
        </h2>
        <div className="flex items-center gap-4">
            {hasTorch && (
                <button
                    onClick={toggleTorch}
                    className={`p-2 rounded-full transition-colors backdrop-blur-sm border ${torchOn ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-white/10 text-white border-white/20'}`}
                >
                    {torchOn ? <BoltIcon className="w-6 h-6" /> : <BoltSlashIcon className="w-6 h-6" />}
                </button>
            )}
            <button 
                onClick={onClose}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
            >
                <XMarkIcon className="w-6 h-6" />
            </button>
        </div>
      </div>

      <div className="relative w-full h-full flex flex-col items-center justify-center bg-black">
        {loading && !error && (
            <div className="absolute z-10 flex flex-col items-center gap-4 text-white">
                <ModernSpinner size="lg" color="#10b981" />
                <span className="text-sm font-mono uppercase tracking-widest animate-pulse">Initializing Optical Sensor...</span>
            </div>
        )}

        {error ? (
            <div className="text-center px-6 max-w-sm relative z-30">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                    <XMarkIcon className="w-8 h-8 text-red-500" />
                </div>
                <p className="text-red-400 font-bold mb-2">Scanner Error</p>
                <p className="text-slate-400 text-sm mb-6">{error}</p>
                <button onClick={onClose} className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors border border-white/10">Close Scanner</button>
            </div>
        ) : (
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black">
                {/* Hidden source video */}
                <video ref={videoRef} className="hidden" />
                
                {/* Visible Canvas handling both display and processing */}
                <canvas 
                    ref={canvasRef} 
                    className="absolute inset-0 w-full h-full object-contain" 
                />
                
                {/* Default UI Overlay (when no code detected yet) */}
                {!foundCodeRef.current && !loading && (
                    <>
                        <div className="absolute bottom-12 left-0 right-0 text-center z-20">
                            <p className="text-white/90 text-xs font-mono uppercase tracking-widest bg-black/60 inline-block px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
                                Align Code Within Frame
                            </p>
                        </div>
                        
                        {/* Static Viewfinder Guides */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                             <div className="w-64 h-64 border-2 border-emerald-500/30 rounded-2xl relative">
                                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg"></div>
                                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg"></div>
                                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg"></div>
                                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-lg"></div>
                             </div>
                        </div>
                    </>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default QRScanner;
