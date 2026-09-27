import { useState } from 'react';
import { signInLink, readSignInLink, bookmarkFile, type SignInCard as Card } from './signInLinks';
export function SignInCard({ card, label }: { card: Card; label: string }) {
  const link = signInLink(window.location.origin, card);
  const [message, setMessage] = useState('');
  const download = () => {
    const url = URL.createObjectURL(new Blob([bookmarkFile(link, label)], {type:'text/html'}));
    const a = document.createElement('a'); a.href=url; a.download='private-vpet-bookmark.html'; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    setMessage('Private sign-in file downloaded with your link and backup codes. Open it and click the link, or import it into Chrome bookmarks.');
  };
  return <div className="signin-card"><a href={link} target="_blank" rel="noreferrer">Sign in as {label}</a><div className="pilot-actions no-print"><button onClick={async()=>{try{await navigator.clipboard.writeText(link);setMessage('Private link copied.');}catch{setMessage('Right-click the sign-in link above and choose Copy link address.');}}}>Copy private sign-in link</button><button onClick={download}>Download link + backup codes</button></div><p>On a Chromebook, right-click the link and copy its address into a bookmark. Or import the downloaded file through Chrome’s Bookmark Manager → Import bookmarks.</p><details><summary>Backup login codes</summary>{card.role==='student'&&<p>Class code: <code>{card.classCode}</code></p>}<p>{card.role==='teacher'?'Private teacher key':'Secret pet code'}: <code>{card.code}</code></p></details><small>Give this shortcut only to {label}. It works like a password. Use a personal Chrome profile; on shared profiles, use the codes instead.</small><span role="status">{message}</span></div>;
}
export function TeacherSignInShortcut() {
  const [key, setKey] = useState('');
  const [show, setShow] = useState(false);
  const card: Card = {role:'teacher',code:key,classCode:''};
  return <section className="pilot-card"><h2>Your teacher sign-in shortcut</h2><p>Use a private Chrome bookmark to open your classroom without typing the long key each time.</p><label>Private teacher key for shortcut<input type="password" autoComplete="off" value={key} onChange={e=>{setKey(e.target.value);setShow(false);}}/></label><button disabled={!readSignInLink(new URL(signInLink(window.location.origin,card)).hash)} onClick={()=>setShow(true)}>Make my private shortcut</button>{show && <SignInCard label="teacher" card={card}/>}</section>;
}
export function ExistingStudentShortcut({classCode}:{classCode:string}) {
  const [code,setCode]=useState(''),[show,setShow]=useState(false);
  const card:Card={role:'student',classCode,code};
  return <section className="pilot-card"><h2>Make a Chromebook shortcut for an existing student</h2><p>Use the student’s current card or private roster. This keeps the same account and pet.</p><label>Student’s current secret pet code<input type="password" autoComplete="off" value={code} onChange={e=>{setCode(e.target.value);setShow(false);}}/></label><button disabled={!readSignInLink(new URL(signInLink(window.location.origin,card)).hash)} onClick={()=>setShow(true)}>Make student shortcut</button>{show&&<SignInCard label="student" card={card}/>}</section>;
}
