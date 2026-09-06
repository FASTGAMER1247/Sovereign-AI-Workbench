import React, { useEffect, useRef } from 'react';

export interface DotGridProps {
  className?: string;
  style?: React.CSSProperties;
  dotSpacing?: number;
  baseRadius?: number;
  maxRadius?: number;
  glowRadius?: number;
  baseColor?: string;
  activeColor?: string;
  secondaryColor?: string;
}

export const DotGrid: React.FC<DotGridProps> = ({
  className = '',
  style,
  dotSpacing = 26,
  baseRadius = 1.2,
  maxRadius = 2.8,
  glowRadius = 160,
  baseColor = 'rgba(255, 255, 255, 0.08)',
  activeColor = '#10B981',
  secondaryColor = '#38BDF8', // Can be used for gradient or varied dots if desired
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    
    // Mouse state
    const mouse = { x: -1000, y: -1000 };
    let lastMouseMove = performance.now();

    // Dot grid state
    let dots: { x: number; y: number; intensity: number }[] = [];

    const initGrid = () => {
      // Handle devicePixelRatio for crisp rendering on retina screens
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      ctx.scale(dpr, dpr);

      // Recreate dots based on new dimensions
      dots = [];
      const cols = Math.ceil(width / dotSpacing) + 1;
      const rows = Math.ceil(height / dotSpacing) + 1;
      
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          dots.push({
            x: i * dotSpacing,
            y: j * dotSpacing,
            intensity: 0
          });
        }
      }
    };

    // Initialize the grid layout
    initGrid();

    // Event listeners
    const handleResize = () => {
      initGrid();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      lastMouseMove = performance.now();
    };
    
    const handleMouseLeave = () => {
      // Move mouse off-screen when it leaves the window
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Main animation loop
    const render = (time: number) => {
      // Pause animation when the tab is not visible to save resources
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      const timeSinceLastMove = time - lastMouseMove;
      const isIdle = timeSinceLastMove > 2000;

      // Draw all base dots in a single path for high performance
      ctx.beginPath();
      ctx.fillStyle = baseColor;
      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        
        // Calculate distance to mouse
        const dx = dot.x - mouse.x;
        const dy = dot.y - mouse.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        // Determine target intensity based on proximity to mouse
        let targetIntensity = 0;
        if (dist < glowRadius) {
          targetIntensity = 1 - (dist / glowRadius);
        }

        // Apply subtle ambient wave if idle
        if (isIdle) {
          // Slow sine wave across the grid
          const wave = Math.sin(dot.x * 0.01 + dot.y * 0.01 + time * 0.001) * 0.5 + 0.5;
          targetIntensity = Math.max(targetIntensity, wave * 0.15);
        }

        // Smoothly interpolate current intensity to target
        dot.intensity += (targetIntensity - dot.intensity) * 0.1;

        // Draw the static base dot
        ctx.moveTo(dot.x + baseRadius, dot.y);
        ctx.arc(dot.x, dot.y, baseRadius, 0, Math.PI * 2);
      }
      ctx.fill();

      // Draw active/glowing dots as a separate layer
      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        if (dot.intensity >= 0.01) {
          ctx.beginPath();
          // Scale dot up based on intensity
          const r = baseRadius + dot.intensity * (maxRadius - baseRadius);
          
          // Use global alpha to fade in the active color over the base
          ctx.globalAlpha = Math.min(1, dot.intensity * 2); 
          ctx.fillStyle = activeColor;
          ctx.arc(dot.x, dot.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // Reset alpha
      ctx.globalAlpha = 1.0;

      animationFrameId = requestAnimationFrame(render);
    };

    // Start animation
    animationFrameId = requestAnimationFrame(render);

    return () => {
      // Cleanup
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [dotSpacing, baseRadius, maxRadius, glowRadius, baseColor, activeColor, secondaryColor]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        ...style
      }}
      aria-hidden="true"
    />
  );
};
