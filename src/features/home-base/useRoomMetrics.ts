import { useEffect,useState,type RefObject } from 'react';
export function useRoomMetrics(ref:RefObject<HTMLDivElement|null>,cols:number,rows:number){
 const [size,setSize]=useState({width:640,height:280});
 useEffect(()=>{const el=ref.current;if(!el)return;const observer=new ResizeObserver(entries=>{const r=entries[0].contentRect;setSize({width:r.width,height:r.height});});observer.observe(el);return()=>observer.disconnect();},[ref]);
 const tile=size.width/cols;
 return {scale:Math.round(Math.max(.5,Math.min(1.25,tile/95))*8)/8,timing:{x:Math.round(Math.max(220,Math.min(420,tile/ .3))),y:Math.round(Math.max(180,Math.min(300,size.height/rows/ .3)))}};
}
