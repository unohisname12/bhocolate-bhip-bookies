import { useCallback, useEffect, useRef, useState } from 'react';
import { pilotAPI } from '../../pilot/api';
import type { InsightsData } from './model';
export function useTeacherInsights(days:number){
 const [data,setData]=useState<InsightsData|null>(null),[error,setError]=useState(''),[updating,setUpdating]=useState(false);
 const generation=useRef(0),mounted=useRef(true);
 const refresh=useCallback(async()=>{const ticket=++generation.current;setUpdating(true);try{const next=await pilotAPI<InsightsData>(`teacher/insights?days=${days}`);if(mounted.current&&ticket===generation.current){setData(next);setError('');}return next;}catch(e){if(mounted.current&&ticket===generation.current)setError(e instanceof Error?e.message:'Could not refresh insights.');throw e;}finally{if(mounted.current&&ticket===generation.current)setUpdating(false);}},[days]);
 useEffect(()=>{mounted.current=true;let active=true,timer:ReturnType<typeof setTimeout>,failures=0,running=false;
  const tick=async()=>{if(!active||running)return;running=true;if(document.visibilityState==='visible'){try{await refresh();failures=0;}catch{failures++;}}running=false;if(active)timer=setTimeout(()=>void tick(),Math.min(60000,15000*2**failures));};
  void tick();const visible=()=>{if(document.visibilityState==='visible'){clearTimeout(timer);void tick();}};document.addEventListener('visibilitychange',visible);
  return()=>{active=false;mounted.current=false;clearTimeout(timer);document.removeEventListener('visibilitychange',visible);};
 },[refresh]);
 return {data,error,updating,refresh};
}
