import { useLearningSettings } from '../LearningContext';
import type { GameEngineAction } from '../../engine/core/ActionTypes';

export function SchoolCare({ dispatch }: { dispatch: (action: GameEngineAction) => void }) {
  const learning = useLearningSettings();
  if (learning.schoolSafe === false) return null;
  return <section className="school-care" aria-label="Free essential care"><div><p className="care-eyebrow">Always here for you</p><h2>Care without a cost</h2><p>School mode keeps your companion safe while you’re away. Complete feed, clean and play on a new care day for 150 growth XP. Your first five completed math questions each add 70 bonus XP, at every math level.</p></div><div className="school-care-actions">{([
    ['feed', 'Free snack', '🍎'], ['clean', 'Free clean', '✦'], ['play', 'Free play', '♥'], ['rest', 'Rest & recover', '☾'],
  ] as const).map(([task, label, icon]) => <button key={task} className="care-button" onClick={() => dispatch({ type: 'FREE_SCHOOL_CARE', task })}><span aria-hidden="true">{icon}</span> {label}</button>)}</div><p className="care-fineprint">Repeat whenever you like. Daily care credit and growth XP are awarded once—not for extra clicks.</p></section>;
}
