import { useEffect, useRef, type ReactNode } from 'react';
export function HuntMenu({onClose,connection,solo,children}:{onClose:()=>void;connection:string;solo:boolean;children:ReactNode}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=dialog.current;el?.showModal();return()=>el?.close();},[]);
 return <dialog ref={dialog} className="hunt-menu" aria-labelledby="hunt-menu-title" onCancel={e=>{e.preventDefault();onClose();}}>
 <header><div><h2 id="hunt-menu-title">Pet Hunt</h2><p>{solo?'Round paused':connection+' · The round keeps playing'}</p></div><button autoFocus onClick={onClose}>Back to game</button></header>
 {children}<p className="hunt-menu-keys">Move: WASD / arrows · Aim: mouse · Fire: F / click<br/>Help: E · Gadget: Space · Quiet walk: Shift</p>
 </dialog>;
}
