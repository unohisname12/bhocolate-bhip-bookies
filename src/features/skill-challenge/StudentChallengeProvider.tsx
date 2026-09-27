import {useCallback,useEffect,useState,type ReactNode} from 'react';
import { startPolling } from '../../pilot/polling';
import {pilotAPI} from '../../pilot/api';
import {StudentChallengeContext,type StudentData} from './studentContext';
const requestedChallenge=new URLSearchParams(window.location.search).get('skillChallenge');
async function loadChallenge(){const latest=await pilotAPI<StudentData>('skill-challenges');if(!requestedChallenge||latest.challenge?.id===requestedChallenge||latest.assignment?.progress.focus&&!latest.challenge?.closedAt)return latest;return pilotAPI<StudentData>(`skill-challenges?id=${encodeURIComponent(requestedChallenge)}`);}
export function StudentChallengeProvider({children}:{children:ReactNode}){
 const [data,setData]=useState<StudentData|null>(null),[ready,setReady]=useState(false),[error,setError]=useState(''),[openRequest,setOpenRequest]=useState(0);
 const accept=useCallback((next:StudentData)=>{setData(old=>{if(old?.challenge&&next.challenge){if(next.challenge.id!==requestedChallenge&&old.challenge.createdAt>next.challenge.createdAt)return old;if(old.challenge.id===next.challenge.id&&((old.assignment?.revision??0)>(next.assignment?.revision??0)||old.challenge.closedAt&&!next.challenge.closedAt||old.challenge.winnerId&&!next.challenge.winnerId))return old;}return next;});setReady(true);setError('');},[]);
 const refresh=useCallback(async()=>{const next=await loadChallenge();accept(next);return next;},[accept]);
 useEffect(()=>{let active=true;const poll=async()=>{try{const next=await loadChallenge();if(active)accept(next);}catch(e){if(active)setError(e instanceof Error?e.message:'Could not load your classroom target.');}};const stop=startPolling(poll,5000);return()=>{active=false;stop();};},[accept]);
 return <StudentChallengeContext.Provider value={{data,ready,error,accept,refresh,openRequest,open:()=>setOpenRequest(n=>n+1)}}>{children}</StudentChallengeContext.Provider>;
}
