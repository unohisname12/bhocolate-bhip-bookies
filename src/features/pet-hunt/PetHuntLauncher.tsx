import { useState } from 'react';
import './pet-hunt.css';
export function PetHuntLauncher({teacher=false,prepare}:{teacher?:boolean;prepare?:()=>Promise<boolean>}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 return <section className="hunt-launch"><div><span className="hunt-eyebrow">NEW ARENA · 1 HUNTER VS 4 PETS</span><h2>Pet Hunt</h2><p>Draft powers. Survive the hunt. Earn your return. Play the computer, your classmates, or {teacher?'be the hunter yourself.':'your teacher.'}</p></div><button disabled={busy} onClick={()=>{setBusy(true);void (async()=>{try{if(prepare&&!await prepare()){setError('Wait for your pet to finish saving, then try again.');return;}window.location.assign('/?petHunt=1');}catch{setError('Could not open the arena. Try again.');}finally{setBusy(false);}})();}}>Enter Pet Hunt →</button>{error&&<p role="alert">{error}</p>}</section>;
}
