import { useCallback,useEffect,useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createTestEngineState } from '../src/engine/state/createTestEngineState';
import { engineReducer } from '../src/engine/state/engineReducer';
import { createHomeBase } from '../src/features/home-base/model';
// Keep the original decorator regression fixture; living-house-fixture covers the new default.
import { DecoratingHomeScreen as HomeBaseScreen } from '../src/features/home-base/HomeBaseScreen';
import { ActivePetContext } from '../src/components/ActivePetContext';
import { LearningActionContext, LearningContext } from '../src/components/LearningContext';
import '../src/index.css';
function Fixture(){
 const [state,setState]=useState(()=>{
  const saved=localStorage.getItem('house-test');if(saved)return JSON.parse(saved);
  const s=createTestEngineState();s.mode='normal';s.screen='home';s.devPreview=false;s.pet!.speciesId='subtrak';s.pet!.name='Subtrak';s.pet!.stage='baby';s.pet!.state='idle';s.pet!.needs={health:100,hunger:65,happiness:85,cleanliness:60};s.player.currencies.tokens=300;s.interaction.unlockedTools=['pet','wash','brush','comfort','play'];s.homeBase=createHomeBase(s);
  const den=s.homeBase.rooms.den!;s.homeBase={activeRoom:'den',rooms:{den:{...den,wall:'rose',items:den.items.map(p=>({...p,finish:'ocean'}))}},owned:['home_bookshelf']};
  return engineReducer(s,{type:'HOME_OPEN'});
 });
 const dispatch=useCallback((a:Parameters<typeof engineReducer>[1])=>setState((s:Parameters<typeof engineReducer>[0])=>engineReducer(s,a)),[]);
 useEffect(()=>{localStorage.setItem('house-test',JSON.stringify(state));},[state]);
 return <ActivePetContext.Provider value={state.pet}><LearningContext.Provider value={state.learning}><LearningActionContext.Provider value={dispatch}><HomeBaseScreen state={state} dispatch={dispatch}/></LearningActionContext.Provider></LearningContext.Provider></ActivePetContext.Provider>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
