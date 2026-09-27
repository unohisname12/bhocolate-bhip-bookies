import type React from 'react';
import type {PieceTheme,BoardTheme} from '../theme/MomentumTheme';
import type {PieceRank,MathPower} from '../../../types/momentum';
import {MATH_POWERS,POWER_ORDER} from '../../../engine/systems/MomentumPowers';
interface BoardPieceProps{team:'player'|'enemy';rank:PieceRank;energy:number;isSelected:boolean;isTemporaryRank4:boolean;pieceTheme:PieceTheme;boardTheme:BoardTheme;onClick?:()=>void;promoteKey?:number|null;mathPower?:MathPower}
export const BoardPiece:React.FC<BoardPieceProps>=({team,rank,energy,isSelected,isTemporaryRank4,boardTheme,onClick,promoteKey,mathPower})=>{
 const index=mathPower?POWER_ORDER.indexOf(mathPower):rank-1,size=Math.max(48,boardTheme.pieceScales[rank]);
 return <div className={`momentum-guardian ${isSelected?'is-selected':''} ${promoteKey!=null?'is-promoted':''}`} data-team={team} onClick={onClick} style={{width:size,height:size}}>
  <span className="momentum-guardian-base"/><span className="momentum-guardian-art" style={{backgroundImage:'url(/assets/momentum-v2/guardians.png)',backgroundPosition:`${index/3*100}% ${team==='enemy'?100:0}%`}}/>
  <span className="momentum-guardian-mark">{mathPower?MATH_POWERS[mathPower].symbol:isTemporaryRank4?'♛':`R${rank}`}</span><span className="momentum-guardian-energy">{energy}<small>⚡</small></span>
 </div>;
};
