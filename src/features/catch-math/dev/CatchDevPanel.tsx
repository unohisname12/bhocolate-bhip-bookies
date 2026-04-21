import React from 'react';
import type { CatchDifficulty, CatchMode } from '../types';

interface Props {
  mode: CatchMode;
  difficulty: CatchDifficulty;
  onModeChange: (m: CatchMode) => void;
  onDifficultyChange: (d: CatchDifficulty) => void;
  onForceCorrect: () => void;
  onForceWrong: () => void;
  onResetSession: () => void;
}

const MODES: CatchMode[] = ['missing_number', 'solve_for_x', 'equation_step'];
const DIFFS: CatchDifficulty[] = ['easy', 'medium', 'hard'];

export const CatchDevPanel: React.FC<Props> = ({
  mode,
  difficulty,
  onModeChange,
  onDifficultyChange,
  onForceCorrect,
  onForceWrong,
  onResetSession,
}) => {
  const [open, setOpen] = React.useState(false);
  return (
    <div
      className="fixed right-2 top-2 font-sans pointer-events-auto"
      style={{ zIndex: 90 }}
      data-testid="catch-dev-panel"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="font-black uppercase tracking-widest text-[10px] px-2 py-1 rounded-md"
        style={{
          color: '#fde68a',
          background: 'rgba(0,0,0,0.65)',
          border: '1px solid rgba(251,191,36,0.4)',
        }}
      >
        {open ? 'Dev ▲' : 'Dev ▼'}
      </button>
      {open && (
        <div
          className="mt-2 rounded-lg px-3 py-2 text-[11px] text-white"
          style={{
            background: 'rgba(15,23,42,0.96)',
            border: '1px solid rgba(148,163,184,0.4)',
            minWidth: 220,
          }}
        >
          <label className="block mb-1 font-bold text-cyan-300 uppercase text-[9px] tracking-widest">
            Mode
          </label>
          <select
            value={mode}
            onChange={(e) => onModeChange(e.target.value as CatchMode)}
            className="w-full mb-2 px-2 py-1 rounded bg-slate-800 border border-slate-600"
          >
            {MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <label className="block mb-1 font-bold text-cyan-300 uppercase text-[9px] tracking-widest">
            Difficulty
          </label>
          <select
            value={difficulty}
            onChange={(e) => onDifficultyChange(e.target.value as CatchDifficulty)}
            className="w-full mb-2 px-2 py-1 rounded bg-slate-800 border border-slate-600"
          >
            {DIFFS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <div className="flex flex-col gap-1 mt-2">
            <button
              type="button"
              onClick={onForceCorrect}
              className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-[10px] font-black uppercase"
            >
              Force correct throw
            </button>
            <button
              type="button"
              onClick={onForceWrong}
              className="px-2 py-1 rounded bg-rose-700 hover:bg-rose-600 text-[10px] font-black uppercase"
            >
              Force wrong throw
            </button>
            <button
              type="button"
              onClick={onResetSession}
              className="px-2 py-1 rounded bg-slate-600 hover:bg-slate-500 text-[10px] font-black uppercase"
            >
              Reset session
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
