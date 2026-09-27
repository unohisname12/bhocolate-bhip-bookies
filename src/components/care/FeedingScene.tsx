import { useEffect, useState } from 'react';
import type { FoodItem, Pet } from '../../types';
import type { HomeBase } from '../../features/home-base/model';
import { SavedHomeScene } from '../../features/home-base/HomeRoomView';
import { PetSprite } from '../pet/PetSprite';
import { GameIcon } from '../ui/GameIcon';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import './feeding.css';

export type MealPhase = 'ready' | 'enter' | 'wait' | 'offer' | 'eat' | 'happy' | 'done';
const MEAL_BEATS = [[1400, 'wait'], [2300, 'offer'], [3500, 'eat'], [5800, 'happy'], [7200, 'done']] as const;
const captions: Record<MealPhase, string> = { ready: 'Choose something delicious.', enter: 'Here comes your hungry friend…', wait: 'A plate, a snack, and a little love.', offer: 'A little bite, just for you.', eat: 'Nom, nom, nom!', happy: 'That hit the spot!', done: 'One happy little companion.' };
/** Visual only: food is purchased once by FeedingScreen, never by an animation callback. */
export function FeedingScene({ pet, food, home, onDone }: { pet: Pet; food: FoodItem | null; home?: HomeBase; onDone: () => void }) {
  const [phase, setPhase] = useState<MealPhase>(food ? 'enter' : 'ready');
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!food) return;
    const timers = MEAL_BEATS.map(([ms, next]) => setTimeout(() => { setPhase(next); if (next === 'done') onDone(); }, ms));
    return () => timers.forEach(clearTimeout);
  }, [food, onDone]);
  const chewing = phase === 'eat';
  return <section className={`feeding-scene ${home ? 'is-home' : 'is-picnic'} ${reduced ? 'is-still' : ''}`} data-phase={phase} data-species={pet.speciesId} aria-label={`${pet.name}'s ${home ? 'home meal' : 'picnic'}`}>
    {home ? <div className="feeding-home" inert aria-hidden="true"><SavedHomeScene home={home} dispatch={() => {}} /></div> : <><div className="feeding-sky"/><div className="feeding-hills"/><div className="feeding-grass"/><span className="feeding-flower flower-a">✿</span><span className="feeding-flower flower-b">✿</span></>}
    <div className="feeding-scene-label"><span>{home ? 'AT HOME, TOGETHER' : 'A LITTLE PICNIC'}</span><strong>{pet.name}’s snack time</strong></div>
    <div className="feeding-blanket" aria-hidden="true"/>
    <div className="feeding-companion"><span className="feeding-shadow"/><PetSprite speciesId={pet.speciesId} stage={pet.stage} animationName={phase === 'enter' && !reduced ? 'walking' : chewing ? 'eating' : phase === 'happy' || phase === 'done' ? 'happy' : 'idle'} scale={1.7} paused={reduced} heldItemIcon={chewing ? food?.icon : null}/>{(phase === 'happy' || phase === 'done') && <span className="feeding-love" aria-hidden="true">♡ <b>✦</b> ♡</span>}</div>
    <div className="feeding-plate" aria-hidden="true"><svg viewBox="0 0 160 65"><ellipse cx="80" cy="38" rx="76" ry="23" fill="#193c4144"/><ellipse cx="80" cy="29" rx="72" ry="23" fill="#5a8896"/><ellipse cx="80" cy="25" rx="72" ry="23" fill="#e6f3e5" stroke="#8ebfb8" strokeWidth="4"/><ellipse cx="80" cy="24" rx="51" ry="13" fill="#bad8cf" stroke="#74a99e" strokeWidth="2"/><path d="M23 22q9-10 21-11" fill="none" stroke="#fffde2" strokeWidth="4"/></svg>{food && ['enter', 'wait'].includes(phase) && <span className="feeding-plated-food"><GameIcon icon={food.icon} size="w-12 h-12" className="text-4xl"/></span>}{['eat','happy','done'].includes(phase) && <span className="feeding-crumbs">· ˙ ·</span>}</div>
    {food && <div className="feeding-hand" aria-hidden="true"><span className="feeding-hand-food"><GameIcon icon={food.icon} size="w-12 h-12" className="text-4xl"/></span><svg viewBox="0 0 200 110"><path d="M199 55H114L85 37q-10-6-15 1-5 7 5 14l11 9H52q-17 0-17 11 0 10 16 10h32L67 85q-8 3-5 10 2 7 14 4l33-9h90" fill="#f5c994" stroke="#936843" strokeWidth="4" strokeLinejoin="round"/><path d="M199 50h-58v48h58" fill="#4c9292" stroke="#24575e" strokeWidth="4"/><path d="M140 51v46M150 53v42" stroke="#bad4af" strokeWidth="5"/><path d="M55 74h30" stroke="#d29a67" strokeWidth="3" strokeLinecap="round"/></svg></div>}
    {chewing && <div className="feeding-tasty" aria-hidden="true">✦ <span>nom!</span> ✦</div>}
    <p className="feeding-caption" role="status">{captions[phase]}</p>
  </section>;
}
