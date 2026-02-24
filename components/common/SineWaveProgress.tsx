import React, { useEffect, useRef } from 'react';

interface SineWaveProgressProps {
  progress: number; // 0 to 100
  className?: string;
  color?: string;
  variant?: 'vertical' | 'horizontal';
}

const SineWaveProgress: React.FC<SineWaveProgressProps> = ({ 
  progress, 
  className = '', 
  color = 'rgba(139, 92, 246, 1)',
  variant = 'horizontal'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let waveOffset = 0;

    const render = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // Resize canvas if needed (responsive)
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
          canvas.width = rect.width * dpr;
          canvas.height = rect.height * dpr;
          // Apply scaling for retina/high-DPI displays
          ctx.scale(dpr, dpr);
      }
      
      // Ensure style matches bounding box
      if (canvas.style.width !== `${rect.width}px`) {
          canvas.style.width = `${rect.width}px`;
          canvas.style.height = `${rect.height}px`;
      }

      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      const safeProgress = Math.min(Math.max(progress, 0), 100);
      const waveSpeed = 0.12;
      
      // Customize wave properties based on variant
      const waveAmplitude = variant === 'horizontal' ? 4 : 8;
      const waveLength = variant === 'horizontal' ? 0.05 : 0.02;

      // Determine colors
      let fillStyle = color;
      let backStyle = color;
      
      // Simple logic to create a transparent/lighter version for the back wave
      if (color.startsWith('#')) {
         backStyle = 'rgba(255, 255, 255, 0.2)'; 
      } else if (color.startsWith('rgba')) {
         backStyle = color.replace(/[\d\.]+\)$/, '0.3)');
      } else if (color.startsWith('rgb')) {
         backStyle = color.replace(')', ', 0.3)').replace('rgb', 'rgba');
      }

      const drawWave = (offset: number, style: string, phase: number) => {
        ctx.fillStyle = style;
        ctx.beginPath();
        if (variant === 'vertical') {
            const level = height - (safeProgress / 100) * height;
            ctx.moveTo(0, height);
            ctx.lineTo(0, level);
            for(let x = 0; x <= width; x++) {
                ctx.lineTo(x, level + Math.sin(x * waveLength + offset + phase) * waveAmplitude);
            }
            ctx.lineTo(width, height);
        } else {
            // Horizontal fill: Fill from left to right, wave on the right vertical edge
            const level = (safeProgress / 100) * width;
            ctx.moveTo(0, 0);
            for(let y = 0; y <= height; y++) {
                const x = level + Math.sin(y * waveLength + offset + phase) * waveAmplitude;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(0, height);
            ctx.lineTo(0, 0);
        }
        ctx.closePath();
        ctx.fill();
      };

      // Draw background wave (phase shifted)
      drawWave(waveOffset, backStyle, 1.5);
      // Draw main wave
      drawWave(waveOffset, fillStyle, 0);

      waveOffset += waveSpeed;
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [progress, color, variant]);

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden ${className}`}>
        <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

export default SineWaveProgress;