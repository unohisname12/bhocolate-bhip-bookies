import { useState } from 'react';
import type { EngineState } from '../types';
import type { GameEngineAction } from '../engine/core/ActionTypes';
import { PetSprite } from '../components/pet/PetSprite';
import { LearningHelp } from '../components/math/LearningHelp';
import { CareGameOverlay } from '../components/care-games/CareGameOverlay';
import { SchoolCare } from '../components/care/SchoolCare';
import { gradeLabel } from '../services/game/curriculum';
import './woodland.css';

function BridgeScene({ state }: { state: EngineState }) {
  const chapter = state.woodland;
  const repaired = !!chapter && ['care', 'reward', 'complete'].includes(chapter.phase);
  return <div className={`bridge-scene ${repaired ? 'is-repaired' : ''}`}>
    <svg viewBox="0 0 640 300" role="img" aria-label={repaired ? 'A repaired bridge connects the woodland paths' : 'A broken bridge waits for your help'}>
      <path d="M0 170 Q120 110 245 145 L255 300 H0Z" fill="#6d9162"/>
      <path d="M395 145 Q520 105 640 155 V300 H388Z" fill="#6d9162"/>
      <path d="M268 0 Q350 65 291 133 Q259 205 284 300 H385 Q343 199 375 129 Q430 52 355 0Z" fill="#5da9b8"/>
      {[45, 95, 165, 230, 275].map((y, i) => <path key={y} d={`M${303 + i % 2 * 30} ${y} l24 0 m8 0 l12 0`} stroke="#c1e8d8" strokeWidth="4" fill="none" className="bridge-water"/>) }
      <path d="M0 236 Q95 180 220 207 M410 207 Q530 180 640 228" stroke="#d6be87" strokeWidth="39" fill="none"/>
      <path d="M206 200 L433 200 M206 237 L433 237" stroke="#5b4235" strokeWidth="9"/>
      {Array.from({ length: 9 }, (_, i) => <rect key={i} x={212 + i * 24} y="190" width="21" height="54" rx="3" fill={i % 2 ? '#b48150' : '#d2a36a'} stroke="#694f3c" strokeWidth="2" opacity={repaired || i < 2 || i > 6 ? 1 : .12} className={repaired ? 'bridge-plank' : ''} style={{ animationDelay: `${i * 70}ms` }}/>) }
      {[206, 433].map(x => <g key={x}><rect x={x} y="157" width="10" height="95" rx="3" fill="#75573b"/><circle cx={x + 5} cy="155" r="8" fill="#dbbb77"/></g>)}
      {repaired && <path d="M211 163 Q320 196 438 163" fill="none" stroke="#e5cea0" strokeWidth="5"/>}
      {chapter?.decoration === 'flowers' && [130, 173, 474, 515].map(x => <g key={x}><path d={`M${x} 227v-22`} stroke="#486d43" strokeWidth="4"/><circle cx={x} cy="200" r="10" fill="#edafb6"/><circle cx={x} cy="200" r="4" fill="#ffe09a"/></g>)}
      {chapter?.decoration === 'lanterns' && [220, 425].map(x => <g key={x}><path d={`M${x} 153v-25`} stroke="#6a4b35" strokeWidth="4"/><rect x={x - 8} y="121" width="16" height="22" rx="5" fill="#ffdc86" stroke="#9c6d41" strokeWidth="3"/></g>)}
    </svg>
    <div className="bridge-companion"><PetSprite speciesId={state.pet?.speciesId ?? 'koala_sprite'} stage={state.pet?.stage ?? 'baby'} animationName={repaired ? 'happy' : 'idle'} scale={1.2}/></div>
    <span className="bridge-scene-label">{state.pet ? `${state.pet.name} is with you` : 'Pip, your club guide · your own egg is still a surprise'}</span>
  </div>;
}

