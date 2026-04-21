import React from 'react';
import type { CatchChoice } from '../types';

interface Props {
  choices: CatchChoice[];
  selectedIndex: number;
  disabled: boolean;
  onSelect: (idx: number) => void;
  /** Per-choice ref; parent uses it to measure start-position of the thrown token. */
  assignRef: (idx: number, el: HTMLButtonElement | null) => void;
}

export const ChoiceRow: React.FC<Props> = ({ choices, selectedIndex, disabled, onSelect, assignRef }) => {
  return (
    <div
      className="flex items-center justify-center gap-2 flex-wrap px-2"
      role="radiogroup"
      aria-label="Math choices"
      data-testid="catch-choices"
    >
      {choices.map((c, idx) => {
        const selected = idx === selectedIndex;
        return (
          <button
            key={c.id}
            ref={(el) => assignRef(idx, el)}
            type="button"
            role="radio"
            aria-checked={selected}
            data-testid={`catch-choice-${idx}`}
            onClick={() => onSelect(idx)}
            disabled={disabled}
            className="font-black rounded-xl transition-all duration-100 disabled:opacity-40"
            style={{
              minWidth: 56,
              height: 56,
              padding: '0 14px',
              fontSize: 20,
              color: selected ? '#0a0604' : '#fde68a',
              background: selected
                ? 'linear-gradient(180deg,#fde68a,#fbbf24)'
                : 'linear-gradient(180deg,#334155,#1e293b)',
              border: selected ? '2px solid #fbbf24' : '2px solid #475569',
              boxShadow: selected
                ? '0 0 18px rgba(251,191,36,0.6), 0 4px 0 rgba(0,0,0,0.6)'
                : '0 4px 0 rgba(0,0,0,0.6)',
              textShadow: selected ? 'none' : '0 1px 0 rgba(0,0,0,0.8)',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
};
