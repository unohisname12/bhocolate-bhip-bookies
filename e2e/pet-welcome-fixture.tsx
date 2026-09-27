import {LearningActionContext} from '../src/components/LearningContext';
import {createMind} from '../src/features/pet-mind/memory';
import {createLife} from '../src/features/pet-mind/life';
import {useCallback,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createInitialEngineState} from '../src/engine/state/createInitialEngineState';
import {engineReducer} from '../src/engine/state/engineReducer';
import {hatchEgg} from '../src/services/game/evolutionEngine';
import {HomeWorld} from '../src/features/student-navigation/HomeWorld';
import {IncubationScreen} from '../src/screens/IncubationScreen';
import '../src/index.css';
import '../src/growth.css';
import '../src/features/student-navigation/student-navigation.css';
function Fixture(){
 const [state,setState]=useState(()=>{const s=createInitialEngineState();const egg={id:'test-egg',type:'subtrak',state:'ready' as const,progress:100,createdAt:new Date().toISOString()};
 if(location.search.includes('nursery')){s.egg={...egg,state:'incubating',progress:0};s.eggDiscovery=null;}else{s.pet=hatchEgg(egg);s.player.activePetId=s.pet!.id;if(location.search.includes('returning')){s.pet!.mind={...createMind(s.pet!),life:createLife(Date.now()-4*86400000)};}if(location.search.includes('sleeping'))s.pet!.state='sleeping';}return s;});
 const dispatch=useCallback((action:Parameters<typeof engineReducer>[1])=>setState(s=>engineReducer(s,action)),[]);
 return <LearningActionContext.Provider value={dispatch}><div className="student-shell"><div className="student-content">{state.egg?<IncubationScreen egg={state.egg} onTap={()=>setState(s=>engineReducer(s,{type:'TAP_EGG'}))} onHatch={()=>setState(s=>engineReducer(s,{type:'HATCH_EGG'}))}/>:<HomeWorld state={state} assigned="free" request={()=>{}} teacherTask={()=>{}}/>}</div></div></LearningActionContext.Provider>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
