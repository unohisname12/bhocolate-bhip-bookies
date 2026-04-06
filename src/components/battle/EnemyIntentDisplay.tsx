import React from 'react';
import type { EnemyIntent } from '../../types/battle';

interface EnemyIntentDisplayProps {
  intent: EnemyIntent | null;
}

const INTENT_COLORS: Record<string, { text: string; border: string; bg: string; glowColor: string }> = {
  ATTACK:       { text: 'text-red-400',    border: 'border-red-500/40',    bg: 'bg-red-950/40',    glowColor: 'rgba(239,68,68,0.35)' },
  HEAVY_ATTACK: { text: 'text-orange-300', border: 'border-orange-500/40', bg: 'bg-orange-950/40', glowColor: 'rgba(249,115,22,0.4)' },
  DEFEND:       { text: 'text-blue-400',   border: 'border-blue-500/40',   bg: 'bg-blue-950/40',   glowColor: 'rgba(59,130,246,0.35)' },
  BUFF:         { text: 'text-purple-400', border: 'border-purple-500/40', bg: 'bg-purple-950/40', glowColor: 'rgba(168,85,247,0.35)' },
  HEAL:         { text: 'text-green-400',  border: 'border-green-500/40',  bg: 'bg-green-950/40',  glowColor: 'rgba(34,197,94,0.35)' },
};

export const EnemyIntentDisplay: React.FC<EnemyIntentDisplayProps> = ({ intent }) => {
  if (!intent) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-700/50 bg-slate-900/40">
        <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Intent:</span>
        <span className="text-[10px] text-slate-600 font-bold">???</span>
      </div>
    );
  }

  const colors = INTENT_COLORS[intent.type] ?? INTENT_COLORS.ATTACK;

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border anim-intent-reveal ${colors.border} ${colors.bg}`}
      style={{ boxShadow: `0 0 12px 2px ${colors.glowColor}` }}
    >
      <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Intent:</span>
      {intent.icon && (
        <img
          src={intent.icon}
          alt=""
          className="w-5 h-5 anim-intent-bounce"
          style={{ imageRendering: 'pixelated' }}
        />
      )}
      <span className={`text-xs font-black uppercase tracking-wide ${colors.text} anim-intent-glow-text`}>
        {intent.label}
      </span>
    </div>
  );
};
