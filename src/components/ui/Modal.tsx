import React from 'react';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div 
        className="fixed inset-0" 
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md anim-pop">
        <GameCard className="border-4 border-slate-600 bg-slate-800 shadow-2xl">
          <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-slate-700">
            <h2 className="text-2xl font-black text-slate-100 uppercase tracking-widest">{title}</h2>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors bg-slate-700 hover:bg-slate-600 rounded-full w-8 h-8 flex items-center justify-center font-bold"
            >
              ×
            </button>
          </div>
          
          <div className="mb-6">
            {children}
          </div>

          {footer ? (
            <div className="pt-4 border-t-2 border-slate-700 flex justify-end gap-3">
              {footer}
            </div>
          ) : (
            <div className="pt-4 border-t-2 border-slate-700 flex justify-end">
              <GameButton variant="secondary" onClick={onClose}>Close</GameButton>
            </div>
          )}
        </GameCard>
      </div>
    </div>
  );
};
