import { PET_ANIMATIONS } from '../src/config/petAnimationCoverage';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PetSprite } from '../src/components/pet/PetSprite';
import { GROWING_PETS,GROWTH_STAGES } from '../src/config/companionConfig';
function Gallery(){
 const [animation,setAnimation]=useState('idle'),[paused,setPaused]=useState(false);
 return <main style={{position:'fixed',inset:0,overflow:'auto',zIndex:99999,background:'#f2eddf',color:'#345647',padding:32}}><h1>Companion motion check</h1><label>Animation<select aria-label="Animation" value={animation} onChange={e=>setAnimation(e.target.value)}>{PET_ANIMATIONS.map(a=><option key={a}>{a}</option>)}</select></label><button onClick={()=>setPaused(!paused)}>{paused?'Resume':'Pause'}</button><section style={{display:'grid',gridTemplateColumns:'repeat(9,1fr)',gap:8,marginTop:32}}>{GROWTH_STAGES.flatMap(stage=>Object.entries(GROWING_PETS).map(([id,companion])=><article key={`${id}-${stage}`} style={{display:'grid',justifyItems:'center',padding:6,background:'#fffdf4',borderRadius:20}}><PetSprite speciesId={id} stage={stage} animationName={animation} paused={paused} scale={1.1}/><p>{companion.name} · {stage}</p></article>))}</section></main>;
}
export function mount(){const host=document.createElement('div');document.body.append(host);createRoot(host).render(<Gallery/>);}
