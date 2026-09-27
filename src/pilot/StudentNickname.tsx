import { useEffect, useState } from 'react';
import { startPolling } from './polling';
import { pilotAPI } from './api';
import type { ClassroomMetadata } from './metadata';
export function StudentNickname({initialAlias,disabled,onRefresh}:{initialAlias:string;disabled:boolean;onRefresh:()=>Promise<unknown>}) {
  const [meta,setMeta]=useState<ClassroomMetadata|null>(null),[open,setOpen]=useState(false),[name,setName]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{let alive=true;const poll=async()=>{try{const next=await pilotAPI<ClassroomMetadata>('metadata');if(alive)setMeta(next);}catch{/* Save status handles connection problems. */}};const stop=startPolling(poll,30000);return()=>{alive=false;stop();};},[]);
  const request=meta?.nicknameRequest;
  return <div className="student-nickname"><button aria-label={`${meta?.alias??initialAlias} · Nickname`} disabled={disabled} aria-expanded={open} onClick={()=>setOpen(!open)}>{meta?.alias??initialAlias}</button>
    {open&&<section className="nickname-popover" aria-label="My nickname"><h2>Choose your nickname</h2><p>Use a nickname, never your real name. Your teacher approves it before classmates see it.</p><p role="status">{request?.status==='pending'?`Waiting for approval: ${request.proposed}`:request?.status==='approved'?`Your teacher approved your nickname: ${meta?.alias}`:request?.status==='declined'?'Your teacher declined that request. Choose another nickname.':''}</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);try{await pilotAPI('nickname','POST',{nickname:name});setMeta(await pilotAPI<ClassroomMetadata>('metadata'));setMessage('Request sent. Keep playing while your teacher reviews it.');await onRefresh();}catch(error){setMessage((error as Error).message);}finally{setBusy(false);}}}><label>Requested nickname<input maxLength={24} value={name} onChange={e=>setName(e.target.value)} disabled={busy||disabled}/></label><button disabled={busy||disabled||!name}>Ask teacher to approve</button></form><p role="status">{message}</p><button onClick={()=>setOpen(false)}>Close nickname panel</button></section>}
    {!open&&request?.status==='approved'&&<span className="nickname-approved" role="status">Nickname approved ✓</span>}
  </div>;
}
