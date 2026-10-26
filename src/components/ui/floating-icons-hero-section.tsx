import * as React from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Button } from './button';

// Interface for each floating icon
export interface FloatingIconItem {
  id: number;
  name: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  className: string; // Used for custom positioning around hero
  glowColor?: string; // Soft colored blurred aura behind the card
}

export interface FloatingIconsHeroProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  icons: FloatingIconItem[];
  className?: string;
}

// Single floating icon with spring repulsion physics
const IconNode = ({
  mouseX,
  mouseY,
  iconData,
  index,
}: {
  mouseX: React.MutableRefObject<number>;
  mouseY: React.MutableRefObject<number>;
  iconData: FloatingIconItem;
  index: number;
}) => {
  const ref = React.useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  React.useEffect(() => {
    const handleMouseMove = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const distance = Math.sqrt(
          Math.pow(mouseX.current - (rect.left + rect.width / 2), 2) +
            Math.pow(mouseY.current - (rect.top + rect.height / 2), 2)
        );

        // Repel icon when cursor approaches closer than 160px
        if (distance < 160) {
          const angle = Math.atan2(
            mouseY.current - (rect.top + rect.height / 2),
            mouseX.current - (rect.left + rect.width / 2)
          );
          const force = (1 - distance / 160) * 55;
          x.set(-Math.cos(angle) * force);
          y.set(-Math.sin(angle) * force);
        } else {
          x.set(0);
          y.set(0);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [x, y, mouseX, mouseY]);

  return (
    <motion.div
      ref={ref}
      style={{
        x: springX,
        y: springY,
      }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: index * 0.06,
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn('absolute group cursor-pointer z-10', iconData.className)}
    >
      {/* Soft colored glowing aura underneath */}
      {iconData.glowColor && (
        <div
          className="absolute -inset-3 sm:-inset-4 rounded-full blur-xl sm:blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ background: iconData.glowColor }}
        />
      )}

      {/* Inner continuous floating animation */}
      <motion.div
        className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl shadow-[0_12px_32px_rgba(0,0,0,0.08)] bg-white/95 dark:bg-surface-900/95 backdrop-blur-md border border-slate-100 dark:border-surface-800 transition-transform duration-200 group-hover:scale-110"
        animate={{
          y: [0, -8, 0, 8, 0],
          x: [0, 6, 0, -6, 0],
          rotate: [0, 4, 0, -4, 0],
        }}
        transition={{
          duration: 5 + (index % 4) * 1.5,
          repeat: Infinity,
          repeatType: 'mirror',
          ease: 'easeInOut',
        }}
      >
        <iconData.icon className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" />

        {/* Hover Tooltip */}
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 text-[11px] font-semibold text-secondary-800 dark:text-white bg-white/90 dark:bg-surface-800/90 shadow-md rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none border border-slate-200/50 dark:border-surface-700">
          {iconData.name}
        </span>
      </motion.div>
    </motion.div>
  );
};

export const FloatingIconsHero = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & FloatingIconsHeroProps
>(
  (
    {
      className,
      title = 'HRMS',
      subtitle = 'Simplify your people operations with an all-in-one HRMS platform, empowering your team, streamlining processes and building a better workplace.',
      ctaText = 'Join the Revolution',
      ctaHref = '/login',
      onCtaClick,
      icons,
      ...props
    },
    ref
  ) => {
    const mouseX = React.useRef(0);
    const mouseY = React.useRef(0);

    const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
      mouseX.current = event.clientX;
      mouseY.current = event.clientY;
    };

    return (
      <section
        ref={ref}
        onMouseMove={handleMouseMove}
        className={cn(
          'relative w-full min-h-screen flex items-center justify-center overflow-hidden bg-white dark:bg-surface-950 px-4 sm:px-6 select-none',
          className
        )}
        {...props}
      >
        {/* Subtle background ambient mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(240,245,255,0.8),rgba(255,255,255,0.95))] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,0.6),rgba(2,6,23,0.95))] -z-10" />

        {/* Floating Icons Constellation Layer */}
        <div className="absolute inset-0 w-full h-full pointer-events-auto">
          {icons.map((iconData, index) => (
            <IconNode
              key={iconData.id}
              mouseX={mouseX}
              mouseY={mouseY}
              iconData={iconData}
              index={index}
            />
          ))}
        </div>

        {/* Foreground Content */}
        <div className="relative z-20 text-center max-w-3xl mx-auto px-4 py-16 pointer-events-auto">
          {/* Main Title: HRMS Gradient */}
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight leading-none">
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-fuchsia-600 bg-clip-text text-transparent drop-shadow-sm">
              {title}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 sm:mt-8 max-w-2xl mx-auto text-sm sm:text-base md:text-lg text-secondary-600 dark:text-surface-300 font-normal leading-relaxed">
            {subtitle}
          </p>

          {/* CTA Button */}
          <div className="mt-8 sm:mt-10 flex items-center justify-center">
            {onCtaClick ? (
              <button
                onClick={onCtaClick}
                className="px-8 py-3.5 rounded-full text-sm sm:text-base font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                {ctaText}
              </button>
            ) : (
              <Button asChild size="lg" className="rounded-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-8 py-6 text-sm sm:text-base font-semibold shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all">
                <a href={ctaHref}>{ctaText}</a>
              </Button>
            )}
          </div>
        </div>
      </section>
    );
  }
);

FloatingIconsHero.displayName = 'FloatingIconsHero';
