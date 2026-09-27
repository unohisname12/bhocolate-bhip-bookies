import { useEffect, useState } from 'react';
import type { EngineState } from '../../types/engine';
import { discoveryDays } from '../../services/game/eggDiscovery';
import { careDate } from '../../services/game/petGrowth';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { usePageVisible } from '../../hooks/usePageVisible';
import { GoalCompanion } from './GoalCompanion';
import { nextEgg, type Intent } from './model';
import './home-world.css';

type Props = { state: EngineState; assigned: string; request: (intent: Intent) => void; teacherTask: () => void; mission?: {title:string;detail:string;button:string;open:()=>void}; focused?:boolean };
export function HomeWorld({ state, assigned, request, teacherTask, mission, focused }: Props) {
  const [paused, setPaused] = useState(false), [now, setNow] = useState(Date.now);
  useEffect(() => { const refresh = () => { if (!document.hidden) setNow(Date.now()); }; const timer = setInterval(refresh, 60000); document.addEventListener('visibilitychange', refresh); return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); }; }, []);
  const reduced = useReducedMotion(), visible = usePageVisible();
  const pet = state.pet, egg = pet ? null : nextEgg(state, now);
  const days = Math.min(5, state.eggDiscovery ? discoveryDays(state.eggDiscovery, now) : 0);
  const credited = state.eggDiscovery?.stamps.some(s => s.day === careDate(now));
  const eggMission = state.eggDiscovery?.mission?.day === careDate(now) ? state.eggDiscovery.mission : null;
  const title = mission?.title ?? egg?.title ?? (assigned !== 'free' ? 'Your teacher’s activity awaits.' : 'A little practice. A new adventure.');
  const detail = mission?.detail ?? egg?.detail ?? (pet ? `${pet.name} is here with you. Practice your skill, then choose an adventure together.` : 'Practice your skill, then choose an adventure.');
  return <section className="student-goal student-home-world" aria-label={mission ? 'Today’s learning target' : egg ? 'Today’s egg goal' : 'Today’s adventure'}>
    <div className="home-world-scene" data-still={paused || reduced || !visible}>
      <div className="home-world-scene-top"><span>Your woodland home</span>{reduced ? <span className="home-motion-note">Reduced motion on</span> : <button onClick={() => setPaused(p => !p)} aria-label={paused ? 'Play home animation' : 'Pause home animation'}>{paused ? '▶ Play' : 'Ⅱ Pause'}</button>}</div>
      <span className="home-firefly firefly-one" aria-hidden="true"/><span className="home-firefly firefly-two" aria-hidden="true"/>
      <div className="home-world-friend"><GoalCompanion state={state} showEgg={!pet && !!egg} paused={paused} interactive scale={1.65}/></div>
      <div className="home-world-scene-caption"><strong>{pet?.name ?? 'A new friend is waiting'}</strong><span>{pet ? `${pet.stage.charAt(0).toUpperCase()+pet.stage.slice(1)} · Level ${pet.progression.level}` : state.egg ? 'Your woodland nursery' : 'Every adventure brings you closer'}</span></div>
    </div>
    <div className="home-world-task">
      <p className="student-eyebrow">{mission ? 'YOUR TEACHER’S LEARNING TARGET' : egg ? credited && days < 5 ? 'TODAY’S EGG STEP · COMPLETE' : 'YOUR NEXT EGG STEP' : 'TODAY’S SMALL ADVENTURE'}</p>
      <h2>{title}</h2><p className="home-world-detail">{detail}</p>
      <button className="student-primary" onClick={() => mission ? mission.open() : egg ? request(egg.intent) : teacherTask()}>{mission?.button ?? egg?.button ?? (assigned !== 'free' ? 'Open teacher’s activity' : 'Practice my skill')} →</button>
      {mission&&egg&&!focused&&<button className="student-egg-link" onClick={()=>request(egg.intent)}>Egg: {egg.button} →</button>}
      {!focused && egg && !state.egg && <div className="home-hatch-trail" aria-label={`${days} of 5 egg days earned`}><div className="home-trail-heading"><strong>Your path to hatching</strong><span>{days} / 5 days</span></div><ol>{Array.from({length:5},(_,i)=><li key={i} data-earned={i<days} data-current={i===days&&!credited} aria-current={i===days&&!credited?'step':undefined}><span aria-hidden="true">{i<days?'✓':i===4?'✦':i+1}</span><small>{i===4?'Hatch':`Day ${i+1}`}{i<days?<span className="sr-only"> complete</span>:null}</small></li>)}</ol>{eggMission&&!credited&&<p className="home-question-progress">{eggMission.index} of 3 questions answered today</p>}</div>}
      {!focused && state.egg && <div className="home-nursery-progress"><label htmlFor="home-egg-warmth">Egg warmth <strong>{Math.round(state.egg.progress)}%</strong></label><progress id="home-egg-warmth" max={100} value={state.egg.progress}/></div>}
      {!focused && !egg && pet && <div className="home-pet-needs"><span>For your companion</span><button onClick={()=>request({label:'Pet care',action:{type:'SET_SCREEN',screen:'pet_care'}})}>♡ Care & play →</button></div>}
      {!focused && pet && <button className="home-house-link" onClick={()=>request({label:'Explore my house',action:{type:'HOME_OPEN'}})}><span aria-hidden="true">⌂</span><span><strong>Explore my house</strong><small>Upstairs, downstairs, and time together</small></span><span aria-hidden="true">→</span></button>}
    </div>
  </section>;
}

export function HomeDestinations({ hasPet, games, request }: { hasPet: boolean; games: number; request: (intent: Intent) => void }) {
  return <section className="home-destinations" aria-label="Explore your world"><header><h2>Where will you go next?</h2><p>Your little world. Lots to discover.</p></header><div>
    <button onClick={()=>request({label:'Games',view:'games'})}><img src="/assets/woodland-v1/icon-momentum.png" alt=""/><span><strong>Choose an adventure</strong><small>{games} games to play. More open as you go.</small></span><b aria-hidden="true">↗</b></button>
    <button onClick={()=>request({label:'My Pet',view:'pet'})}><img src="/assets/woodland-v1/icon-heart.png" alt=""/><span><strong>{hasPet?'My companion':'My egg & nursery'}</strong><small>{hasPet?'Care, grow, and make a home.':'Meet the friend you’re growing.'}</small></span><b aria-hidden="true">↗</b></button>
    <button onClick={()=>request({label:'Together',view:'together'})}><img src="/assets/woodland-v1/icon-catch.png" alt=""/><span><strong>Meet your classmates</strong><small>Invitations and shared games.</small></span><b aria-hidden="true">↗</b></button>
  </div></section>;
}
