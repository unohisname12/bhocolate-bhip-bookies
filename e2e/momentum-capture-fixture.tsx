import {useState,useEffect,useCallback} from 'react';
import {createRoot} from 'react-dom/client';
import {MomentumScreen} from '../src/screens/MomentumScreen';
import {createInitialEngineState} from '../src/engine/state/createInitialEngineState';
import {engineReducer} from '../src/engine/state/engineReducer';
import {initMomentum,buildBoard,beginMove} from '../src/engine/systems/MomentumSystem';
import type {MomentumPiece,MathPower,ActiveMomentumState} from '../src/types/momentum';
import type {GameEngineAction} from '../src/engine/core/ActionTypes';
import '../src/index.css';
import '../src/pilot/pilot.css';
import '../src/features/student-navigation/student-navigation.css';
const params=new URLSearchParams(location.search),enemy=params.has('enemy'),classic=params.has('classic'),winning=params.has('winning');
const role=(params.get('role')??'add') as MathPower;
function fixture(){
 const initial=createInitialEngineState();
 const piece=(id:string,team:'player'|'enemy',x:number,y:number):MomentumPiece=>({id,team,mathPower:classic?undefined:role,rank:classic&&id==='defender'?3:2,energy:4,position:{x,y},isTemporaryRank4:false,rank4TurnsRemaining:0,previousRank:null});
 const attacker=piece('attacker',enemy?'enemy':'player',0,2),defender=piece('defender',enemy?'player':'enemy',0,0);
 const pieces=[attacker,defender,...(winning?[]:[piece('reserve',defender.team,classic?4:6,classic?4:6)])];
 const momentum:ActiveMomentumState={...initMomentum('hard',classic?'classic':'powers'),pieces,board:buildBoard(pieces,classic?5:7),turnCount:3,log:[{turn:2,actor:'player',message:'Capture rehearsal'}],activeTeam:attacker.team,selectedPieceId:'attacker',validMoves:[{destination:defender.position,isAttack:true,energyCost:2,targetPieceId:'defender'}]};
 initial.momentum=params.has('resume')?{...beginMove(momentum,0),phase:enemy?'animating_ai':'animating_attack'}:momentum;
 return initial;
}
function Fixture(){
 const [state,setState]=useState(fixture),[completions,setCompletions]=useState(0),[mounted,setMounted]=useState(true),[reduced,setReduced]=useState(params.has('reduced'));
 const dispatch=useCallback((action:GameEngineAction)=>{if(action.type==='MOMENTUM_ANIMATION_DONE')setCompletions(n=>n+1);setState(s=>engineReducer(s,action));},[]);
 useEffect(()=>{Object.assign(window,{captureState:state.momentum,captureCompletions:completions});},[state,completions]);
 const start=()=>setState(s=>({...s,momentum:{...beginMove(s.momentum as ActiveMomentumState,0),phase:enemy?'animating_ai':'animating_attack'}}));
 useEffect(()=>{Object.assign(window,{captureUnmount:()=>setMounted(false),captureReduce:()=>setReduced(true)});},[]);
 return <div className="pilot-student" data-reduced-motion={reduced}><header className="pilot-savebar"><span>Capture preview</span></header><nav className="student-nav">Home · My Pet · Games</nav><button onClick={start}>Play capture</button><output data-testid="phase">{state.momentum.active?state.momentum.phase:'closed'}</output>{mounted&&state.momentum.active&&<MomentumScreen state={state.momentum} petSpeciesId={null} dispatch={dispatch}/>}</div>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
