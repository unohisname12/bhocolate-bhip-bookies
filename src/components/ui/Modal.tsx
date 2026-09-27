import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  panelClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, panelClassName = '' }) => {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLElement>('button')?.focus();
    return () => { document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  }, [isOpen]);
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" onKeyDown={e => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'Tab') {
        const items = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], summary, [tabindex]:not([tabindex="-1"])') ?? []).filter(item => item.getClientRects().length > 0 && !item.closest('[inert]'));
        const first = items[0], last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }}>
      <div 
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div ref={panel} className={`relative z-10 w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto anim-pop ${panelClassName}`} role="dialog" aria-modal="true" aria-label={title}>
        <GameCard className="border-4 border-slate-600 bg-slate-800 shadow-2xl">
          <div className="sticky top-0 z-20 flex justify-between items-center gap-3 mb-4 pb-3 border-b-2 border-slate-700 bg-slate-800">
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 uppercase tracking-wide break-words min-w-0">{title}</h2>
            <button 
              aria-label={`Close ${title}`}
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors bg-slate-700 hover:bg-slate-600 rounded-full w-11 h-11 shrink-0 flex items-center justify-center font-bold"
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
    </div>, document.body
  );
};
