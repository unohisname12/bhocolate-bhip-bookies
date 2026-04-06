import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'warning' | 'info' | 'success';
  duration?: number;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  const typeClasses = {
    warning: 'bg-yellow-500 border-yellow-600 text-yellow-900',
    info: 'bg-blue-500 border-blue-600 text-blue-900',
    success: 'bg-green-500 border-green-600 text-green-900',
  };

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 p-4 rounded-lg border-2 shadow-lg animate-pop ${typeClasses[type]}`}>
      <p className="font-bold text-sm">{message}</p>
    </div>
  );
};