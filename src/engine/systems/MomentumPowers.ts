import type {ActiveMomentumState,MathPower,MomentumPiece,ValidMove} from '../../types/momentum';
export const POWER_ORDER:MathPower[]=['add','subtract','multiply','divide'];
export const MATH_POWERS:Record<MathPower,{name:string;symbol:string;movement:string;power:string;tip:string}>={
 add:{name:'Scout',symbol:'+',movement:'Walk up to 3 straight squares. Pieces block the path.',power:'Charge: add 2 energy to an ally within 2 squares. No energy cost; uses your turn.',tip:'Keep your Scout near a partner to refill their next attack.'},
 subtract:{name:'Shade',symbol:'−',movement:'Slide up to 3 diagonal squares. Pieces block the path.',power:'Drain: spend 2 energy to remove up to 2 from an enemy within 2 squares. Uses your turn.',tip:'Slow a dangerous enemy before it reaches your team.'},
 multiply:{name:'Lancer',symbol:'×',movement:'Vault exactly 2 or 4 straight squares. Jump over pieces. Each energy moves you 2 squares.',power:'Double stride is always active: 1 energy → 2 squares; 2 energy → 4 squares.',tip:'Jump a crowded lane, but check who can capture you afterward.'},
 divide:{name:'Weaver',symbol:'÷',movement:'Move up to 2 squares straight or diagonally. Pieces block the path.',power:'Split: with 2, 4 or 6 energy, give half to an adjacent ally and keep half. Uses your turn.',tip:'With 6 energy, split 3 + 3 to prepare two threats.'},
};
export function powerEnergy(piece:MomentumPiece){return piece.mathPower?{gain:1,max:6}:null;}
const straight=[[0,-1],[1,0],[0,1],[-1,0]],diagonal=[[1,1],[1,-1],[-1,1],[-1,-1]];
export function powerMoves(piece:MomentumPiece,pieces:MomentumPiece[]):ValidMove[]{
 const role=piece.mathPower;if(!role||piece.energy<=0)return[];
 const dirs=role==='subtract'?diagonal:role==='divide'?[...straight,...diagonal]:straight;
 const max=role==='multiply'?4:role==='divide'?2:3,moves:ValidMove[]=[];
 for(const [dx,dy] of dirs)for(let distance=1;distance<=max;distance++){
  const x=piece.position.x+dx*distance,y=piece.position.y+dy*distance;if(x<0||y<0||x>=7||y>=7)break;
  const occupant=pieces.find(p=>p.position.x===x&&p.position.y===y);
  if(role==='multiply'&&distance%2)continue;
  const cost=role==='multiply'?distance/2:distance;if(cost>piece.energy)break;
  if(!occupant||occupant.team!==piece.team)moves.push({destination:{x,y},energyCost:cost,isAttack:!!occupant,targetPieceId:occupant?.id??null});
  if(occupant&&role!=='multiply')break;
 }
 return moves;
}
export function powerTargets(state:ActiveMomentumState,piece:MomentumPiece){
 if(state.mode!=='powers'||!piece.mathPower)return[];
 return state.pieces.filter(target=>{
  if(target.id===piece.id)return false;
  const distance=Math.max(Math.abs(target.position.x-piece.position.x),Math.abs(target.position.y-piece.position.y));
  if(piece.mathPower==='add')return target.team===piece.team&&distance<=2&&target.energy<=4;
  if(piece.mathPower==='subtract')return target.team!==piece.team&&distance<=2&&piece.energy>=2&&target.energy>0;
  if(piece.mathPower==='divide')return target.team===piece.team&&distance===1&&piece.energy>0&&piece.energy%2===0&&target.energy+piece.energy/2<=6;
  return false;
 });
}
/** Pure power resolution; the caller switches turns exactly once. */
export function applyMathPower(state:ActiveMomentumState,pieceId:string,targetId?:string):ActiveMomentumState{
 if(state.mode!=='powers'||!['player_select','player_move','ai_turn'].includes(state.phase))return state;
 const piece=state.pieces.find(p=>p.id===pieceId&&p.team===state.activeTeam);
 const target=piece&&powerTargets(state,piece).find(p=>p.id===targetId);if(!piece||!target)return state;
 const role=piece.mathPower!,amount=role==='divide'?piece.energy/2:role==='subtract'?Math.min(2,target.energy):2;
 const pieces=state.pieces.map(p=>p.id===piece.id?{...p,energy:role==='divide'?piece.energy/2:role==='subtract'?piece.energy-2:piece.energy}:p.id===target.id?{...p,energy:p.energy+(role==='subtract'?-amount:amount)}:p);
 const message=role==='add'?`Scout adds 2 energy: ${target.energy} + 2 = ${target.energy+2}.`:role==='subtract'?`Shade drains ${amount}: ${target.energy} − ${amount} = ${target.energy-amount}.`:`Weaver splits ${piece.energy} ÷ 2: keeps ${amount}, gives ${amount}.`;
 return {...state,pieces,log:[...state.log,{turn:state.turnCount,actor:state.activeTeam,message}],selectedPieceId:null,validMoves:[],lastEvent:null};
}
