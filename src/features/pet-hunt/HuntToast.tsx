import { useEffect, useState } from 'react';
/** One brief event at a time, with no permanent second instruction banner. */
export function HuntToast({message}:{message:string}){
 return <TimedToast key={message} message={message}/>;
}
function TimedToast({message}:{message:string}){
 const [visible,setVisible]=useState(true);
 useEffect(()=>{const timer=setTimeout(()=>setVisible(false),3500);return()=>clearTimeout(timer);},[message]);
 return <p className={`hunt-event-toast ${visible?'is-visible':''}`} role="status">{message}</p>;
}
