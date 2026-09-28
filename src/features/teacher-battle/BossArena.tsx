import { useId, type CSSProperties } from 'react';
import { chargeTarget, type View, type Color } from './model';
import { EmoteBubble } from '../pet-identity/Emotes';
import './boss-arena.css';
import { petArt } from './petArt';

/** Original vector character: a classroom champion, with readable, health-driven wear. */
export function TeacherBoss({health=100,color='midnight',victory=false}:{health?:number;color?:Color;victory?:boolean}){
 const id=useId().replace(/:/g,''),worn=health<=70,battered=health<=40;
 return <svg className={`tb-boss tb-${color} ${victory?'tb-boss-victory':''}`} viewBox="0 0 460 480" role="img" aria-label={`Teacher boss: ${health>70?'ready for battle':health>40?'scuffed armor and a cartoon cheek bruise':'battered armor, bandage and cartoon bruises'}`}>
 <defs><linearGradient id={`${id}armor`} x2=".8" y2="1"><stop stopColor="#7395d3"/><stop offset=".5" stopColor="#354a88"/><stop offset="1" stopColor="#182848"/></linearGradient><linearGradient id={`${id}cape`}><stop stopColor="#9b436e"/><stop offset="1" stopColor="#452e63"/></linearGradient><linearGradient id={`${id}gold`} x2="1" y2="1"><stop stopColor="#fff0af"/><stop offset="1" stopColor="#bc823b"/></linearGradient></defs>
 <ellipse cx="240" cy="451" rx="154" ry="19" fill="#030b1c" opacity=".5"/>
 <g className="tb-boss-body" stroke="#101e37" strokeWidth="6" strokeLinejoin="round">
 <path d="M160 174 Q104 230 88 431 L147 416 175 445 218 420 272 446 320 418 365 434 Q350 244 300 176Z" fill={`url(#${id}cape)`}/>
 <path d="M170 328 164 415 210 424 230 338M242 339 258 424 302 414 287 326" fill="#243752"/>
 <path d="m165 399-22 37q-5 17 18 17h58l-2-42m41 0-1 42h61q17-2 11-15l-29-39" fill={`url(#${id}armor)`}/>
 <path d="M162 193 Q233 159 300 193 L290 331 Q233 354 171 330Z" fill={`url(#${id}armor)`}/>
 <path d="m189 187 43 88 43-88-42 13Z" fill="#f3e5cb"/><path d="m226 217-8 42 16 20 14-21-9-41" fill="#ecbd67"/>
 <path d="M157 181 116 204 113 245 165 255 190 209ZM298 181 338 200 349 246 292 256 275 208Z" fill={`url(#${id}gold)`}/>
 <path d="m116 242-17 60 39 14 24-63m136 0 17 58 38-14-12-56" fill={`url(#${id}armor)`}/>
 <path d="M101 295q-20 14-3 33 18 17 36-13M316 296q27-13 36 8 5 23-22 30" fill="#dba17d"/>
 <path d="m166 315 126 0-2 23-117 0Z" fill="#14273d"/><rect x="218" y="313" width="34" height="28" rx="5" fill={`url(#${id}gold)`}/>
 <g className="tb-chalk-staff"><path d="m351 371 20-222" stroke="#eac780" strokeWidth="12"/><path d="m365 155-21-24 14-38 28 0 13 37-23 27Z" fill="#9af8f0"/><path d="m372 105-7 29 9 8" fill="none" stroke="#edfffb" strokeWidth="4"/></g>
 <path d="m173 119 6 43q9 48 55 48t53-49l6-50" fill="#dba17d"/>
 <path d="m173 145-18-22 9-49 41-29 66 11 29 33-5 58-17-37-14 5-8-20q-43 27-73 14Z" fill="#343348"/>
 <path d="m177 84 32-19 47 8" fill="none" stroke="#777387" strokeWidth="9"/>
 <g fill="#b3edee" fillOpacity=".23" stroke="#26334d" strokeWidth="5"><rect x="177" y="124" width="48" height="32" rx="11"/><rect x="239" y="124" width="48" height="32" rx="11"/><path d="M225 135h14"/></g>
 <path d={battered&&!victory?'m191 140 15-5m44 0 14 5':'M197 135v9m60-9v9'} stroke="#182135" strokeWidth="6" strokeLinecap="round"/>
 <path d={battered&&!victory?'M218 181q15-9 29 0':'M216 173q17 17 33-1'} fill="none" stroke="#704c49" strokeWidth="5" strokeLinecap="round"/>
 {worn&&<g className="tb-bruises" stroke="none"><ellipse cx="273" cy="164" rx="13" ry="8" fill="#976c9d"/><path d="m179 279 25 14-10 15m78-32-15 21" fill="none" stroke="#c5d2e9" strokeWidth="4"/></g>}
 {battered&&<g><rect x="182" y="159" width="31" height="13" rx="4" transform="rotate(-15 196 166)" fill="#ffe3b7" stroke="#be9671" strokeWidth="2"/><path d="m234 297 9 11-8 12 14 8M131 215l17 13-11 6" fill="none" stroke="#17273f" strokeWidth="4"/><ellipse cx="202" cy="119" rx="13" ry="5" fill="#976c9d" stroke="none"/></g>}
 </g>
 {victory&&<g fill="#ffdb80" stroke="#704f2e" strokeWidth="3"><path d="m195 40-8-31 27 14 18-22 18 22 28-14-9 31Z"/><path d="m60 121 7 17 18 5-18 6-7 17-6-17-18-6 18-5Zm328 70 6 16 18 6-18 6-6 17-6-17-18-6 18-6Z"/></g>}
 </svg>;
}
export function BossArena({room}:{room:View}){
 const result=room.results.at(-1),reveal=room.phase==='result',finished=room.phase==='finished';
 const winner=!finished||!room.results.length?'none':room.health.students===room.health.teachers?'tie':room.health.students>room.health.teachers?'students':'teachers';
 const students=room.members.filter(m=>m.side==='students'),teachers=room.members.filter(m=>m.side==='teachers');
 const hurt=reveal&&!!result?.damage.teachers,hitClass=reveal&&!!result?.damage.students;
 const ready=new Set(result?.contributors??[]);
 return <section className={`tb-arena tb-winner-${winner} ${hurt?'tb-boss-hit':''} ${hitClass?'tb-class-hit':''}`} aria-label="Classroom battlefield" data-phase={room.phase} data-paused={room.paused}>
 <div className="tb-arena-sky" aria-hidden="true"><span>✦</span><span>✧</span><span>✦</span><span>✧</span></div>
 <header className="tb-arena-heading"><span>THE CLASSROOM COLOSSEUM</span><strong>{room.paused?'Battle paused':room.phase==='lobby'?'Assemble your warriors':room.phase==='question'?'Solve • Choose • Charge':reveal?'The clash!':'The final stand'}</strong><span>ROUND {room.round} / {room.rounds}</span></header>
 <div className="tb-arena-hud">{(['students','teachers'] as const).map(side=><div className={`tb-boss-health tb-health-${side}`} key={side}><div><strong>{side==='students'?'CLASS WARRIORS':teachers.map(m=>m.alias).join(' + ')}</strong><b>{Math.ceil(room.health[side])}<small> / 100</small></b></div><progress aria-label={`${side==='students'?'Class':'Teacher boss'} health`} max={100} value={room.health[side]}/><p>{side==='students'?'Together, you are the challenger':'TEACHER BOSS'}{room.health[side]<=40?' · On the ropes!':''}</p></div>)}</div>
 <div className="tb-arena-stage" key={`${room.round}-${room.phase}`}>
 <div className="tb-arena-floor" aria-hidden="true"/>
 <div className={`tb-warriors ${students.length>24?'tb-warriors-many':''} ${students.length>40?'tb-warriors-full':''}`}>
 {students.map((m,i)=><figure className={`tb-warrior ${reveal&&ready.has(m.id)?'tb-warrior-charged':''}`} style={{'--i':i%16} as CSSProperties} key={m.id}>{room.emotes[m.id]&&<EmoteBubble {...room.emotes[m.id]}/>}<div><img src={petArt(m.pet)} alt={`${m.alias}'s warrior pet`}/><span className="tb-warrior-shield" aria-hidden="true">✦</span></div><figcaption>{m.alias}</figcaption></figure>)}
 {!students.length&&<p className="tb-await-warriors">Your class assembles here.<br/>Join with the match code above.</p>}
 </div>
 <div className="tb-boss-party">{teachers.map(m=><figure className="tb-boss-figure" key={m.id}>{room.emotes[m.id]&&<EmoteBubble {...room.emotes[m.id]}/>}<TeacherBoss health={room.health.teachers} color={m.guardian?.color} victory={winner==='teachers'}/><figcaption>{m.alias}<small>{room.health.teachers>70?'The champion awaits':room.health.teachers>40?'Scuffed, but still standing':'Bruised, brave & still in the fight'}</small></figcaption></figure>)}</div>
 {reveal&&result&&<div className="tb-clash-effects" aria-hidden="true">
 {hurt&&Array.from({length:Math.min(16,Math.max(1,result.charged.students))},(_,i)=><i className="tb-magic-bolt" style={{'--i':i,'--lane':i%5} as CSSProperties} key={i}/>)}
 {hitClass&&<div className="tb-boss-wave">✦</div>}
 {(['students','teachers'] as const).map(side=><div className={`tb-combat-number tb-number-${side}`} key={side}>{result.damage[side]>0&&<b>−{Math.round(result.damage[side])}</b>}{result.shield[side]>0&&<span>Blocked {Math.round(result.shield[side])}</span>}{result.healing[side]>0&&<em>+{Math.round(result.healing[side])} restored</em>}</div>)}
 </div>}
 {winner!=='none'&&<div className="tb-victory-banner" role="status"><span>{winner==='tie'?'✦ HONORS SHARED ✦':winner==='students'?'✦ BOSS DEFEATED ✦':'✦ BOSS VICTORY ✦'}</span><strong>{winner==='tie'?'A shared victory!':winner==='students'?'The class takes the crown!':'The teacher holds the throne!'}</strong><p>{winner==='teachers'?'A worthy challenge. Warriors, prepare your rematch.':winner==='students'?'Teamwork. Smart moves. An epic victory.':'Two mighty teams. One brilliant battle.'}</p></div>}
 {winner!=='none'&&<div className="tb-arena-confetti" aria-hidden="true">{Array.from({length:24},(_,i)=><i key={i} style={{'--i':i} as CSSProperties}/>)}</div>}
 </div>
 <footer className="tb-arena-footer">{(['students','teachers'] as const).map(side=>{const n=side==='students'?students.length:teachers.length,target=chargeTarget(side,n);return <div key={side}><strong>{room.charged[side]} / {n} {side==='students'?'warriors':'teachers'} charged</strong><span>{target?`${target} correct ${target===1?'answer':'answers'} for full team power`:'Waiting for warriors'}</span></div>;})}</footer>
 </section>;
}
