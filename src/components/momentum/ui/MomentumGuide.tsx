import {MomentumPowerActions,MomentumPowerCards} from './MomentumPowerGuide';
import { GameRules } from '../../game/GameRules';
import { useState } from 'react';
import type { ActiveMomentumState, MomentumPiece } from '../../../types/momentum';
import { RANK_ENERGY, momentumTurnLimit, MOMENTUM_REWARDS } from '../../../config/momentumConfig';
import { computeValidMoves, supportTargets } from '../../../engine/systems/MomentumSystem';
import type { GameEngineAction } from '../../../engine/core/ActionTypes';

export function MomentumRules({ advanced = false }: { advanced?: boolean }) {
  const [selected, setSelected] = useState(false), [done, setDone] = useState(false);
  const piece: MomentumPiece = { id: 'lesson', team: 'player', rank: 1, energy: 2, position: { x: 1, y: 2 }, isTemporaryRank4: false, rank4TurnsRemaining: 0, previousRank: null };
  const enemy: MomentumPiece = { ...piece, id: 'target', team: 'enemy', rank: 3, position: { x: 3, y: 2 } };
  const moves = computeValidMoves(piece, [piece, enemy]);
  return <section aria-label="Momentum rules" className="momentum-rules">
    <h3>One turn, one choice</h3>
    <ol><li>Tap a blue piece. R is its rank; the number below it is energy, its movement budget.</li><li>Tap a numbered green square to move, or a red target to capture. The number is the energy cost.</li><li>Then the opponent takes a turn. Your pieces recharge when your next turn starts.</li></ol>
    <p>Paths go up, down, left and right; they can bend. Each step costs 1 energy. Pieces block paths. Any rank can capture any other rank if it can afford to reach it.</p>
    <p>Rank controls recharge and capacity: rank 1 gets +1 (holds 2), rank 2 gets +2 (holds 4), rank 3 gets +3 (holds 6). Skip Turn saves energy for later, but the opponent acts too.</p>
    <h3>Try a capture — practice only</h3>
    <p role="status">{done ? 'Captured! Two steps cost 2 energy. Your rank-1 piece can capture rank 3. Reset to try again.' : selected ? 'Tap the red R3 target. You can reach it with exactly 2 energy.' : 'Tap the blue R1 piece with 2 energy.'}</p>
    <div className="momentum-example" aria-label="Practice capture board">{Array.from({length:25},(_,i)=>{const x=i%5,y=Math.floor(i/5),own=x===1&&y===2,target=x===3&&y===2,move=moves.find(m=>m.destination.x===x&&m.destination.y===y);return <button key={i} aria-label={own?'Practice blue piece':target?'Practice red target':`Practice row ${y+1} column ${x+1}`} style={{background:own?'#155e75':target?'#991b1b':selected&&move?'#166534':'#1e293b'}} onClick={()=>{if(own&&!done)setSelected(true);if(target&&selected)setDone(true);}} disabled={done||(!own&&!target)}>{own?'R1 · 2':target?(done?'✓':'R3'):selected&&move?move.energyCost:'·'}</button>;})}</div>
    <button onClick={()=>{setSelected(false);setDone(false);}}>Reset example</button>
    {advanced&&<><h3>Advanced tactics</h3><ul><li><strong>Guard:</strong> spend 1 energy and your turn. Capturing that piece costs the opponent 2 extra energy until your next turn.</li><li><strong>Transfer:</strong> spend your turn to give exactly 2 energy to a horizontally or vertically adjacent teammate. It needs room for both energy.</li><li><strong>Energy stations (⚡):</strong> hold one of the three middle-row stations until your next turn for +1 extra energy, up to your rank’s cap. Either side can use them.</li></ul></>}
    <details><summary>Upgrades, Flash and winning</summary><p>Capturing a higher rank promotes a rank-1 or rank-2 attacker by one rank. Capturing with all your energy, or capturing a higher rank, also earns a Flash choice: upgrade your attacker or fuse two of your rank-2 pieces into one rank-3 piece at one of their squares. Fusion trades board coverage for energy capacity. Rank 4 is temporary.</p><p>If you fall two pieces behind, a gold comeback square may appear. Land on it to gain a rank. Capture every enemy within the turn limit to win. Losing all your pieces or reaching the limit ends the game with no win reward. There is no clock while you think.</p></details>
  </section>;
}
export function MomentumCoach({ state, dispatch }: {state:ActiveMomentumState;dispatch:(action:GameEngineAction)=>void}) {
  const piece=state.pieces.find(p=>p.id===state.selectedPieceId);
  const yourTurn=state.activeTeam==='player'&&['player_select','player_move'].includes(state.phase);
  const rewards=MOMENTUM_REWARDS.baseShards+MOMENTUM_REWARDS.difficultyShardBonus[state.difficulty]+(state.mode==='advanced'?3:0);
  if(state.mode==='powers')return <section className="momentum-coach" aria-label="Move guidance"><div role="status">{yourTurn?'Your turn · move or use one power.':'Opponent moving…'}</div><MomentumPowerActions state={state} dispatch={dispatch}/><GameRules name="Power Clash"><p>Capture all four enemies before turn 60. Every guardian recharges +1 energy per turn, up to 6. Moves spend energy; each move or power ends your turn. Both teams have the same powers. No Flash upgrades, stations or comeback tiles in this mode.</p><MomentumPowerCards/></GameRules></section>;
  return <section className="momentum-coach" aria-label="Move guidance">
    <div role="status">{yourTurn ? piece ? `Selected rank ${piece.rank} · ${piece.energy}/${RANK_ENERGY[piece.rank].max} energy. ${state.validMoves.length ? `${state.validMoves.length} destinations available.` : 'No affordable moves.'}` : 'Your move · select a blue piece.' : 'Opponent moving…'}</div>
    {yourTurn&&piece&&state.mode==='advanced'&&<div className="momentum-tactics"><button disabled={piece.energy<1||piece.guarded} onClick={()=>dispatch({type:'MOMENTUM_TACTIC',pieceId:piece.id})}>Guard · 1 energy</button>{supportTargets(state,piece).map(target=><button key={target.id} onClick={()=>dispatch({type:'MOMENTUM_TACTIC',pieceId:piece.id,targetId:target.id})}>Give 2 energy → row {target.position.y+1}, column {target.position.x+1}</button>)}</div>}
    <GameRules name="Momentum">
      <MomentumRules advanced={state.mode==='advanced'}/>
      <p>Lightning stations give +1 recharge at the start of your next turn. Other floor colors are decoration.</p>
      <h3>Win rewards & turn limit</h3><p>Win by turn {momentumTurnLimit(state.difficulty,state.mode)}: {rewards} shards, 20 pet XP, and 30 tokens + 2 for each unused turn, up to 60 tokens. No win rewards for losing or forfeiting.</p>
    </GameRules>
  </section>;
}
