import { TOKENS_PER_STAR } from '../../services/game/wallet';
import { unlockedFeatures } from '../student-navigation/unlocks';
import { useStudentChallenge } from '../skill-challenge/studentContext';
import { DecisionCard } from '../learning/DecisionCard';
import { arcadeDecision, supportsLearningRun } from './learning';
import { DeliveryGame } from '../delivery/DeliveryGame';
import { GameRules } from '../../components/game/GameRules';
import { ARCADE_GAMES as GAMES, MODE_NAMES, cafeTarget, rewardExplanation, currentReward } from './catalog';
import { useClassroomParty } from '../classroom-party/context';
import { useEffect, useState } from 'react';
import type { EngineState } from '../../types/engine';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
import { useLearningSettings } from '../../components/LearningContext';
import { gradeLabel } from '../../services/game/curriculum';
import { PetSprite } from '../../components/pet/PetSprite';
import { freshArcade, canRetry, buildCost, road, RECIPES, DECORATIONS, type ArcadeGame, type Tower } from './model';
import './arcade.css';
type Props = { state: EngineState; dispatch: (action: GameEngineAction) => void };
export function ArcadeScreen({ state, dispatch }: Props) {
  const [delivery, setDelivery] = useState(() => window.location.hash === '#delivery');
  const party = useClassroomParty();
  const classroom = !!useStudentChallenge();
  useEffect(()=>{window.scrollTo({top:0,left:0});},[]);
  const selected = /^#arcade-(dash|guard|cafe)$/.test(window.location.hash) ? window.location.hash.slice(8) : null;
  const shopOnly = window.location.hash === '#arcade-shop';
  const a = state.arcade ?? freshArcade(), r = shopOnly ? null : a.run, tokens = state.player.currencies.tokens;
  const open = unlockedFeatures(state);
  const [level, setLevel] = useState(1);
  const [running, setRunning] = useState(false);
  const [tower, setTower] = useState<Tower>('rapid');
  const learning = useLearningSettings();
  const game = GAMES.find(g => g.id === r?.game);
  const gameId = r?.game, done = r?.done, speed = r?.level ?? 1, step = r?.step ?? 0, lane = r?.lane ?? 1;
  const atCamp = r?.game === 'guard' && r.step % 16 === 0 && r.enemies.length === 0;
  // Hidden tabs pause automatically; returning from another screen starts paused.
  useEffect(() => {
    if (r?.pendingPlan || !running || !gameId || done || gameId === 'cafe') return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      dispatch({ type: 'ARCADE_TICK' });
      if (gameId === 'guard' && (step + 1) % 16 === 0) setRunning(false);
    }, gameId === 'dash' ? 1100 - speed * 180 : 500);
    return () => clearInterval(timer);
  }, [running, gameId, done, speed, step, dispatch, r?.pendingPlan]);
  useEffect(() => {
    if (gameId !== 'dash' || done) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); dispatch({ type: 'ARCADE_LANE', lane: lane + (e.key === 'ArrowLeft' ? -1 : 1) }); }
      if (e.code === 'Space' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); setRunning(v => !v); }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [gameId, lane, done, dispatch]);
  const mascot = state.pet ? <PetSprite speciesId={state.pet.speciesId} stage={state.pet.stage} animationName="idle" scale={0.65}/> : <span className="arc-egg" aria-label="Your egg">🥚</span>;
  const decor = DECORATIONS.find(d => d.id === a.equipped);
  function start(id: ArcadeGame, learningMode = false) { setRunning(false); dispatch({ type: 'ARCADE_START', game: id, level, learningMode }); }
  if (delivery) return <DeliveryGame state={state} dispatch={dispatch} exit={() => { window.history.replaceState(null, '', window.location.pathname + window.location.search); setDelivery(false); dispatch({ type: 'SET_SCREEN', screen: 'play' }); }}/>;
  return <main className={`arcade${r ? ' has-run' : ''}`}><div className="arc-wrap"><nav className="arc-top"><button className="arc-secondary" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'play' })}>← Games</button><span>● {tokens} tokens</span></nav>
    <header className="arc-header"><div><p className="arc-kicker">THE WOODLAND ARCADE</p><h1>{game ? game.name : shopOnly ? 'Your arcade garden' : GAMES.find(g=>g.id===selected)?.name ?? 'Choose your next challenge.'}</h1><p>{gradeLabel(learning.grade)} practice · Egg-friendly from day one</p></div><div className="arc-mascot">{mascot}<span>{decor?.icon ?? '✦'}</span></div></header>
    {!selected && !shopOnly && party && !r && <section className="arc-fuel"><div><strong>Bring your classmates into the game.</strong><p>Run a café together, defend one nest, or race on the same track.</p></div><button onClick={() => party()}>Invite & play together →</button></section>}
    {!r ? <>
      {open.has('delivery') && !selected && !shopOnly && <section className="arc-fuel"><div><strong>🚚 Delivery Districts</strong><p>Your pet drives the city. Solo, 1-on-1 duels, or up to ten crews. Math briefings, secret bids, and teacher rewards.</p></div><button onClick={() => setDelivery(true)}>Play Delivery Districts →</button></section>}
      {!shopOnly && <>
      <fieldset className="arc-level"><legend>Game mode · your math level stays the same</legend>{MODE_NAMES.map((name, i) => <button key={name} aria-pressed={level === i + 1} onClick={() => setLevel(i + 1)}>{name}</button>)}</fieldset>
      <div className="arc-cards">{GAMES.filter(g=>(!selected||g.id===selected)&&open.has(g.id)).map(g => <article className={`arc-card ${g.color}`} key={g.id} id={`arcade-${g.id}`}><div className={`arc-cover ${g.id}`}><span>{g.icon}</span><i>🥚</i></div><div className="arc-card-body"><p className="arc-kicker">{g.genre}</p><h2>{g.name}</h2><p>{g.detail}</p><p><strong>{MODE_NAMES[level-1]}:</strong> {g.modes[level-1]}</p><p>{g.duration} · {g.controls}</p><p className="arc-reward-preview">{rewardExplanation(g.id)}</p>{supportsLearningRun(g.id,learning) && <button onClick={()=>start(g.id,true)}>Plan & play →</button>}<small>Best: {a.best[g.id]} · Rounds: {a.plays[g.id]}</small><button hidden={classroom && supportsLearningRun(g.id,learning)} onClick={() => start(g.id)}>Play →</button></div></article>)}</div></>}
      {!selected && <section className="arc-panel"><p className="arc-kicker">MAKE IT YOURS</p><h2>Your arcade garden</h2><p>Finish rounds to earn tokens. Decorations stay with your learner profile.</p><div className="arc-shop">{DECORATIONS.map(d => <button key={d.id} aria-pressed={a.equipped === d.id} disabled={!a.owned.includes(d.id) && tokens < d.cost * TOKENS_PER_STAR} onClick={() => dispatch({ type: 'ARCADE_BUY', id: d.id })}><span>{d.icon}</span><strong>{d.name}</strong><small>{a.equipped === d.id ? 'Decorating your arcade' : a.owned.includes(d.id) ? 'Use decoration' : `${d.cost * TOKENS_PER_STAR} tokens`}</small></button>)}</div></section>}
    </> : <section className="arc-panel arc-game">
      <div className="arc-score"><strong>Score {r.score}</strong><span>{r.game === 'dash' ? `Road ${r.step}/60 · ♥ ${r.health}` : r.game === 'guard' ? `Wave ${Math.min(5, Math.floor(r.step / 16) + 1)}/5 · ♥ ${r.health} · ⚙ ${r.energy}` : `Customers ${r.step}/${cafeTarget(r.level)}`}</span></div>
      {r.learningReceipt && <p className="learning-receipt" role="status">{r.learningReceipt} <button onClick={()=>dispatch({type:'SET_SCREEN',screen:'math'})}>Practice with new numbers</button></p>}
      {r.done ? <div className="arc-results"><span>🏆</span><h2>Round complete!</h2><p role="status">{r.message}</p><h3>{r.score} score · Best {a.best[r.game]}</h3><p>Earned {currentReward(r) * TOKENS_PER_STAR} tokens · Balance {tokens} tokens</p><p>{r.learningSolved ?? 0} game plans completed. Supported answers stay separate from independent work.</p><p>{rewardExplanation(r.game)}</p><p>Spend stars on permanent decorations in Your arcade garden below the game cards.</p>{canRetry(r) && <><p>A short run deserves another try. Keep your stars and retry once for free.</p><button onClick={() => { setRunning(false); dispatch({ type: 'ARCADE_RETRY' }); }}>Try again · free retry</button></>}<button onClick={() => { setRunning(false); dispatch({ type: 'ARCADE_CLOSE' }); if (selected) dispatch({ type: 'SET_SCREEN', screen: 'play' }); }}>Collect & choose a game</button></div> : <>
        <GameRules key={r.game} name={game?.name ?? "Arcade"} onOpen={() => setRunning(false)}>{r.game === 'dash' && <p>Tap a lane or use ← →. Avoid rocks 🪨 and collect stars ✦. The bottom row is next.</p>}{r.game === 'guard' && <p>{r.level===3 ? 'Boss challenge: the sixth enemy each wave has triple health. Frost deals bonus boss damage. ' : ''}Build between waves. Rapid hits hard; Frost slows bugs; Shield absorbs escapes. Armored waves 3 and 5 resist Rapid. Select the same defense to upgrade it (max level 3), or change type to replace it for 4 energy.</p>}{r.game === 'cafe' && <p>No timer. Follow the recipe, then serve. Serve all three friends for a +10 bonus. {r.level===1 ? 'New recipes unlock after three orders.' : 'The full menu is open. Choose orders that fit your stock.'} Restocking costs 5 score.</p>}<p>{game?.modes[r.level-1]}</p></GameRules>
        {r.pendingPlan && <DecisionCard key={r.pendingPlan.problem.id} problem={r.pendingPlan.problem} onAnswer={answer=>dispatch({type:'ARCADE_DECIDE',answer})} onCancel={()=>dispatch({type:'ARCADE_CANCEL_PLAN'})}/>}
        <fieldset disabled={!!r.pendingPlan} style={{border:0,padding:0,minWidth:0}}>
        {r.game === 'dash' && <><div className="arc-road" aria-label="Race track">{[4, 3, 2, 1, 0].map(offset => { const row = road(r.seed, r.step + offset, r.level); return <div className="arc-road-row" key={offset}>{[0, 1, 2].map(lane => <span key={lane}>{row.rock === lane || row.secondRock === lane ? '🪨' : row.coin === lane ? '✦' : '·'}</span>)}</div>; })}<div className="arc-lanes">{[0, 1, 2].map(lane => <button key={lane} aria-label={`Lane ${lane + 1}`} aria-pressed={r.lane === lane} onClick={() => dispatch({ type: 'ARCADE_LANE', lane })}>{r.lane === lane ? '🥚🛒' : '↑'}</button>)}</div></div><p className="arc-caption">60 road sections · {['Relaxed', 'Standard', 'Challenge'][r.level - 1]} speed</p></>}
        {r.game === 'guard' && <>{r.learningMode && !running && atCamp && [1,2,3].map(count=>{const reserve=r.energy-4*count,move={kind:'build-row' as const,tower,reserve};return arcadeDecision(r,learning,move)?<button key={count} onClick={()=>dispatch({type:'ARCADE_PLAN',move})}>Plan towers · keep {reserve} energy in reserve</button>:null;})}<div className="arc-defense"><div className="arc-path">{r.enemies.map(e => <span key={e.id} style={{ left: `${e.position / 11 * 86}%` }} title={`${e.hp} health`}>🐛<small>{e.hp}</small></span>)}<b>🥚</b></div><div className="arc-towers">{r.towers.map((t, i) => <button key={i} disabled={running || !atCamp || r.energy < buildCost(r, i, tower) || (t === tower && (r.towerLevels?.[i] ?? 1) >= 3)} onClick={() => { const move={kind:'build' as const,slot:i,tower}; dispatch(r.learningMode && arcadeDecision(r,learning,move)?{type:'ARCADE_PLAN',move}:{ type: 'ARCADE_BUILD', slot: i, tower }); }}><span>{t === 'rapid' ? '🏹' : t === 'frost' ? '❄️' : t === 'shield' ? '🛡️' : '＋'}</span>Plot {i + 1}<small>{t ? `${t} L${r.towerLevels?.[i] ?? 1}` : 'Empty'} · {t === tower ? (r.towerLevels?.[i] ?? 1) >= 3 ? 'Max level' : `Upgrade ${buildCost(r, i, tower)} energy` : 'Build 4 energy'}</small></button>)}</div></div><div className="arc-level">{(['rapid', 'frost', 'shield'] as const).map(t => <button key={t} aria-pressed={tower === t} onClick={() => setTower(t)}>{t}</button>)}</div>{atCamp && <p className="arc-success">Build time · choose your defenses, then Start wave.</p>}</>}
        {r.game === 'cafe' && <>{r.learningMode && [2,3].map(servings=>{const move={kind:'recipe-batch' as const,servings};return arcadeDecision(r,learning,move)?<button key={servings} onClick={()=>dispatch({type:'ARCADE_PLAN',move})}>Plan {servings} servings of {RECIPES[r.orders[r.selected]].name}</button>:null;})}{r.learningMode && arcadeDecision(r,learning,{kind:'batch'}) && <button onClick={()=>dispatch({type:'ARCADE_PLAN',move:{kind:'batch'}})}>Plan a batch for all three customers</button>}<div className="arc-customers">{r.orders.map((order, i) => <button key={i} aria-pressed={r.selected === i} onClick={() => dispatch({ type: 'ARCADE_CAFE', kind: 'select', value: i })}><span>{['🐰', '🦊', '🐻'][i]}</span><strong>{RECIPES[order].name}</strong><span className="arc-served">{(r.served?.[i] ?? 0) > 0 ? '✓ Served this group' : 'Waiting for a treat'}</span><small>{RECIPES[order].parts.map(p => ['🍓', '🍞', '🍯'][p]).join(' + ')}</small></button>)}</div><div className="arc-counter"><h3>Making: {RECIPES[r.orders[r.selected]].name}</h3><div className="arc-tray" aria-label="Your tray">{r.tray.map((p, i) => <span key={i}>{['🍓', '🍞', '🍯'][p]}</span>)}{r.tray.length === 0 && 'Your tray is ready'}</div><div className="arc-ingredients">{['Berries', 'Bread', 'Honey'].map((name, i) => <div key={name}><button disabled={r.tray.length >= RECIPES[r.orders[r.selected]].parts.length} onClick={() => dispatch({ type: 'ARCADE_CAFE', kind: 'ingredient', value: i })}>{['🍓', '🍞', '🍯'][i]} {name} ({r.stock[i]})</button><button disabled={r.level===3 && r.energy===0} className="arc-secondary" onClick={() => dispatch({ type: 'ARCADE_RESTOCK', ingredient: i })}>Restock +4</button></div>)}</div><button disabled={r.tray.length !== RECIPES[r.orders[r.selected]].parts.length} onClick={() => dispatch(r.learningMode && arcadeDecision(r,learning,{kind:'serve'})?{type:'ARCADE_PLAN',move:{kind:'serve'}}:{ type: 'ARCADE_CAFE', kind: 'serve', value: 0 })}>Serve order ✨</button> <button className="arc-secondary" onClick={() => dispatch({ type: 'ARCADE_CAFE', kind: 'clear', value: 0 })}>Clear tray</button></div></>}
        </fieldset>
        {r.learningMode && !r.pendingPlan && <p>Plan & play: use the real quantities when a task fits your assigned skill. Other moves use the usual controls. Your pet is cheering you on.</p>}
        <p className="arc-reward-preview">{r.game==='cafe'&&r.level===3 ? `${r.energy} deliveries left · ` : ''}Finish now: {currentReward(r) * TOKENS_PER_STAR} tokens.</p><p role="status" className="arc-feedback">{r.message}</p><div className="arc-controls">{r.game !== 'cafe' && <button disabled={!!r.pendingPlan} onClick={() => setRunning(v => !v)}>{running ? 'Pause' : atCamp ? 'Start wave' : r.step === 0 ? 'Start run' : 'Resume run'}</button>}<button className="arc-secondary" onClick={() => { setRunning(false); dispatch({ type: 'ARCADE_END' }); }}>Finish round early</button></div>
      </>}
    </section>}
    <footer>Practice at your level. Play your way. Your egg can join every game.</footer>
  </div></main>;
}
