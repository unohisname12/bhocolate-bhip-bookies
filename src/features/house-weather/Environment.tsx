import {useId, type CSSProperties, type Dispatch, type SetStateAction} from 'react';
import {ICONS, LABELS, WEATHER, type Environment, type Preferences, type Weather} from './model';
import type {World} from '../living-house/world';
import {TILE} from '../living-house/world';
import meta from '../living-house/houseArtMeta';
import type {HomeBase} from '../home-base/model';
import './weather.css';
export function WeatherPanel({environment:e,prefs,setPrefs,preview}:{environment:Environment;prefs:Preferences;setPrefs:Dispatch<SetStateAction<Preferences>>;preview:(w?:Weather)=>void}) {
 return <details className="weather-panel"><summary><span className="weather-symbol" aria-hidden="true">{e.night&&e.weather==='clear'?'☾':ICONS[e.weather]}</span><span><strong>{LABELS[e.weather]}</strong><small>{e.season} · {e.phase}{e.preview?' · preview':''}</small></span><span className="weather-expand" aria-hidden="true">⌄</span></summary>
 <div className="weather-content"><div className="weather-vista" data-phase={e.phase} data-weather={e.weather}><span className="weather-orb"/><span className="weather-bird"/><span className="weather-bird bird-two"/>{e.moment.startsWith('A rainbow')&&<span className="weather-rainbow"/>}<span className="weather-cloud cloud-one"/><span className="weather-cloud cloud-two"/><span className="weather-hill hill-back"/><span className="weather-hill"/><span className="weather-cottage"><i/></span><div className="weather-vista-particles">{Array.from({length:12},(_,i)=><i key={i} style={{left:`${i*9}%`,animationDelay:`-${i*.73}s`}}/>)}</div><p>{e.moment}</p></div>
 <p className="weather-explanation">Your pet’s own changing world. Weather changes about every 20 minutes, even offline.</p>
 <div className="weather-facts"><span>{e.temperature}°C <small>in-game</small></span><span>{e.wind} km/h <small>breeze</small></span><span>{e.moon}</span></div>
 <h3>Coming skies</h3><ol className="weather-forecast">{e.forecast.map(f=><li key={f.at}><time>{new Date(f.at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</time><b aria-hidden="true">{ICONS[f.weather]}</b><span>{LABELS[f.weather]}</span></li>)}</ol>
 <label>Day & night<select value={prefs.clock} onChange={v=>setPrefs(p=>({...p,clock:v.target.value as Preferences['clock']}))}><option value="local">Follow my clock</option><option value="story">Story day · 24 minutes</option></select></label>
 <label>Seasons<select value={prefs.hemisphere} onChange={v=>setPrefs(p=>({...p,hemisphere:v.target.value as Preferences['hemisphere']}))}><option value="north">Northern seasons</option><option value="south">Southern seasons</option></select></label>
 <label>Try a sky<select aria-label="Preview weather" value={e.preview?e.weather:'auto'} onChange={v=>preview(v.target.value==='auto'?undefined:v.target.value as Weather)}><option value="auto">Automatic weather</option>{WEATHER.map(w=><option key={w} value={w}>{LABELS[w]}</option>)}</select></label>
 <small>Previews return to the natural forecast after 15 minutes. Weather never harms your pet or spends anything.</small>
 <label>Ambient volume<input aria-label="Ambient volume" type="range" min="0" max="0.6" step="0.05" value={prefs.volume} onChange={v=>setPrefs(p=>({...p,volume:Number(v.target.value)}))}/></label><small>Use Sound on below the room to listen. Effects pause when this tab is hidden.</small>
 </div></details>;
}
export function WeatherWorld({world,floor,home,environment:e}:{world:World;floor:number;home:HomeBase;environment:Environment}) {
 const id=useId().replaceAll(':',''),width=world.width*TILE,height=world.height*TILE;
 const rooms=world.rooms.filter(r=>r.floor===floor);
 const flakes=e.weather==='snow'||e.season==='spring', falling=['rain','snow','wind'].includes(e.weather)||e.season==='autumn'||e.season==='spring';
 return <><svg className="weather-outside" width={width} height={height} aria-hidden="true" data-weather={e.weather} data-season={e.season} data-phase={e.phase}>
 <defs><mask id={id}><rect width={width} height={height} fill="white"/>{rooms.map(r=><rect key={r.id} x={r.x*TILE-15} y={r.y*TILE-meta.wallHeight-16} width={r.w*TILE+30} height={r.h*TILE+meta.wallHeight+48} fill="black"/>)}{[...world.open.values()].filter(p=>p.floor===floor).map(p=><rect key={`${p.x}:${p.y}`} x={p.x*TILE-14} y={p.y*TILE-16} width={TILE+28} height={TILE+44} fill="black"/>)}</mask></defs>
 <g mask={`url(#${id})`}><rect width={width} height={height} className="weather-ground"/>{Array.from({length:45},(_,i)=><g key={i} transform={`translate(${i*173%width},${i*97%height})`}><path d="M0 10L3 0L6 10M8 10L10 4L13 10" fill="none" stroke="currentColor" opacity=".25"/>{e.night&&<rect className="weather-firefly" x="12" y="-6" width="2" height="2" fill="#f5e6a0" style={{animationDelay:`-${i*.3}s`}}/>}</g>)}
 {falling&&Array.from({length:55},(_,i)=><rect className="weather-fall" key={i} x={i*137%width} y={i*79%height} width={e.weather==='rain'?1:flakes?3:6} height={e.weather==='rain'?13:3} fill={e.weather==='rain'?'#bad9e9':e.weather==='snow'?'#f4f4ec':e.season==='spring'?'#f1becb':'#d2a354'} style={{animationDelay:`-${i*.7}s`,animationDuration:e.weather==='rain'?'1.5s':'7s'}}/>)}
 {e.weather==='mist'&&<rect className="weather-mist" width={width} height={height} fill="#c1d5cf" opacity=".18"/>}</g></svg>
 {rooms.filter(r=>r.owned).flatMap(r=>{const bands=(meta.lights as Record<string,number[][][]>)[r.id]?.[home.rooms[r.id]?.tier??0]??[];return bands.map(([a,b],i)=><div key={`${r.id}:${i}`} className="weather-window" data-weather={e.weather} data-phase={e.phase} style={{left:r.x*TILE+a,top:r.y*TILE-145,width:b-a,height:76} as CSSProperties} aria-hidden="true"><span className="weather-window-shade"/>{Array.from({length:7},(_,n)=><i key={n} style={{left:`${n*15}%`,animationDelay:`-${n*.61}s`}}/>)}</div>);})}
 </>;
}
