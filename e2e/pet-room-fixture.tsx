import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createInitialEngineState} from '../src/engine/state/createInitialEngineState';
import {engineReducer} from '../src/engine/state/engineReducer';
import {hatchEgg} from '../src/services/game/evolutionEngine';
import {createHomeBase} from '../src/features/home-base/model';
import {GameSceneShell} from '../src/components/scene/GameSceneShell';
import '../src/index.css';
import '../src/pilot/pilot.css';
import '../src/features/student-navigation/student-navigation.css';
export function Fixture(){
 const [state,setState]=useState(()=>{const s=createInitialEngineState();s.pet=hatchEgg({id:'layout-pet',type:'subtrak',state:'ready',progress:100,createdAt:new Date().toISOString()});s.showDailyRitual=location.search.includes('welcome');return s;});
 return <div className="pilot-student"><header className="pilot-savebar"><span>Mr Dre<span role="status">Saved online</span></span><span>Account & help</span></header><nav className="student-nav" aria-label="Student menus">{['Home','My Pet','Games','Together','Rewards'].map(label=><button key={label}>{label}</button>)}</nav><GameSceneShell pet={state.pet!} currentRoom={state.currentRoom} homeBase={state.homeBase??createHomeBase(state)} playerTokens={100} mp={0} mpLifetime={0} dailyGoals={state.dailyGoals} ticketCount={0} mailbox={state.mailbox} dailyQuests={state.quests.daily} showDailyRitual={state.showDailyRitual} interaction={state.interaction} onFeed={()=>{}} dispatch={action=>setState(s=>engineReducer(s,action))}/></div>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
