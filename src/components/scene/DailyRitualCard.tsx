import React from 'react';
import { DAILY_QUESTS } from '../../config/questConfig';
import { hasAnyMathBuffs } from '../../config/mathBuffConfig';
import type { QuestProgress, QuestTemplate } from '../../types/quest';
import type { MathBuffs } from '../../types/player';

type Category = 'care' | 'math' | 'battle' | 'move';

interface PowerPathRow {
  category: Category;
  label: string;
  icon: string;
  done: boolean;
  current: number;
  target: number;
}

const CATEGORY_LABELS: Record<Category, string> = {
  care: 'Care',
  math: 'Train',
  battle: 'Fight',
  move: 'Move',
};

const CATEGORY_ICONS: Record<Category, string> = {
  care: '/assets/generated/final/pet_care_icon.png',
  math: '/assets/generated/final/icon_streak_flame.png',
  battle: '/assets/generated/final/icon_star.png',
  move: '/assets/generated/final/item_ball.png',
};

const categorize = (tpl: QuestTemplate): Category => {
  if (tpl.goal.kind === 'event_count') {
    const ev = tpl.goal.eventType as string;
    if (['pet_fed', 'pet_cleaned', 'pet_played_with'].includes(ev)) return 'care';
    if (ev === 'math_solved') return 'math';
    if (['battle_won', 'pvp_battle_won', 'ticket_earned'].includes(ev)) return 'battle';
  }
  if (tpl.goal.kind === 'math_streak_at_least') return 'math';
  if (tpl.goal.kind === 'distinct_interactions' || tpl.goal.kind === 'distinct_foods_fed') return 'care';
  return 'move';
};

const buildPowerPath = (dailyQuests: QuestProgress[]): PowerPathRow[] => {
  const byCategory = new Map<Category, PowerPathRow>();
  for (const p of dailyQuests) {
    const tpl = DAILY_QUESTS.find((q) => q.id === p.templateId);
    if (!tpl) continue;
    const cat = categorize(tpl);
    const existing = byCategory.get(cat);
    if (existing) {
      existing.done = existing.done || p.current >= p.target;
      existing.current = Math.max(existing.current, p.current);
      existing.target = existing.target || p.target;
    } else {
      byCategory.set(cat, {
        category: cat,
        label: CATEGORY_LABELS[cat],
        icon: CATEGORY_ICONS[cat],
        done: p.current >= p.target,
        current: p.current,
        target: p.target,
      });
    }
  }
  const ordered: Category[] = ['care', 'math', 'battle', 'move'];
  return ordered
    .map((c) =>
      byCategory.get(c) ?? {
        category: c,
        label: CATEGORY_LABELS[c],
        icon: CATEGORY_ICONS[c],
        done: false,
        current: 0,
        target: 1,
      },
    );
};

interface DailyRitualCardProps {
  loginStreak: number;
  dailyQuests: QuestProgress[];
  mathBuffs: MathBuffs;
  onDismiss: () => void;
  onChoose?: (mode: 'math' | 'momentum' | 'number_merge') => void;
}

export const DailyRitualCard: React.FC<DailyRitualCardProps> = ({
  loginStreak,
  dailyQuests,
  mathBuffs,
  onDismiss,
  onChoose,
}) => {
  const rows = buildPowerPath(dailyQuests);
  const hasBuffs = hasAnyMathBuffs(mathBuffs);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm rounded-2xl border-2 border-amber-400/60 bg-gradient-to-b from-slate-900 to-slate-950 shadow-[0_0_30px_rgba(251,191,36,0.35)] p-5">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-700/50">
          <img
            src="/assets/generated/final/icon_streak_flame.png"
            alt=""
            className="w-10 h-10"
            style={{ imageRendering: 'pixelated' }}
          />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-300/80">Welcome Back</div>
            <div className="text-xl font-black text-white">Day {loginStreak} Streak</div>
          </div>
        </div>

        {/* Power Path */}
        <div className="mt-3">
          <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Today's Power Path
          </div>
          <div className="space-y-1.5">
            {rows.map((row) => (
              <div
                key={row.category}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 border transition-colors ${
                  row.done
                    ? 'border-emerald-500/60 bg-emerald-900/30'
                    : 'border-slate-700/60 bg-slate-800/40'
                }`}
              >
                <img
                  src={row.icon}
                  alt=""
                  className="w-6 h-6 shrink-0"
                  style={{ imageRendering: 'pixelated', opacity: row.done ? 1 : 0.7 }}
                />
                <div className="flex-1">
                  <div className={`text-sm font-black uppercase tracking-wide ${row.done ? 'text-emerald-300' : 'text-slate-200'}`}>
                    {row.label}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {row.done ? 'Complete' : `${row.current} / ${row.target}`}
                  </div>
                </div>
                {row.done && <span className="text-emerald-400 text-xl font-black">✓</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Math buff preview */}
        {hasBuffs && (
          <div
            className="mt-3 rounded-lg border-2 border-amber-400/60 px-3 py-2 shadow-[0_0_12px_rgba(251,191,36,0.35)]"
            style={{
              background: 'linear-gradient(180deg, rgba(120,53,15,0.92) 0%, rgba(69,26,3,0.92) 100%)',
            }}
          >
            <div className="text-[9px] font-black uppercase tracking-widest text-amber-200">
              ⚔️ Carrying Into Battle
            </div>
            <div className="flex gap-3 text-[12px] font-black text-amber-100 mt-0.5">
              {mathBuffs.atk > 0 && <span>+{mathBuffs.atk} ATK</span>}
              {mathBuffs.def > 0 && <span>+{mathBuffs.def} DEF</span>}
              {mathBuffs.hp > 0 && <span>+{mathBuffs.hp} HP</span>}
            </div>
          </div>
        )}

        {/* Today's Challenges — three distinct modes, each with its own reward */}
        {onChoose && (
          <div className="mt-4">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Today's Challenges
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => { onChoose('math'); onDismiss(); }}
                className="rounded-lg border border-amber-400/50 bg-amber-500/10 hover:bg-amber-500/20 p-2 text-center transition"
              >
                <div className="text-xl leading-none">⚔️</div>
                <div className="text-[10px] font-black text-amber-200 mt-1 leading-tight">Power Up</div>
                <div className="text-[8px] text-slate-400 leading-tight">ATK/DEF buffs</div>
              </button>
              <button
                onClick={() => { onChoose('momentum'); onDismiss(); }}
                className="rounded-lg border border-cyan-400/50 bg-cyan-500/10 hover:bg-cyan-500/20 p-2 text-center transition"
              >
                <div className="text-xl leading-none">🧠</div>
                <div className="text-[10px] font-black text-cyan-200 mt-1 leading-tight">Strategize</div>
                <div className="text-[8px] text-slate-400 leading-tight">Shards 💎</div>
              </button>
              <button
                onClick={() => { onChoose('number_merge'); onDismiss(); }}
                className="rounded-lg border border-purple-400/50 bg-purple-500/10 hover:bg-purple-500/20 p-2 text-center transition"
              >
                <div className="text-xl leading-none">✨</div>
                <div className="text-[10px] font-black text-purple-200 mt-1 leading-tight">Warm Up</div>
                <div className="text-[8px] text-slate-400 leading-tight">Tokens 🪙</div>
              </button>
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onDismiss}
          className="mt-4 w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-black uppercase tracking-wider py-3 text-sm shadow-lg active:scale-[0.98] transition"
        >
          Let's Go!
        </button>
      </div>
    </div>
  );
};