export function WoodlandScreen({ state, dispatch }: { state: EngineState; dispatch: (action: GameEngineAction) => void }) {
  const [answer, setAnswer] = useState<{ id: string; value: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [guideHearts, setGuideHearts] = useState(0);
  const chapter = state.woodland;
  const problem = chapter?.phase === 'learn' ? chapter.problems[chapter.index] : null;
  const evidence = (state.learningEvidence ?? []).filter(row => chapter?.problems.some(p => p.id === row.questionId) || chapter?.deliveries.includes(row.questionId));
  const summary = chapter?.summary ?? { questions: evidence.filter(row => row.correct).length, independent: evidence.filter(row => row.firstAttemptCorrect).length, supported: evidence.filter(row => row.support !== 'none').length };
  const closeCare = () => dispatch({ type: 'SET_HAND_MODE', mode: 'idle' });
  return <main className="woodland-chapter"><div className="woodland-container">
    <header className="woodland-top"><button onClick={() => dispatch({ type: 'SET_SCREEN', screen: state.pet ? 'home' : 'discovery' })}>← Home</button><span>Chapter 01 · Woodland Adventure Club</span></header>
    <div className="woodland-heading"><p className="care-eyebrow">Small steps. Something wonderful.</p><h1>Repair the Woodland Bridge</h1><p>Help the club reach the picnic meadow. Learn a little, choose your game, and leave the woodland better than you found it.</p></div>
    <BridgeScene state={state}/>
    <ol className="bridge-steps" aria-label="Chapter progress">{['Plan', 'Play', 'Care', 'Celebrate'].map((label, i) => { const step = !chapter || chapter.phase === 'learn' ? 0 : chapter.phase === 'route' ? 1 : chapter.phase === 'care' ? 2 : 3; return <li key={label} className={i <= step ? 'active' : ''} aria-current={i === step ? 'step' : undefined}><span>{i + 1}</span>{label}</li>; })}</ol>
    <section className="woodland-panel" aria-label="Bridge mission">
      {!chapter && <><h2>A path worth making</h2><p>Three planning questions, your choice of mini-game, then a little time together. No timer. You can stop and return to this chapter later.</p><button className="woodland-primary" onClick={() => dispatch({ type: 'START_BRIDGE_CHAPTER' })}>Start the bridge adventure</button><p className="woodland-note">This is extra play, not an extra discovery stamp. Your discovery week and baby-care week stay unchanged.</p></>}
      {chapter?.phase === 'learn' && problem && <><p className="care-eyebrow">{gradeLabel(state.learning.grade)} · Plan {chapter.index + 1} of 3</p><h2>Make a plan with your companion</h2><form onSubmit={e => { e.preventDefault(); setDismissed(false); dispatch({ type: 'ANSWER_BRIDGE_QUESTION', questionId: problem.id, answer: answer?.id === problem.id ? answer.value : '' }); setAnswer(null); }}><label htmlFor="bridge-answer">{problem.question}</label><div className="bridge-answer-row"><input key={problem.id} id="bridge-answer" aria-label="Bridge answer" autoComplete="off" value={answer?.id === problem.id ? answer.value : ''} onChange={e => setAnswer({ id: problem.id, value: e.target.value })} placeholder="Your answer"/><button className="woodland-primary" type="submit">Add a bridge piece</button></div></form><p role="status">{chapter.feedback}</p>{chapter.feedback.startsWith('Try again') && !dismissed && <LearningHelp key={problem.id} problem={problem} onRetry={() => setDismissed(true)}/>}</>}
      {chapter?.phase === 'route' && <><h2>Your plan is ready. How will you help?</h2><p>Pick a game. Both routes repair the same bridge—no better or rarer reward.</p><div className="bridge-route-grid"><button onClick={() => dispatch({ type: 'CHOOSE_BRIDGE_ROUTE', route: 'catch' })}><img src="/assets/woodland-v1/icon-catch.png" alt=""/><strong>Deliver with Catch Math</strong><span>Three correct catches deliver the supplies. {chapter.deliveries.length}/3 delivered.</span></button><button onClick={() => dispatch({ type: 'CHOOSE_BRIDGE_ROUTE', route: 'merge' })}><img src="/assets/woodland-v1/icon-merge.png" alt=""/><strong>Build with Number Merge</strong><span>Finish a board to put your building skills to work. Strategy results are not math mastery scores.</span></button></div><p className="woodland-note">The chapter keeps your completed work. You may switch routes; a fresh Number Merge board starts when reopened.</p></>}
      {chapter?.phase === 'care' && <><h2>You did it! The meadow is connected.</h2><p>A little celebration is part of the adventure.</p>{state.pet ? <><button className="woodland-primary" onClick={() => { dispatch({ type: 'START_PET_INTERACTION', mode: 'pet' }); }}>Celebrate with {state.pet.name}</button><SchoolCare dispatch={dispatch}/><p className="woodland-note">Pet too tired for a game? Rest & recover, or choose a free care moment.</p></> : <button className="woodland-primary" onClick={() => { const next = guideHearts + 1; setGuideHearts(next); if (next >= 3) dispatch({ type: 'BRIDGE_CARE_COMPLETE' }); }}>Give your club guide a high-five · {guideHearts}/3 ♥</button>}</>}
      {chapter?.phase === 'reward' && <><h2>Make this place yours</h2><p>Pick your bridge decoration. Both choices earn 30 tokens{state.pet ? ' and 60 companion XP' : ''} once.</p><div className="bridge-route-grid"><button onClick={() => dispatch({ type: 'CLAIM_BRIDGE_REWARD', decoration: 'flowers' })}><span className="bridge-reward-icon">✿</span><strong>Meadow flowers</strong><span>A little color on both banks.</span></button><button onClick={() => dispatch({ type: 'CLAIM_BRIDGE_REWARD', decoration: 'lanterns' })}><span className="bridge-reward-icon">☀</span><strong>Golden lanterns</strong><span>A warm welcome for the woodland crew.</span></button></div></>}
      {chapter?.phase === 'complete' && <><p className="care-eyebrow">Chapter complete · progress saved on this browser</p><h2>A bridge. A memory. A good place to stop.</h2><p>You repaired the bridge, chose {chapter.decoration}, and spent time with your companion. The meadow will still be here when you return.</p><div className="bridge-summary"><span><strong>{summary.questions}</strong> questions completed</span><span><strong>{summary.independent}</strong> first try, without help</span><span><strong>{summary.supported}</strong> with learning support</span></div><p className="woodland-note">Supported work counts as progress. This is a practice summary, not a grade.</p><button className="woodland-primary" onClick={() => dispatch({ type: 'SET_SCREEN', screen: state.pet ? 'home' : 'discovery' })}>Finish & go home</button></>}
    </section>
    <section className="woodland-panel woodland-small"><h2>There’s still more to play</h2><p>Your other activities, companions and evolution paths are still here.</p><div className="woodland-links"><button onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'play' })}>All mini-games</button>{state.pet && <button onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'run_start' })}>Dungeon expeditions</button>}<button onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'growth' })}>Nursery & evolution</button></div></section>
    <CareGameOverlay interaction={state.interaction} scale={1} onCancel={closeCare} onComplete={quality => { dispatch({ type: 'CARE_GAME_COMPLETE', mode: state.interaction.activeMode, quality }); closeCare(); }}/>
  </div></main>;
}
