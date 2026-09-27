import {useEffect,useRef,useState} from 'react';
import type {EngineState} from '../../types/engine';
import {PetSprite} from '../../components/pet/PetSprite';
import {WIDTH,SHAPE_NAMES,track} from './catalog';
import {answerChoices,adventureSize,flowPrompt,piece,shape,fits,landing,question,type Run} from './game';
import type {StackCommand} from './model';
import './flow.css';
type Props={run:Run;state:EngineState;busy:boolean;send:(c:StackCommand)=>Promise<void>;skills:()=>void;example:()=>void};
export default function FlowGame(p:Props){
 const {run:r,state,busy,send,skills,example}=p,pet=state.pet;
 const panel=useRef<HTMLDivElement>(null);
 useEffect(()=>{panel.current?.scrollIntoView({block:'start'});},[r.id]);
 return <div className="flow-game" ref={panel} data-testid="flow-game"><div className="flow-top"><div><small>{track(r.track).grade===0?'KINDERGARTEN':`GRADE ${track(r.track).grade}`} · {track(r.track).skill}</small><h2>{track(r.track).name}</h2></div><div className="flow-score"><b>{r.score}</b><span>POINTS</span></div><div className="flow-score"><b>{r.cleared}</b><span>ROWS</span></div></div>
 <div className="flow-progress" aria-label={`${r.round} of ${adventureSize(r)} questions complete`}>{Array.from({length:adventureSize(r)},(_,i)=><i key={i} className={i<r.round?'done':''}>{i<r.round?'★':i+1}</i>)}</div>
 {r.status==='won'?<section className="flow-win"><span className="flow-trophy">★</span><h2>You did it!</h2><p>12 answers solved. {r.cleared} rows cleared.</p><strong>{r.score} points</strong><p>{state.mathStack?.notice}</p><button className="ms-primary" disabled={busy} onClick={()=>void send({kind:'start',track:r.track,mode:'flow'})}>Play another adventure →</button><button onClick={skills}>Try another grade or skill</button></section>:<Play key={`${r.id}:${r.drops}`} {...p}/>}
 <footer className="flow-pet">{pet&&<PetSprite speciesId={pet.speciesId} stage={pet.stage} animationName={r.round?'happy':'idle'} scale={.55} equippedCosmetics={state.cosmetics.equipped[pet.id]}/>}<div><b>{pet?.name??'Your stacking buddy'}</b><p role="status">{busy?'Saving your move…':r.message}</p><small>{r.round?state.mathStack?.notice:'No timer. Think as long as you need.'}</small></div></footer>
 <div className="flow-help"><button disabled={busy||r.status==='won'} onClick={()=>void send({kind:'hint',revision:r.revision})}>Hint</button><button disabled={busy} onClick={example}>How to play</button><details><summary>Keyboard controls</summary><p>1 / 2 / 3 choose an answer · ← → move · ↑ rotate · Space drops when the board is focused. You can also tap the board to aim.</p></details></div>
 </div>;
}
function Play({run:r,busy,send}:Props){
 const [choice,setChoice]=useState<number|null>(null),[x,setX]=useState(2),[rotation,setRotation]=useState(0);
 const board=useRef<HTMLDivElement>(null),lock=useRef(false),answers=answerChoices(r),ps=piece(r,0,rotation,choice??0),y=landing(r,0,rotation,choice??0,x),q=question(r);
 const move=(delta:number)=>{if(fits(r,ps,x+delta,0))setX(x+delta);};
 const rotate=()=>{const next=(rotation+1)%4;for(const d of [0,-1,1,-2,2])if(fits(r,piece(r,0,next,choice??0),x+d,0)){setRotation(next);setX(x+d);return;}};
 const choose=(i:number)=>{setChoice(i);board.current?.focus({preventScroll:true});};
 const drop=async()=>{if(choice===null||busy||lock.current||r.status!=='playing')return;lock.current=true;try{await send({kind:'drop',revision:r.revision,tray:0,rotation,value:choice,x});}finally{lock.current=false;}};
 const aim=(column:number)=>{const width=Math.max(...ps.map(p=>p.x))+1;const target=Math.max(0,Math.min(WIDTH-width,column-Math.floor(width/2)));if(fits(r,ps,target,0))setX(target);};
 return <section className="flow-play" onKeyDown={e=>{if(busy||r.status!=='playing')return;if(['1','2','3'].includes(e.key)){e.preventDefault();choose(Number(e.key)-1);}else if(['ArrowLeft','ArrowRight','ArrowUp'].includes(e.key)){e.preventDefault();if(e.key==='ArrowUp')rotate();else move(e.key==='ArrowLeft'?-1:1);}else if(e.key===' '&&e.target===board.current){e.preventDefault();void drop();}}}>
 <div className="flow-question"><span>QUESTION {r.round+1} OF 12</span><h2>{flowPrompt(r)}</h2>{r.track==='bonds'&&<div className="flow-count" aria-label={`${q.target} counting blocks`}>{Array.from({length:q.target},(_,i)=><i key={i}/>)}</div>}<p>{choice===null?'① Solve it. Choose your answer piece.':'② Aim the outline. ③ Drop your answer!'}</p></div>
 <div className="flow-arena"><div className="flow-answers" role="group" aria-label="Answer pieces">{answers.map((a,i)=><button key={i} aria-pressed={choice===i} disabled={busy} onClick={()=>choose(i)}><span className="flow-answer-key">{i+1}</span><strong>{a.text}</strong><span className="flow-shape" aria-hidden="true">{piece(r,0,0,i).map((p,k)=><i key={k} style={{left:p.x*17,top:p.y*17}}/>)}</span><small>{choice===i?'SELECTED':'CHOOSE PIECE'}</small></button>)}</div>
 <div className="flow-well"><div className="flow-board" role="grid" ref={board} tabIndex={0} aria-label="Stack board. Tap a column to aim, or use arrow keys." onPointerDown={e=>{if(busy)return;const rect=e.currentTarget.getBoundingClientRect();aim(Math.floor((e.clientX-rect.left)/rect.width*WIDTH));board.current?.focus({preventScroll:true});}}>
 {r.board.flatMap((row,ry)=>row.map((c,cx)=>{const ghost=choice!==null&&y>=0&&ps.some(p=>p.x+x===cx&&p.y+y===ry);return <div key={`${ry}:${cx}`} role="gridcell" aria-label={`Row ${ry+1}, column ${cx+1}: ${c?'block':ghost?'landing':'empty'}`} className={`flow-cell ${c?'solid':ghost?'outline':''}`} style={{'--block-color':`${(ry*19+cx*7)%70+150}`} as React.CSSProperties}>{ghost&&!c&&ps[0].x+x===cx&&ps[0].y+y===ry?<span>↓</span>:null}</div>;}))}
 {choice===null&&<div className="flow-board-guide"><span>↑</span><b>Choose an answer piece</b><small>Then aim it here.</small></div>}
 {r.status==='blocked'&&<div className="flow-board-guide"><b>Let’s make some room!</b><button disabled={busy} onClick={()=>void send({kind:'retry',revision:r.revision})}>Fresh board · keep score</button></div>}
 </div><div className="flow-board-caption">{y<0?'No room here. Move your piece or clear space.':choice===null?'Full rows burst for bonus points.':`${SHAPE_NAMES[shape(r,0)]} piece · Answer ${answers[choice].text}`}</div></div>
 <div className="flow-controls"><button aria-label="Move left" disabled={busy||choice===null} onClick={()=>move(-1)}>←</button><button disabled={busy||choice===null} onClick={rotate}>↻ Rotate</button><button aria-label="Move right" disabled={busy||choice===null} onClick={()=>move(1)}>→</button><button className="ms-primary flow-drop" disabled={busy||choice===null||r.status!=='playing'} onClick={()=>void drop()}>{busy?'Saving…':'Drop ↓'}</button><button className="flow-reset" disabled={busy} onClick={()=>void send({kind:'retry',revision:r.revision})}>Clear space · keep score</button></div></div>
 {r.round>0&&<div className="flow-celebrate" key={r.round} aria-hidden="true">{r.message.startsWith('Row')||r.message.includes('rows cleared')?'✦ ROW CLEAR! ✦':'★ NICE ANSWER! ★'}</div>}
 {r.message.startsWith('Not quite')&&<p className="flow-try" role="alert">Try another answer. Nothing lost! {q.hint}</p>}
 </section>;
}
