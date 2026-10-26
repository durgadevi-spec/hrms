import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';

type RoutePoint = {
  x: number;
  y: number;
  delay: number;
};

interface NetworkCanvasProps {
  title?: string;
  subtitle?: string;
}

export const NetworkCanvas: React.FC<NetworkCanvasProps> = ({
  title = 'CTI HRMS',
  subtitle = 'Unified workforce operating system. Manage profiles, attendance, leaves, IT assets, and automated bill reminders in one secure hub.',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const routes: { start: RoutePoint; end: RoutePoint; color: string }[] = [
    { start: { x: 80, y: 140, delay: 0 }, end: { x: 190, y: 70, delay: 2 }, color: '#2563eb' },
    { start: { x: 190, y: 70, delay: 2 }, end: { x: 250, y: 130, delay: 4 }, color: '#3b82f6' },
    { start: { x: 40, y: 60, delay: 1 }, end: { x: 140, y: 190, delay: 3 }, color: '#2563eb' },
    { start: { x: 270, y: 80, delay: 0.5 }, end: { x: 170, y: 200, delay: 2.5 }, color: '#4f46e5' },
    { start: { x: 110, y: 220, delay: 1.5 }, end: { x: 240, y: 240, delay: 3.5 }, color: '#2563eb' },
  ];

  const generateDots = (width: number, height: number) => {
    const dots = [];
    const gap = 12;
    const dotRadius = 1;

    for (let x = 0; x < width; x += gap) {
      for (let y = 0; y < height; y += gap) {
        const isInMapShape =
          (x < width * 0.35 && x > width * 0.08 && y < height * 0.45 && y > height * 0.1) ||
          (x < width * 0.4 && x > width * 0.15 && y < height * 0.85 && y > height * 0.4) ||
          (x < width * 0.85 && x > width * 0.35 && y < height * 0.55 && y > height * 0.15) ||
          (x < width * 0.8 && x > width * 0.55 && y < height * 0.85 && y > height * 0.55);

        if (isInMapShape && Math.random() > 0.3) {
          dots.push({
            x,
            y,
            radius: dotRadius,
            opacity: Math.random() * 0.45 + 0.15,
          });
        }
      }
    }
    return dots;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
      canvas.width = width;
      canvas.height = height;
    });

    resizeObserver.observe(canvas.parentElement as Element);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!dimensions.width || !dimensions.height) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dots = generateDots(dimensions.width, dimensions.height);
    let animationFrameId: number;
    let startTime = Date.now();

    function drawDots() {
      if (!ctx) return;
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      dots.forEach((dot) => {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(37, 99, 235, ${dot.opacity})`;
        ctx.fill();
      });
    }

    function drawRoutes() {
      if (!ctx) return;
      const currentTime = (Date.now() - startTime) / 1000;

      routes.forEach((route) => {
        const elapsed = currentTime - route.start.delay;
        if (elapsed <= 0) return;

        const duration = 3.5;
        const progress = Math.min(elapsed / duration, 1);

        const x = route.start.x + (route.end.x - route.start.x) * progress;
        const y = route.start.y + (route.end.y - route.start.y) * progress;

        ctx.beginPath();
        ctx.moveTo(route.start.x, route.start.y);
        ctx.lineTo(x, y);
        ctx.strokeStyle = route.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(route.start.x, route.start.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = route.color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
        ctx.fill();

        if (progress === 1) {
          ctx.beginPath();
          ctx.arc(route.end.x, route.end.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = route.color;
          ctx.fill();
        }
      });
    }

    function animate() {
      drawDots();
      drawRoutes();
      const currentTime = (Date.now() - startTime) / 1000;
      if (currentTime > 15) {
        startTime = Date.now();
      }
      animationFrameId = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [dimensions]);

  return (
    <div className="hidden md:block w-full md:w-1/2 min-h-[580px] relative overflow-hidden border-r border-slate-100 dark:border-surface-800">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 to-indigo-100/70 dark:from-surface-900 dark:to-surface-950">
        <div className="relative w-full h-full overflow-hidden">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        </div>

        {/* Logo and text overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-5"
          >
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/25">
              <Building2 className="text-white h-7 w-7" />
            </div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-3xl font-extrabold mb-3 tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
          >
            {title}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-xs sm:text-sm text-secondary-600 dark:text-surface-300 max-w-xs leading-relaxed"
          >
            {subtitle}
          </motion.p>
        </div>
      </div>
    </div>
  );
};
export default NetworkCanvas;
