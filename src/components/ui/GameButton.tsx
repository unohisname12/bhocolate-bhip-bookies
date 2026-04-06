import React from 'react';

interface GameButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const GameButton: React.FC<GameButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'font-bold rounded-xl shadow-[0_4px_0_0] active:shadow-none active:translate-y-1 transition-all duration-100 flex items-center justify-center gap-2';
  
  const variants = {
    primary: 'bg-blue-500 hover:bg-blue-400 text-white shadow-blue-700',
    secondary: 'bg-slate-600 hover:bg-slate-500 text-white shadow-slate-800',
    danger: 'bg-red-500 hover:bg-red-400 text-white shadow-red-700',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-xl',
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
