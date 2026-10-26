import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export interface NoDataAnimationProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  speed?: number;
}

export default function NoDataAnimation({
  size = 'md',
  className = '',
  speed = 1.0,
}: NoDataAnimationProps) {
  const sizeClasses = {
    sm: 'w-44 h-44',
    md: 'w-64 h-64 sm:w-72 sm:h-72',
    lg: 'w-80 h-80',
  }[size] || 'w-64 h-64 sm:w-72 sm:h-72';

  return (
    <div className={`flex items-center justify-center p-2 bg-transparent select-none ${className}`}>
      <div className={`${sizeClasses} flex items-center justify-center`}>
        <DotLottieReact
          src="/animations/no-data-found.lottie"
          loop
          autoplay
          speed={speed}
        />
      </div>
    </div>
  );
}
