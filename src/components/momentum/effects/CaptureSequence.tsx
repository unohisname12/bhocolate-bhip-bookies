import {useCallback, useEffect, useRef, useState, type CSSProperties} from 'react';
import type {MomentumPiece} from '../../../types/momentum';
import {MATH_POWERS} from '../../../engine/systems/MomentumPowers';
import {BoardPiece} from '../board/BoardPiece';
import {DEFAULT_THEME} from '../theme/MomentumTheme';
import './CaptureSequence.css';

export const CAPTURE_DURATION = 2800;
const STAGES = [[450,'windup'],[850,'strike'],[1150,'impact'],[1500,'shatter'],[2200,'claim']] as const;
const STYLES = ['add','subtract','multiply','divide'] as const;
const TITLES = {add:'Charging strike',subtract:'Shadow dash',multiply:'Sky lance',divide:'Binding threads'};
export interface BoardCapture {attacker:MomentumPiece;defender:MomentumPiece;onComplete:()=>void;sequenceKey:string}
const nameOf = (piece:MomentumPiece) => piece.mathPower ? MATH_POWERS[piece.mathPower].name : `Rank ${piece.rank} guardian`;

function prefersStillness(){
  return matchMedia('(prefers-reduced-motion: reduce)').matches || !!document.querySelector('[data-reduced-motion="true"]');
}

/** A visual-only replay. The engine resolves the capture exactly once on completion. */
export function CaptureSequence({attacker,defender,onComplete,cellSize,gridGap,boardSize}:{attacker:MomentumPiece;defender:MomentumPiece;onComplete:()=>void;cellSize:number;gridGap:number;boardSize:number}){
  const [stage,setStage]=useState('focus');
  const [reduced,setReduced]=useState(prefersStillness);
  const callback=useRef(onComplete),finished=useRef(false);
  useEffect(()=>{callback.current=onComplete;},[onComplete]);
  const finish=useCallback(()=>{if(finished.current)return;finished.current=true;callback.current();},[]);
  useEffect(()=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>setReduced(prefersStillness());
    const observer=new MutationObserver(update);
    observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['data-reduced-motion']});
    media.addEventListener('change',update);
    return()=>{media.removeEventListener('change',update);observer.disconnect();};
  },[]);
  useEffect(()=>{
    const timers = reduced ? [setTimeout(finish,700)] : [
      ...STAGES.map(([time,next])=>setTimeout(()=>setStage(next),time)),
      setTimeout(finish,CAPTURE_DURATION),
    ];
    return()=>timers.forEach(clearTimeout);
  },[finish,reduced]);
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();finish();}};
    window.addEventListener('keydown',key);
    return()=>window.removeEventListener('keydown',key);
  },[finish]);
  const style=attacker.mathPower??STYLES[attacker.rank-1];
  const captured=stage==='shatter'||stage==='claim'||reduced;
  const renderPiece=(piece:MomentumPiece)=><BoardPiece {...piece} isSelected={false} pieceTheme={piece.team==='player'?DEFAULT_THEME.playerPiece:DEFAULT_THEME.enemyPiece} boardTheme={DEFAULT_THEME}/>;
  const step=cellSize+gridGap;
  const from={x:attacker.position.x*step,y:attacker.position.y*step};
  const to={x:defender.position.x*step,y:defender.position.y*step};
  const distance=Math.hypot(to.x-from.x,to.y-from.y)||1;
  const direction={x:(to.x-from.x)/distance,y:(to.y-from.y)/distance};
  const contact={x:to.x-direction.x*cellSize*.65,y:to.y-direction.y*cellSize*.65};
  const arriving=['strike','impact','shatter'].includes(stage)&&style!=='divide';
  const current=stage==='claim'?to:arriving?contact:from;
  const middle=cellSize/2;
  const vars={'--cell':`${cellSize}px`,'--piece-scale':Math.min(1,(boardSize/(Math.round((boardSize+gridGap)/step))-9)/58),'--angle':`${Math.atan2(direction.y,direction.x)*180/Math.PI}deg`,'--recoil-x':`${direction.x*cellSize*.15}px`,'--recoil-y':`${direction.y*cellSize*.15}px`} as CSSProperties;
  return <div className="momentum-board-capture" data-testid="momentum-capture" data-stage={reduced?'reduced':stage} data-style={style} data-team={attacker.team} data-reduced={reduced} style={vars}>
    <div className="board-capture-effects" style={{width:boardSize,height:boardSize}} aria-hidden="true">
      <div className="board-capture-square" style={{left:from.x,top:from.y}}/>
      <div className="board-capture-square target" style={{left:to.x,top:to.y}}/>
      <div className="board-capture-actor attacker" data-testid="capture-attacker" style={{left:current.x,top:current.y}}><div className="board-capture-motion"><div className="board-capture-piece">{renderPiece(attacker)}</div><span className="board-capture-weapon"/></div></div>
      <div className="board-capture-actor defender" data-testid="capture-defender" style={{left:to.x,top:to.y}}><div className="board-capture-motion"><div className="board-capture-piece">{renderPiece(defender)}</div><span className="board-capture-shield"/></div></div>
      <svg className="board-capture-spell" viewBox={`0 0 ${boardSize} ${boardSize}`}><path d={`M ${from.x+middle} ${from.y+middle} Q ${(from.x+to.x)/2+middle+direction.y*cellSize} ${(from.y+to.y)/2+middle-direction.x*cellSize} ${to.x+middle} ${to.y+middle}`}/><path d={`M ${from.x+middle} ${from.y+middle} Q ${(from.x+to.x)/2+middle-direction.y*cellSize} ${(from.y+to.y)/2+middle+direction.x*cellSize} ${to.x+middle} ${to.y+middle}`}/><ellipse cx={to.x+middle} cy={to.y+middle} rx={cellSize*.45} ry={cellSize*.3}/></svg>
      <div className="board-capture-impact" style={{left:to.x+middle,top:to.y+middle}}/>
      <div className="board-capture-fragments" style={{left:to.x+middle,top:to.y+middle}}>{Array.from({length:14},(_,i)=><i key={i} style={{'--dx':`${Math.cos(i*Math.PI/7)*cellSize*.6}px`,'--dy':`${Math.sin(i*Math.PI/7)*cellSize*.6}px`,'--spin':`${i*71}deg`,'--delay':`${i%4*25}ms`} as CSSProperties}/>)}</div>
      <div className="board-capture-claim" style={{left:to.x,top:to.y}}>✦</div>
    </div>
    <div className="board-capture-status"><span role="status">{captured?`${nameOf(defender)} captured!`:`${nameOf(attacker)} · ${TITLES[style]}`}</span><button onClick={finish}>Skip animation</button></div>
  </div>;
}
