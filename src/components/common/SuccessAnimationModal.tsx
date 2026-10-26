import { useEffect } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { ArrowRight, Check } from 'lucide-react';

export type AnimationType = 'contract' | 'delete' | 'tick';

export interface SuccessAnimationModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  animationType?: AnimationType;
  animationPath?: string;
  speed?: number;
  buttonText?: string;
  onClose: () => void;
  autoCloseDelay?: number;
}

export default function SuccessAnimationModal({
  isOpen,
  title,
  subtitle,
  animationType = 'contract',
  animationPath,
  speed,
  buttonText,
  onClose,
  autoCloseDelay,
}: SuccessAnimationModalProps) {
  // Determine animation source and settings based on type
  const config = {
    contract: {
      src: '/animations/contract-approved.lottie',
      speed: speed ?? 1.0,
      delay: autoCloseDelay ?? 2600,
      glow: 'bg-primary-500/15 dark:bg-primary-500/25',
      btn: 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/20',
      btnText: buttonText || 'Continue',
      size: 'w-56 h-44',
    },
    delete: {
      src: '/animations/permanent-delete.lottie',
      speed: speed ?? 1.6,
      delay: autoCloseDelay ?? 2500,
      glow: 'bg-error-500/15 dark:bg-error-500/25',
      btn: 'bg-error-600 hover:bg-error-700 shadow-error-500/20',
      btnText: buttonText || 'Done',
      size: 'w-48 h-44',
    },
    tick: {
      src: '/animations/tick-success.lottie',
      speed: speed ?? 1.4,
      delay: autoCloseDelay ?? 2400,
      glow: 'bg-emerald-500/15 dark:bg-emerald-500/25',
      btn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20',
      btnText: buttonText || 'Done',
      size: 'w-48 h-44',
    },
  }[animationType] || {
    src: '/animations/contract-approved.lottie',
    speed: 1.0,
    delay: 2600,
    glow: 'bg-primary-500/15 dark:bg-primary-500/25',
    btn: 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/20',
    btnText: 'Continue',
    size: 'w-56 h-44',
  };

  const resolvedSrc = animationPath || config.src;
  const resolvedDelay = autoCloseDelay ?? config.delay;

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      onClose();
    }, resolvedDelay);

    return () => clearTimeout(timer);
  }, [isOpen, onClose, resolvedDelay]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-sm bg-white dark:bg-surface-900 rounded-3xl p-6 text-center shadow-2xl border border-surface-200 dark:border-surface-800 animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Soft decorative background glow */}
        <div className={`absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-2xl pointer-events-none ${config.glow}`} />

        {/* Lottie Animation */}
        <div className={`${config.size} mx-auto flex items-center justify-center overflow-hidden`}>
          <DotLottieReact
            src={resolvedSrc}
            speed={config.speed}
            autoplay
            loop={false}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Title and Subtitle */}
        <div className="mt-2">
          <h3 className="text-xl font-bold text-secondary-900 dark:text-white tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-secondary-500 dark:text-surface-400 mt-1.5 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          type="button"
          className={`mt-6 w-full py-2.5 px-4 rounded-xl text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 ${config.btn}`}
        >
          <span>{config.btnText}</span>
          {animationType === 'delete' || animationType === 'tick' ? (
            <Check className="w-4 h-4" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
