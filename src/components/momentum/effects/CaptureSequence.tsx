import {useCallback, useEffect, useRef, useState, type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import type {MomentumPiece} from '../../../types/momentum';
import {MATH_POWERS} from '../../../engine/systems/MomentumPowers';
import {BoardPiece} from '../board/BoardPiece';
import {DEFAULT_THEME} from '../theme/MomentumTheme';
import './CaptureSequence.css';

export const CAPTURE_DURATION = 2800;
const STAGES = [[450,'windup'],[850,'strike'],[1150,'impact'],[1500,'shatter'],[2200,'claim']] as const;
const STYLES = ['add','subtract','multiply','divide'] as const;
const TITLES = {add:'Charging strike',subtract:'Shadow dash',multiply:'Sky lance',divide:'Binding threads'};
const nameOf = (piece:MomentumPiece) => piece.mathPower ? MATH_POWERS[piece.mathPower].name : `Rank ${piece.rank} guardian`;

function prefersStillness(){
  return matchMedia('(prefers-reduced-motion: reduce)').matches || !!document.querySelector('[data-reduced-motion="true"]');
}

/** A visual-only replay. The engine resolves the capture exactly once on completion. */
export function CaptureSequence({attacker,defender,onComplete}:{attacker:MomentumPiece;defender:MomentumPiece;onComplete:()=>void}){
  const [stage,setStage]=useState('focus');
  const [reduced,setReduced]=useState(prefersStillness);
  const callback=useRef(onComplete),finished=useRef(false),skip=useRef<HTMLButtonElement>(null);
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
    const previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';skip.current?.focus({preventScroll:true});
    return()=>{document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus({preventScroll:true});};
  },[]);
  const style=attacker.mathPower??STYLES[attacker.rank-1];
  const captured=stage==='shatter'||stage==='claim'||reduced;
  const renderPiece=(piece:MomentumPiece)=><BoardPiece {...piece} isSelected={false} pieceTheme={piece.team==='player'?DEFAULT_THEME.playerPiece:DEFAULT_THEME.enemyPiece} boardTheme={DEFAULT_THEME}/>;
  return createPortal(<div className="momentum-capture-backdrop" onKeyDown={event=>{
    event.stopPropagation();
    if(event.key==='Escape'){event.preventDefault();finish();}
    if(event.key==='Tab'){event.preventDefault();skip.current?.focus({preventScroll:true});}
  }}>
    <section className="momentum-capture" role="dialog" aria-modal="true" aria-label={`${nameOf(attacker)} captures ${nameOf(defender)}`} data-testid="momentum-capture" data-stage={reduced?'reduced':stage} data-style={style} data-team={attacker.team} data-reduced={reduced}>
      <header><span>{attacker.team==='player'?'YOUR GUARDIAN ATTACKS':'OPPONENT ATTACKS'}</span><h2>{TITLES[style]}</h2><p>{nameOf(attacker)} <span aria-hidden="true">⚔</span> {nameOf(defender)}</p></header>
      <div className="capture-arena" aria-hidden="true">
        <div className="capture-floor"/><div className="capture-rune rune-left"/><div className="capture-rune rune-right"/>
        <div className="capture-actor capture-attacker"><div className="capture-body">{renderPiece(attacker)}<span className="capture-weapon"/></div></div>
        <div className="capture-actor capture-defender"><div className="capture-body">{renderPiece(defender)}<span className="capture-shield"/></div></div>
        <div className="capture-spell"><i/><i/><i/></div><div className="capture-impact"/>
        <div className="capture-fragments">{Array.from({length:16},(_,i)=><i key={i} style={{'--dx':`${Math.cos(i*Math.PI/8)*(60+i%3*22)}px`,'--dy':`${Math.sin(i*Math.PI/8)*72-30}px`,'--spin':`${i*71}deg`,'--delay':`${i%4*25}ms`} as CSSProperties}/>)}</div>
        <div className="capture-claim">✦</div>
      </div>
      <footer><div role="status"><strong>{captured?`${nameOf(defender)} captured!`:'Guardians clash'}</strong><span>{captured?`${attacker.team==='player'?'Your guardian claims':'Opponent claims'} row ${defender.position.y+1}, column ${defender.position.x+1}`:'Watch the attack unfold'}</span></div><button ref={skip} onClick={finish}>Skip animation <span aria-hidden="true">→</span></button></footer>
    </section>
  </div>,document.body);
}
