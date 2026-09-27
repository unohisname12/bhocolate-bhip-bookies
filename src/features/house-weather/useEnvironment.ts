import {useEffect, useMemo, useState} from 'react';
import {DEFAULTS, environmentAt, preferences, type Preferences, type Weather} from './model';
const KEY = 'vpet-living-weather-v1';
export function useEnvironment() {
 const [prefs, setPrefs] = useState<Preferences>(()=>{try{return preferences(JSON.parse(localStorage.getItem(KEY)??'null'));}catch{return DEFAULTS;}});
 const [now, setNow] = useState(()=>Date.now());
 const [visible, setVisible] = useState(()=>!document.hidden);
 useEffect(()=>{const refresh=()=>{setVisible(!document.hidden);if(!document.hidden)setNow(Date.now());};const timer=window.setInterval(refresh,10000);document.addEventListener('visibilitychange',refresh);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};},[]);
 useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(prefs));}catch{/* Atmosphere never depends on save storage. */}},[prefs]);
 const environment=useMemo(()=>environmentAt(now,prefs),[now,prefs]);
 const preview=(weather?: Weather)=>{const at=Date.now();setNow(at);setPrefs(p=>({...p,preview:weather,until:weather?at+15*60000:undefined}));};
 return {environment, prefs, setPrefs, preview, visible};
}
