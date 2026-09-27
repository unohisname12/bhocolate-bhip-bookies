import { useEffect, useState } from 'react';
import type { NumberMergeGamePhase, NumberMergeOverseerEvent } from './types';

interface NumberMergeOverseerEntityProps {
  phase: NumberMergeGamePhase;
  chainTimeLeftMs: number;
  lastOverseerEvent: NumberMergeOverseerEvent | null;
  corruption: number;
  attackAnimationLevel: 'ambient' | 'warning' | 'reactive' | 'aggressive';
}

/** Four complete, uncropped poses in an evenly spaced 2×2 atlas. */
export function NumberMergeOverseerEntity({phase,lastOverseerEvent,corruption,attackAnimationLevel}:NumberMergeOverseerEntityProps) {
  const [blink,setBlink]=useState(0);
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const timer=window.setInterval(()=>{if(!media.matches&&!document.hidden)setBlink(n=>(n+1)%40);},120);
    return ()=>window.clearInterval(timer);
  },[]);
  const attacking=!!lastOverseerEvent&&['reactive','aggressive'].includes(attackAnimationLevel);
  const warning=phase==='chain_window'||corruption>=70||!!lastOverseerEvent;
  const frame=phase==='won'?3:attacking||phase==='lost'?2:warning?1:blink>=38?3:0;
  return <div className="nm-overseer-entity"><div className="nm-overseer-sprite" role="img" aria-label={`Animated Overseer entity: ${attacking?'casting':warning?'watching closely':'watching'}`} style={{backgroundImage:'url(/assets/number-merge-v2/overseer-atlas.png)',backgroundPosition:`${frame%2*100}% ${Math.floor(frame/2)*100}%`}}/></div>;
}
