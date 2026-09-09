import React, { useRef, useEffect } from 'react';

interface ParticlesProps {
  className?: string;
  style?: React.CSSProperties;
  particleCount?: number;        // default 70
  speed?: number;                // default 0.3
  connectDistance?: number;      // default 120
  particleColor?: string;        // default '#10B981'
  secondaryColor?: string;       // default '#38BDF8'
  lineOpacity?: number;          // default 0.15
  mouseRadius?: number;          // default 150
  minSize?: number;              // default 1
  maxSize?: number;              // default 3
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
}

export const Particles: React.FC<ParticlesProps> = ({
  className = '',
  style,
  particleCount = 70,
  speed = 0.3,
  connectDistance = 120,
  particleColor = '#10B981',
  secondaryColor = '#38BDF8',
  lineOpacity = 0.15,
  mouseRadius = 150,
  minSize = 1,
  maxSize = 3,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      initParticles();
    };

    const initParticles = () => {
      particlesRef.current = [];
      for (let i = 0; i < particleCount; i++) {
        const isSecondary = Math.random() > 0.5;
        const color = isSecondary ? secondaryColor : particleColor;
        particlesRef.current.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * speed,
          vy: (Math.random() - 0.5) * speed,
          size: Math.random() * (maxSize - minSize) + minSize,
          color,
          opacity: Math.random() * 0.4 + 0.1,
        });
      }
    };

    const drawParticles = () => {
      ctx.clearRect(0, 0, width, height);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off edges gently instead of harsh clamp
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Ensure particles stay perfectly in bounds when window resizes
        p.x = Math.max(0, Math.min(width, p.x));
        p.y = Math.max(0, Math.min(height, p.y));

        // Interaction with mouse
        const dxMouse = mx - p.x;
        const dyMouse = my - p.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

        if (distMouse < mouseRadius) {
          // Subtle gravity towards mouse
          const force = (mouseRadius - distMouse) / mouseRadius;
          p.x += dxMouse * force * 0.015;
          p.y += dyMouse * force * 0.015;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();

        // Connect nearby particles (only when mouse is somewhat nearby for the constellation effect)
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectDistance && distMouse < mouseRadius) {
            const lineOp = (1 - dist / connectDistance) * lineOpacity;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = lineOp;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    };

    const animate = () => {
      if (!document.hidden) {
        drawParticles();
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        mouseRef.current.x = -1000;
        mouseRef.current.y = -1000;
      }
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationRef.current);
    };
  }, [
    particleCount,
    speed,
    connectDistance,
    particleColor,
    secondaryColor,
    lineOpacity,
    mouseRadius,
    minSize,
    maxSize
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        background: 'transparent',
        ...style,
      }}
    />
  );
};
