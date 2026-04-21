import React from 'react';
import { DAILY_QUESTS } from '../../config/questConfig';
import type { QuestProgress, QuestTemplate } from '../../types/quest';

type Category = 'care' | 'math' | 'battle' | 'move';

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

interface PowerPathStripProps {
  dailyQuests: QuestProgress[];
}

export const PowerPathStrip: React.FC<PowerPathStripProps> = ({ dailyQuests }) => {
  const categoryDone = new Map<Category, boolean>();
  for (const p of dailyQuests) {
    const tpl = DAILY_QUESTS.find((q) => q.id === p.templateId);
    if (!tpl) continue;
    const cat = categorize(tpl);
    if (!categoryDone.get(cat)) categoryDone.set(cat, p.current >= p.target);
  }
  const order: Category[] = ['care', 'math', 'battle', 'move'];
  const completed = order.filter((c) => categoryDone.get(c)).length;

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/80 px-2.5 py-2 backdrop-blur-sm shadow-md">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[9px] font-black uppercase tracking-widest text-amber-300/90">Power Path</div>
        <div className="text-[10px] font-black text-slate-300">{completed}/4</div>
      </div>
      <div className="flex items-center gap-1">
        {order.map((cat, i) => {
          const done = categoryDone.get(cat) ?? false;
          return (
            <React.Fragment key={cat}>
              <div
                className={`flex-1 flex flex-col items-center rounded-md p-1 transition-colors ${
                  done ? 'bg-emerald-900/40 border border-emerald-500/60' : 'bg-slate-800/60 border border-slate-700/50'
                }`}
                title={CATEGORY_LABELS[cat]}
              >
                <img
                  src={CATEGORY_ICONS[cat]}
                  alt={CATEGORY_LABELS[cat]}
                  className="w-5 h-5"
                  style={{ imageRendering: 'pixelated', opacity: done ? 1 : 0.6 }}
                />
                <div className={`text-[8px] font-black uppercase tracking-wider mt-0.5 ${done ? 'text-emerald-300' : 'text-slate-400'}`}>
                  {CATEGORY_LABELS[cat]}
                </div>
              </div>
              {i < order.length - 1 && (
                <div className={`w-1.5 h-[2px] ${done ? 'bg-emerald-500' : 'bg-slate-700'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
