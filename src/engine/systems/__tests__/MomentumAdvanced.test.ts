import { describe, it, expect } from 'vitest';
import { initMomentum, buildBoard, computeValidMoves, selectPiece, beginMove, advanceAfterAnimation, startNextTurn, tacticalAction, supportTargets, skipTurn, calculateRewards, applyFlashChoice } from '../MomentumSystem';
import { selectAIAction } from '../MomentumAI';
import { momentumTurnLimit, RANK_ENERGY } from '../../../config/momentumConfig';
import type { MomentumPiece, ActiveMomentumState } from '../../../types/momentum';
const piece = (id: string, x: number, y: number, energy = 2, team: 'player'|'enemy' = 'player', rank: 1|2|3|4 = 2):MomentumPiece => ({id,team,rank,energy,position:{x,y},isTemporaryRank4:false,rank4TurnsRemaining:0,previousRank:null});
const board = (pieces:MomentumPiece[]):ActiveMomentumState => ({...initMomentum('medium','advanced'),pieces,board:buildBoard(pieces,7)});

describe('Advanced Momentum',()=>{
 it('keeps Classic and legacy saves at 5×5; Advanced has five pieces per side and seven rows',()=>{
  const classic=initMomentum(); expect(classic.board).toHaveLength(5);expect(classic.pieces).toHaveLength(6);
  for(const difficulty of ['easy','medium','hard'] as const){const advanced=initMomentum(difficulty,'advanced');expect(advanced.board).toHaveLength(7);expect(advanced.pieces).toHaveLength(10);expect(advanced.board[6][6]).toBe('p5');expect(advanced.pieces.every(p=>p.rank>=1&&p.rank<=3)).toBe(true);}
  const legacy={...classic};delete legacy.mode;expect(startNextTurn(legacy).board).toHaveLength(5);
 });
 it('finds bent paths in new rows and columns without passing through pieces',()=>{
  const p=piece('p',6,6,3),wall=piece('wall',6,5),enemy=piece('e',5,5,1,'enemy');
  const moves=computeValidMoves(p,[p,wall,enemy],'advanced');
  expect(moves.find(m=>m.targetPieceId==='e')?.energyCost).toBe(2);
  expect(moves.some(m=>m.destination.x===6&&m.destination.y===4)).toBe(false);
  expect(moves.every(m=>m.destination.x<7&&m.destination.y<7)).toBe(true);
 });
 it('guard costs a turn and 1 energy, adds 2 capture energy, then expires on owner turn',()=>{
  const state=board([piece('p',3,3,2),piece('e',3,2,0,'enemy',1)]);
  const guarded=tacticalAction(state,'p');expect(guarded.activeTeam).toBe('enemy');expect(guarded.pieces[0].energy).toBe(1);expect(guarded.pieces[0].guarded).toBe(true);
  expect(computeValidMoves(guarded.pieces[1],guarded.pieces,'advanced').some(m=>m.isAttack)).toBe(false);
  const attacker={...guarded.pieces[1],energy:3};expect(computeValidMoves(attacker,[guarded.pieces[0],attacker],'advanced').find(m=>m.isAttack)?.energyCost).toBe(3);
  expect(startNextTurn(guarded).pieces[0].guarded).toBe(false);
 });
 it('transfers exactly 2 only to adjacent allies with capacity and ends the turn',()=>{
  const state=board([piece('p',1,6,3),piece('ally',0,6,0),piece('far',4,6,0),piece('e',0,0,0,'enemy')]);
  expect(supportTargets(state,state.pieces[0]).map(p=>p.id)).toEqual(['ally']);
  expect(tacticalAction(state,'p','far')).toBe(state);expect(tacticalAction(state,'p','e')).toBe(state);
  const next=tacticalAction(state,'p','ally');expect(next.pieces[0].energy).toBe(1);expect(next.pieces[1].energy).toBe(2);expect(next.activeTeam).toBe('enemy');
  expect(tacticalAction({...state,mode:'classic'},'p')).toMatchObject({mode:'classic',activeTeam:'player'});
 });
 it('stations recharge only the occupying team at its turn and never exceed cap',()=>{
  const state={...board([piece('p',1,3,0),piece('e',3,3,0,'enemy',3)]),activeTeam:'enemy' as const};
  const next=startNextTurn(state);expect(next.pieces[0].energy).toBe(3);expect(next.pieces[1].energy).toBe(0);
  expect(startNextTurn({...state,pieces:[{...state.pieces[0],energy:4},state.pieces[1]]}).pieces[0].energy).toBe(4);
 });
 it('a non-Flash player capture grants the enemy a real turn with fresh energy',()=>{
  let state=selectPiece(board([piece('p',3,3,4),piece('e',3,2,0,'enemy',1),piece('other',0,0,0,'enemy',2)]),'p');
  state=beginMove(state,state.validMoves.findIndex(m=>m.targetPieceId==='e'));
  const next=advanceAfterAnimation(state);expect(next.phase).toBe('ai_turn');expect(next.activeTeam).toBe('enemy');expect(next.pieces.find(p=>p.id==='other')?.energy).toBe(2);
 });
 it('cannot avoid the limit by skipping or repeatedly guarding',()=>{
  const state={...initMomentum('hard','advanced'),turnCount:momentumTurnLimit('hard','advanced')};
  expect(skipTurn(state).phase).toBe('defeat');expect(tacticalAction(state,'p1').phase).toBe('defeat');
 });
 it('keeps rank-4 Flash at rank 4 and rejects illegal fusion destinations',()=>{
  const state={...board([piece('p',1,1,2,'player',4),piece('a',2,2),piece('b',3,2),piece('e',6,6,0,'enemy')]),phase:'flash_choice' as const,flashPending:{triggerReason:'exact_energy_kill' as const,attackerPieceId:'p',capturedPieceId:'old'}};
  expect(applyFlashChoice(state,'upgrade').pieces[0].rank).toBe(4);
  expect(applyFlashChoice(state,'fusion',{pieceId1:'a',pieceId2:'a',resultPosition:{x:2,y:2}})).toBe(state);
  expect(applyFlashChoice(state,'fusion',{pieceId1:'a',pieceId2:'b',resultPosition:{x:6,y:6}})).toBe(state);
  expect(applyFlashChoice(state,'fusion',{pieceId1:'a',pieceId2:'b',resultPosition:{x:2,y:2}}).board).toHaveLength(7);
 });
 it('previews the actual advanced shard bonus and extended-turn token calculation',()=>{
  const state=initMomentum('hard','advanced');expect(calculateRewards(state)).toEqual({shards:13,xp:20,tokens:60});
 });
 it('AI can use all seven rows and produces legal, energy-bounded actions in a complete match',()=>{
  let state=initMomentum('hard','advanced');
  for(let i=0;i<800&&!['victory','defeat'].includes(state.phase);i++){
   if(state.phase.startsWith('animating')) state=advanceAfterAnimation(state);
   else if(state.phase==='flash_sequence') state=applyFlashChoice(state,'upgrade');
   else if(state.activeTeam==='enemy'){
    const action=selectAIAction(state);
    if(!action)state=skipTurn(state);
    else if(action.tactic)state=tacticalAction(state,action.pieceId,action.targetId);
    else{state=beginMove(selectPiece(state,action.pieceId),action.moveIndex);state={...state,phase:'animating_ai'};}
   }else{
    const choices=state.pieces.filter(p=>p.team==='player').flatMap(p=>computeValidMoves(p,state.pieces,state.mode).map((m,i)=>({p,m,i})));
    const choice=choices.find(c=>c.m.isAttack)??choices[0];state=choice?beginMove(selectPiece(state,choice.p.id),choice.i):skipTurn(state);
   }
   expect(state.board).toHaveLength(7);
   expect(new Set(state.pieces.map(p=>`${p.position.x},${p.position.y}`)).size).toBe(state.pieces.length);
   for(const p of state.pieces){expect(p.energy).toBeGreaterThanOrEqual(0);expect(p.energy).toBeLessThanOrEqual(RANK_ENERGY[p.rank].max);expect(state.board[p.position.y][p.position.x]).toBe(p.id);}
  }
  expect(['victory','defeat']).toContain(state.phase);
 });
});
