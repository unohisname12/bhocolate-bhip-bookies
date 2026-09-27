import type {Visual} from './lessons';
function CoordinateModel({points}:{points:[number,number][]}){
 const extent=Math.max(4,Math.ceil(Math.max(...points.flat().map(Math.abs))/4)*4),scale=120/extent;
 const ticks=Array.from({length:9},(_,i)=>(i-4)*extent/4);
 return <svg viewBox="0 0 320 320" role="img" aria-label={`Coordinate plane with points ${points.map(([x,y])=>`(${x}, ${y})`).join(' and ')}`} style={{width:'100%',maxWidth:420,background:'#f8fafc',color:'#0f172a',borderRadius:12}}>
  {ticks.map(t=><g key={t}><path d={`M ${160+t*scale} 40 V 280 M 40 ${160-t*scale} H 280`} stroke={t===0?'#334155':'#cbd5e1'} strokeWidth={t===0?2:1}/><text x={160+t*scale} y={297} textAnchor="middle" fontSize="10" fill="currentColor">{t}</text><text x={27} y={164-t*scale} textAnchor="end" fontSize="10" fill="currentColor">{t}</text></g>)}
  <text x="298" y="155" fill="currentColor">x</text><text x="168" y="26" fill="currentColor">y</text>
  {points.map(([x,y],i)=><g key={i}><circle cx={160+x*scale} cy={160-y*scale} r={5} fill="#0369a1"/><text x={168+x*scale} y={152-y*scale} fontSize="12" fill="currentColor">{String.fromCharCode(65+i)}</text></g>)}
 </svg>;
}
export function QuantityModel({visual}:{visual?:Visual}){if(!visual)return null;return <figure className="skill-model"><figcaption>{visual.caption}</figcaption>{visual.kind==='coordinate'&&visual.points&&<CoordinateModel points={visual.points}/>}{visual.dots&&<div className="skill-dots" aria-label="Objects to count">{visual.dots.map((n,i)=><span key={i}>{Array.from({length:n},(_,j)=><b key={j} aria-label="one object">●</b>)}</span>)}</div>}<table><tbody>{visual.rows.map(([name,value],i)=><tr key={i}><th scope="row">{name}</th><td>{value}</td></tr>)}</tbody></table></figure>;}
