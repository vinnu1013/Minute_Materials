import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showContainer?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'lg',
  showContainer = true
}) => {
  // Standardized Tailwind height classes for responsive logo display
  const sizeClasses = {
    sm: 'h-9 sm:h-11',
    md: 'h-11 sm:h-14',
    lg: 'h-14 sm:h-18 md:h-20',
    xl: 'h-16 sm:h-20 md:h-22',
    '2xl': 'h-20 sm:h-24 md:h-28'
  };

  const logoContent = (
    <img 
      src="/Logo.jpg" 
      alt="Minute Materials Logo – Plumbing, Electrical, Fans & Lights in LB Nagar & Vanasthalipuram" 
      title="Minute Materials – Express Plumbing, Electrical, Fans & Lights Store"
      referrerPolicy="no-referrer"
      onError={(e) => {
        const target = e.currentTarget;
        if (!target.dataset.triedFallback) {
          target.dataset.triedFallback = 'true';
          target.src = '/logo.jpg';
        }
      }}
      className="h-full w-auto object-contain select-none max-w-full"
    />
  );

  if (showContainer) {
    return (
      <div className={`inline-flex items-center justify-center bg-white px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-xl shadow-md border border-slate-200/80 hover:shadow-lg transition-all ${sizeClasses[size]} ${className}`}>
        {logoContent}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center justify-center ${sizeClasses[size]} ${className}`}>
      {logoContent}
    </div>
  );
};


