import {DisplaySize} from '../src/components/ui/DisplaySize';
import {useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {createTestEngineState} from '../src/engine/state/createTestEngineState';
import {engineReducer} from '../src/engine/state/engineReducer';
import {ActivePetContext} from '../src/components/ActivePetContext';
import {FeedingScreen} from '../src/screens/FeedingScreen';
import {CareGameOverlay} from '../src/components/care-games/CareGameOverlay';
import {FOOD_ITEMS} from '../src/config/gameConfig';
import type {HandMode} from '../src/types/interaction';
import '../src/index.css';
function Fixture(){
 const [state,setState]=useState(()=>{const s=createTestEngineState();s.mode='normal';s.pet!.needs={hunger:35,health:50,happiness:40,cleanliness:25};s.pet!.state='idle';s.player.currencies.tokens=500;s.interaction.unlockedTools=['pet','wash','brush','comfort','play','train'];return s;});
 const [,render]=useState(0);useEffect(()=>{const timer=setInterval(()=>render(n=>n+1),200);return()=>clearInterval(timer);},[]);
 const dispatch=(a:Parameters<typeof engineReducer>[1])=>setState(s=>engineReducer(s,a));
 const [feed,setFeed]=useState(false);useEffect(()=>{localStorage.setItem('care-feedback-test',JSON.stringify(state));},[state]);
 return <ActivePetContext.Provider value={state.pet}><DisplaySize/><button onClick={()=>setFeed(true)}>Feed pet</button>{(['pet','wash','brush','comfort','play','train'] as const).map(mode=><button key={mode} onClick={()=>dispatch({type:'START_PET_INTERACTION',mode})}>Start {mode}</button>)}<FeedingScreen isOpen={feed} onClose={()=>setFeed(false)} currentTokens={state.player.currencies.tokens} mpLifetime={state.player.currencies.mpLifetime} onFeed={id=>dispatch({type:'FEED_PET',food:FOOD_ITEMS.find(f=>f.id===id)!})}/><CareGameOverlay interaction={state.interaction} scale={1} onComplete={quality=>dispatch({type:'CARE_GAME_COMPLETE',mode:state.interaction.activeMode as HandMode,quality})} onCancel={()=>dispatch({type:'CARE_GAME_COMPLETE',mode:state.interaction.activeMode as HandMode,quality:0})}/></ActivePetContext.Provider>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
