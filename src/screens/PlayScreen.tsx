import { LearningJourney } from '../features/learning/LearningJourney';
import type { SkillReview } from '../types/woodland';
import type { ArcadeProgress } from '../features/arcade/model';
import { useState, type CSSProperties } from 'react';
import { ARCADE_GAMES, rewardExplanation } from '../features/arcade/catalog';
import { useClassroomParty } from '../features/classroom-party/context';
import type { GameEngineAction } from '../engine/core/ActionTypes';
import { useLearningSettings } from '../components/LearningContext';
import { gradeLabel } from '../services/game/curriculum';
import { WOODLAND_ART } from '../config/woodlandArt';

export function PlayScreen({ dispatch, hasPet, arcade, reviews }: { dispatch: (action: GameEngineAction) => void; hasPet: boolean; arcade?: ArcadeProgress; reviews?: SkillReview[] }) {
  const learning = useLearningSettings();
  const party=useClassroomParty();
  const [filter,setFilter]=useState('all');
  const games: { title: string; description: string; image: string; needsPet?: boolean; action: GameEngineAction }[] = [

    { title: 'Math Practice', description: 'Start here: five questions, no timer, and hints when you need them.', image: 'math', action: { type: 'SET_SCREEN', screen: 'math' } },
    { title: 'Catch Math', description: 'Choose an answer, then throw. Complete five catches with unlimited retries.', image: 'catch', action: { type: 'SET_SCREEN', screen: 'catch_math' } },
    { title: 'Momentum', description: 'Classic 5×5 or Advanced 7×7: capture, guard, share energy and control stations. Includes a practice example.', image: 'momentum', action: { type: 'START_MOMENTUM' } },
    { title: 'Number Merge', description: 'Start with Easy: add neighboring numbers with no timer or lost hearts. Master chains in harder modes.', image: 'merge', action: { type: 'SET_SCREEN', screen: 'number_merge' } },
    { title: 'Pet Care', description: 'Pet, wash, brush, comfort, train, and play together.', image: 'care', needsPet: true, action: { type: 'SET_SCREEN', screen: 'pet_care' } },
    { title: 'Battle & Tracing', description: 'Battle with your own pet. Solve a question, then trace to boost your move.', image: 'battle', needsPet: true, action: { type: 'START_BATTLE' } },
  ];
  return <main className="woodland-play min-h-dvh text-white p-5 sm:p-10"><div className="max-w-4xl mx-auto">
    <button className="min-h-12 rounded-xl border border-slate-600 px-4" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}>← Home</button>
    <header className="woodland-play-header">
      <div><p className="eyebrow">The activity lodge</p><h1 className="text-3xl sm:text-4xl font-black mt-2">Choose your next game</h1><p className="text-slate-300 mt-3">Choose a game, set your challenge, and see what you can earn.</p><p className="text-teal-200 text-sm mt-4 font-bold">{gradeLabel(learning.grade)} · {learning.topic === 'mixed' ? 'Mixed practice' : learning.topic}</p></div>
      <img src={`${WOODLAND_ART}/pip-portrait.png`} alt="Pip welcomes you to the activity lodge" />
    </header>
    {arcade?.run && <button className="woodland-invite" onClick={()=>dispatch({type:'SET_SCREEN',screen:'arcade'})}><strong>{arcade.run.done?'View results':'Resume'} · {ARCADE_GAMES.find(g=>g.id===arcade.run!.game)?.name} →</strong><span>Your saved round and score are waiting.</span></button>}
    <div className="pilot-actions" aria-label="Game filters">{[['all','All games'],['quick','Quick play'],['together','Together']].map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)} className="min-h-12 rounded-xl border border-slate-500 px-4">{label}</button>)}</div>
    {filter !== 'quick' && <button aria-label="Play Delivery Districts →" className="woodland-invite" onClick={() => { window.location.hash = 'delivery'; dispatch({ type: 'SET_SCREEN', screen: 'arcade' }); }}><strong>🚚 Delivery Districts →</strong><span>Your pet drives the city. Solo, 1-on-1 duels, or up to ten crews. About 20 minutes or a saved campaign.</span></button>}
    {filter==='together' ? <section className="play-tile"><h2>Play with classmates</h2><p>Co-op café, team defense, or classmate racing. Your crew shares the goal.</p><button disabled={!party} onClick={()=>party?.()}>{party?'Open classmate games':'Classroom sign-in required'}</button></section> : <>
    <div className="grid sm:grid-cols-3 gap-4 my-5">{ARCADE_GAMES.filter(g=>filter!=='quick'||g.id==='dash').map(g=><button key={g.id} className="play-tile text-left rounded-2xl border border-teal-700 bg-slate-900 p-5" onClick={()=>{window.location.hash=`arcade-${g.id}`;dispatch({type:'SET_SCREEN',screen:'arcade'});}}><strong className="text-xl">{g.icon} {g.name}</strong><p>{g.detail}</p><p>{g.duration} · 3 modes · Solo</p><p>Classic: first round free, then 1 charge. Café/defense also offer Plan & play for matching skills.</p><small>{rewardExplanation(g.id)}</small></button>)}</div>
    <div className="grid sm:grid-cols-2 gap-4">{games.filter(game=>filter!=='quick'||['Math Practice','Catch Math','Number Merge'].includes(game.title)).map((game, index) => <button style={{ '--tile-index': index } as CSSProperties} key={game.title} disabled={game.needsPet && !hasPet} className="play-tile disabled:opacity-60 disabled:cursor-not-allowed text-left rounded-2xl border border-slate-700 bg-slate-900 p-5 hover:border-teal-300 flex gap-4 items-center" onClick={() => dispatch(game.action)}>
      <span className="woodland-icon-plaque"><img src={`${WOODLAND_ART}/icon-${game.image}.png`} alt="" className="w-16 h-16 object-contain" style={{ imageRendering: 'pixelated' }}/></span>
      <span><strong className="text-xl block">{game.title}</strong><span className="text-slate-300 text-sm block mt-2">{game.needsPet && !hasPet ? 'Available after your companion hatches. Your discovery week comes first.' : game.description}</span></span>
    </button>)}</div></>}
    <LearningJourney dispatch={dispatch} hasPet={hasPet} reviews={reviews}/>
    <button className="woodland-invite" onClick={() => dispatch({ type: 'OPEN_WOODLAND' })}><strong>Repair the Woodland Bridge →</strong><span>A story, a game, and a lasting change to your woodland.</span></button>
    <button className="woodland-invite" disabled={!hasPet} onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'first_adventure' })}><strong>First Adventure →</strong><span>Three questions, a permanent shelf, time together, and a battle.</span></button>
  </div></main>;
}
