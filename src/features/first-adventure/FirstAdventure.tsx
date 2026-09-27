import type { EngineState } from '../../types/engine';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
import { furniture } from '../home-base/catalog';
import { BATTLE_MILESTONES, prizeProgress } from '../clash/rewards';
import { ADVENTURE_FURNITURE, adventureAvailable, adventureBusy, nextAdventureGoal } from './model';
import './first-adventure.css';

type Props = { state: EngineState; dispatch: (action: GameEngineAction) => void };
import { ADVENTURE_STEPS as steps, ADVENTURE_PHASES as phases } from './model';
export function NextAdventure({ state, dispatch }: Props) {
  if (!adventureAvailable(state)) return null;
  return <button className="adventure-next" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'first_adventure' })}><span>YOUR NEXT GOAL</span><strong>{nextAdventureGoal(state)} →</strong></button>;
}
export function FirstAdventureScreen({ state, dispatch }: Props) {
  const a = state.firstAdventure, phase = a?.phase, index = phase ? phases.indexOf(phase) : 0;
  const prize = furniture(ADVENTURE_FURNITURE)!;
  const p = prizeProgress(state), nextPrize = BATTLE_MILESTONES.find(m => m.wins > p.wins);
  const unavailable = !adventureAvailable(state) || adventureBusy(state);
  const goHome = () => dispatch({ type: 'HOME_OPEN' });
  return <main className="adventure-page" aria-label="First Adventure"><div className="adventure-content">
    <button className="adventure-secondary" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}>← Back to pet</button>
    <header><p className="eyebrow">A little learning. Something yours to keep.</p><h1>{phase === 'complete' ? 'Your adventure is just beginning' : 'First Adventure'}</h1><p>Learn together, make a home, and meet your first opponent. Stop whenever you like—your progress saves.</p></header>
    <ol className="adventure-steps" aria-label="Adventure progress">{steps.map((label, i) => <li key={label} aria-current={i === index ? 'step' : undefined} className={i < index ? 'done' : ''}><b>{i < index ? '✓' : i + 1}</b><span>{label}</span></li>)}</ol>
    <section className="adventure-panel" aria-label="Current goal">
      <div className="adventure-prize"><img src={prize.art} alt="Adventure Shelf"/><div><span className="eyebrow">Permanent home collectible</span><h2>Adventure Shelf</h2><p>A little library your pet can actually use. Plus one optional defense boost for a single battle.</p></div></div>
      {!phase || phase === 'learn' ? <><h2>Three questions. A new corner of your home.</h2><p>No timer. Hints and retries count. Math Practice and other question activities can fill this goal.</p><progress aria-label="Questions completed" value={a?.solved ?? 0} max={3}/><p>{a?.solved ?? 0} of 3 completed</p><button className="adventure-primary" disabled={unavailable} onClick={() => dispatch({ type: 'START_FIRST_ADVENTURE' })}>{a ? 'Continue math' : 'Start my adventure'}</button></> : null}
      {phase === 'reward' && <><p className="adventure-success" role="status">All three complete! You earned something for your home.</p><button className="adventure-primary" disabled={unavailable} onClick={() => dispatch({ type: 'CLAIM_FIRST_ADVENTURE' })}>Open my reward</button><p>Already own this shelf? Keep it and receive the defense boost once.</p></>}
      {phase === 'place' && <><h2>Your shelf is ready to place</h2><p>Choose “Place my Adventure Shelf” in Home Base, then tap a free floor tile. Your pet will help carry it over when it can reach the spot.</p><button className="adventure-primary" disabled={unavailable} onClick={goHome}>Decorate my home</button></>}
      {phase === 'bond' && <><h2>Make a memory together</h2><p>Switch to Live here. Cuddle, chat, dance, or play fetch with your companion. Tap the shelf to see it explore its books.</p><button className="adventure-primary" disabled={unavailable} onClick={goHome}>Spend time together</button></>}
      {phase === 'battle' && <><h2>Try a battle together</h2><p>Finish a battle to earn 10 tokens, win or lose. A victory also earns its usual tokens, XP and a boost.</p><p>{nextPrize ? `Your next permanent victory prize: ${nextPrize.name} (${p.wins}/${nextPrize.wins} wins).` : 'You have earned every current victory milestone.'}</p>
        <button className="adventure-secondary" aria-pressed={p.armed === 'defense'} disabled={unavailable || p.boosts.defense < 1} onClick={() => dispatch({ type: 'ARM_PRIZE_BOOST', boost: p.armed === 'defense' ? null : 'defense' })}>{p.armed === 'defense' ? 'Defense boost selected · tap to save it' : `Use a defense boost · ${p.boosts.defense} available`}</button><p>Optional: +20% defense for the next fight only. It is used when the fight begins.</p>
        <button className="adventure-primary" disabled={unavailable || state.pet?.state === 'sick'} onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'pet_arena' })}>Meet my opponent</button>{state.pet?.state === 'sick' && <p>Your companion needs care first. Return home to help them feel better.</p>}</>}
      {phase === 'complete' && <><p className="adventure-success">Adventure complete · +10 tokens awarded</p><h2>{nextPrize ? `Next collectible: ${nextPrize.name}` : 'Make your collection your own'}</h2><p>{nextPrize ? `${p.wins} of ${nextPrize.wins} battle wins. Each victory earns 10 tokens and another optional boost along the way.` : 'Visit Home Base to spend tokens and arrange your rewards.'}</p>{nextPrize && <progress aria-label="Next battle collectible" value={p.wins} max={nextPrize.wins}/>}<div className="adventure-actions"><button className="adventure-primary" disabled={unavailable} onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'play' })}>Choose my next game</button><button className="adventure-secondary" disabled={unavailable} onClick={goHome}>Enjoy my home</button></div></>}
      {!adventureAvailable(state) && <p>Available with your living companion in your saved game. Discovery and care come first.</p>}
    </section>
  </div></main>;
}
