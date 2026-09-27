import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import './display-size.css';
const KEY='vpet-display-size',EVENT='vpet-display-size-change';
const levels=[1,1.15,1.3,1.5];
function readDisplaySize(){try{const n=Number(localStorage.getItem(KEY));return levels.includes(n)?n:1;}catch{return 1;}}
let current=readDisplaySize();
const subscribe=(notify:()=>void)=>{window.addEventListener(EVENT,notify);return()=>window.removeEventListener(EVENT,notify);};
const originalMedia=new WeakMap<CSSMediaRule,string>();
/** Reflow at the effective viewport, just as browser zoom does. Preserve reduced-motion queries. */
function resizeQueries(){
 const visit=(rules:CSSRuleList)=>{for(const rule of rules){if(rule instanceof CSSMediaRule){const original=originalMedia.get(rule)??rule.media.mediaText;originalMedia.set(rule,original);rule.media.mediaText=original.replace(/((?:min|max)-(?:width|height)\s*:\s*)([\d.]+)(px|em|rem)/g,(_,prefix,n,unit)=>`${prefix}${Number(n)*current}${unit}`);visit(rule.cssRules);}else if('cssRules' in rule)visit((rule as CSSGroupingRule).cssRules);}};
 for(const sheet of document.styleSheets){try{visit(sheet.cssRules);}catch{/* Ignore third-party stylesheets that disallow inspection. */}}
}
function apply(){document.documentElement.style.zoom=String(current);document.documentElement.style.setProperty('--app-ui-scale',String(current));resizeQueries();window.dispatchEvent(new Event('resize'));}
function setSize(size:number){current=size;try{localStorage.setItem(KEY,String(size));}catch{/* Still works for this visit. */}apply();window.dispatchEvent(new Event(EVENT));}
export function DisplaySizeControls(){
 const size=useSyncExternalStore(subscribe,()=>current,()=>1),i=levels.indexOf(size);
 return <div className="display-size-controls" role="group" aria-label="Interface size"><span>Display size <output aria-live="polite">{Math.round(size*100)}%</output></span><div><button type="button" disabled={i===0} aria-label="Smaller interface" onClick={()=>setSize(levels[Math.max(0,i-1)])}>A−</button><button type="button" disabled={i===levels.length-1} aria-label="Larger interface" onClick={()=>setSize(levels[Math.min(levels.length-1,i+1)])}>A+</button><button type="button" onClick={()=>setSize(1)}>Reset</button></div></div>;
}
export function DisplaySize(){
 const panel=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const [host,setHost]=useState<Element>(()=>document.fullscreenElement??document.body),[open,setOpen]=useState(false);
 useEffect(()=>{
  apply();const observer=new MutationObserver(()=>resizeQueries());observer.observe(document.head,{childList:true,subtree:true,characterData:true});
  const loaded=()=>resizeQueries(),full=()=>{setHost(document.fullscreenElement??document.body);setOpen(false);},storage=(e:StorageEvent)=>{if(e.key===KEY){current=readDisplaySize();apply();window.dispatchEvent(new Event(EVENT));}};
  document.addEventListener('load',loaded,true);document.addEventListener('fullscreenchange',full);window.addEventListener('storage',storage);
  return()=>{observer.disconnect();document.removeEventListener('load',loaded,true);document.removeEventListener('fullscreenchange',full);window.removeEventListener('storage',storage);};
 },[]);
 return createPortal(<div className="display-size-widget" onKeyDown={e=>e.stopPropagation()}><button ref={trigger} className="display-size-launcher" aria-label="Adjust interface size" aria-expanded={open} onClick={()=>{panel.current?.togglePopover();}}>Aa</button><div ref={panel} popover="auto" className="display-size-popover" onToggle={e=>setOpen(e.newState==='open')}><DisplaySizeControls/><small>Make text, buttons and menus bigger. This device remembers your choice.</small><button className="display-size-done" onClick={()=>{panel.current?.hidePopover();trigger.current?.focus();}}>Done</button></div></div>,host);
}
