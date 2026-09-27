import { StudentChallengeProvider } from '../features/skill-challenge/StudentChallengeProvider';
import { TeacherBattleEntry } from '../features/teacher-battle/TeacherBattle';
import { useReducedMotion, reducedMotionPreference, setReducedMotionPreference } from '../hooks/useReducedMotion';
import { StudentSkillChallenge } from '../features/skill-challenge/SkillChallenge';
import { PortalEntry } from '../features/portal-party/PortalParty';
import { tabSession } from './tabSession';
import { readSignInLink } from './signInLinks';
import { SignInCard } from './SignInCard';
import './signin.css';
import { DeliveryCloudContext } from '../features/delivery/context';
import { StudentNickname } from './StudentNickname';
import { NextQuestionContext } from './NextQuestionContext';
import { ClassroomParty } from '../features/classroom-party/ClassroomParty';
import { ClassroomClash } from '../features/clash/ClassroomClash';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import App from '../App';
import { CloudSession } from './CloudSession';
import { pilotAPI, PilotError, type CloudSave } from './api';
import { PilotTeacher } from './PilotTeacher';
import './pilot.css';

function StudentGame({ save, onLogout }: { save: CloudSave; onLogout: () => void }) {
  const reduceMotion = useReducedMotion();
  const [motionPreference, setMotionPreference] = useState(reducedMotionPreference);
  const shell = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!header.current) return;
    const observer = new ResizeObserver(() => {
      shell.current?.style.setProperty('--pilot-header-height', `${header.current?.offsetHeight ?? 84}px`);
    });
    observer.observe(header.current);
    return () => observer.disconnect();
  }, []);
  const [cloud] = useState(() => new CloudSession(save));
  const status = useSyncExternalStore(cloud.subscribe, cloud.getStatus);
  const [leaving, setLeaving] = useState(false);
  const [exitError, setExitError] = useState('');
  const blocked = ['offline', 'conflict', 'signin'].includes(status.phase);
  const signOut = async () => {
    setLeaving(true); setExitError('');
    try {
      if (!await cloud.flush()) { setExitError('Wait for Saved online before signing out. Retry if the connection was interrupted.'); return; }
      await pilotAPI('logout', 'POST', {}); onLogout();
    } catch { setExitError('Could not sign out safely. Keep this tab open and retry.'); }
    finally { setLeaving(false); }
  };
  return <StudentChallengeProvider><div ref={shell} className="pilot-student" data-reduced-motion={reduceMotion}>
    <header ref={header} className="pilot-savebar"><span><StudentNickname initialAlias={save.alias} disabled={blocked || leaving} onRefresh={cloud.refreshLearning}/><span role="status" data-testid="cloud-save-status">{status.message}</span></span><details className="pilot-account-menu"><summary>Account & help</summary><p>Check Saved online before leaving. Use Home for today’s task, Games to play, or Together for your class.</p><label><input type="checkbox" checked={motionPreference} onChange={e=>{setMotionPreference(e.target.checked);setReducedMotionPreference(e.target.checked);}}/> Reduce motion</label><p className="pilot-small">Also follows your Chromebook’s accessibility settings. Portal Party has its own sound button.</p><button aria-label="Save & sign out" disabled={leaving} onClick={() => { void signOut(); }}>Save & sign out</button></details></header>
    {exitError && <p className="pilot-exit-error" role="alert">{exitError}</p>}
    <div inert={blocked || leaving}><ClassroomParty activity={cloud.recordPartyActivity} prepare={cloud.prepareParty} blocked={blocked || leaving} flush={cloud.flush} practice={() => cloud.openClashActivity('math')}><NextQuestionContext.Provider value={cloud.refreshLearning}><DeliveryCloudContext.Provider value={{ flush: cloud.flush }}><StudentSkillChallenge blocked={blocked || leaving} prepare={async()=>{const message=await cloud.prepareLearningTarget();if(message)throw new Error(message);if(!await cloud.flush())throw new Error('Wait for Saved online before opening your challenge.');}}/><App initialStateOverride={cloud.initial} persistence={cloud.connect} arenaExecute={cloud.arenaCommand} stackExecute={cloud.stackCommand} studentPilot studentFlush={cloud.flush} studentAssignment={()=>cloud.save.assignment} studentTools={<><div className="student-class-events" inert={blocked || leaving}><ClassroomClash play={cloud.openClashActivity} claim={async roundId => {
      await cloud.claimClashPrize(roundId);
    }}/></div></>} /></DeliveryCloudContext.Provider></NextQuestionContext.Provider></ClassroomParty></div>
    {blocked && <div className="pilot-blocker" role="dialog" aria-modal="true" aria-label="Protect your saved pet"><section className="pilot-card"><h1>{status.phase === 'offline' ? 'Let’s keep your pet safe.' : 'Your saved pet is waiting.'}</h1><p>{status.message}</p><p>We paused play so an older or unsent copy cannot replace your saved progress.</p><div className="pilot-actions">
      {status.canRetryValidation && <button onClick={() => { void cloud.retryValidationSave(); }}>Retry saving my progress</button>}
      {status.phase === 'offline' && <button onClick={() => { void cloud.flush(); }}>Retry connection</button>}
      {status.phase === 'signin' && <button onClick={() => window.location.reload()}>Sign in again</button>}
      <button onClick={cloud.downloadRecovery}>Download unsent copy for teacher</button>
      {status.phase === 'conflict' && <button onClick={cloud.useServerCopy}>Use latest saved pet</button>}
    </div><p className="pilot-small">Recovery files contain a game code and pet progress, not your real name. Give them only to your teacher.</p></section></div>}
  </div></StudentChallengeProvider>;
}

function AccountRoot() {
  const returningToHunt = new URLSearchParams(window.location.search).get('returnTo') === 'petHunt';
  const [role, setRole] = useState<'loading' | 'login' | 'teacher' | 'student' | 'error'>('loading');
  const [save, setSave] = useState<CloudSave | null>(null);
  const [incoming, setIncoming] = useState(() => readSignInLink(window.location.hash));
  const [pendingLink, setPendingLink] = useState('');
  const startup = useRef(false);
  const malformedLink = useRef(window.location.hash.includes('signin=') && !incoming);
  const [teacher, setTeacher] = useState(incoming?.role === 'teacher');
  const [showCode, setShowCode] = useState(false);
  const [shortcut, setShortcut] = useState(false);
  const [code, setCode] = useState(incoming?.code ?? ''), [classCode, setClassCode] = useState(incoming?.classCode ?? '');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const loadSession = async () => {
    setRole('loading'); setError('');
    try {
      const session = await pilotAPI<{ role: 'teacher' | 'student' }>('session');
      if (returningToHunt) { window.location.replace('/?petHunt=1'); return; }
      if (session.role === 'student') setSave(await pilotAPI<CloudSave>('save'));
      setRole(session.role);
    } catch (error) {
      if (error instanceof PilotError && error.status === 401) setRole('login');
      else { setRole('error'); setError(error instanceof Error ? error.message : 'The saved game is not available right now.'); }
    }
  };
  useEffect(() => {
    if (startup.current) return;
    startup.current = true;
    if (window.location.hash.includes('signin=')) window.history.replaceState(null, '', window.location.pathname + window.location.search);
    if (malformedLink.current) { tabSession(true); setRole('login'); setError('This private link is incomplete. Enter your backup login codes.'); return; }
    if (!incoming) { void loadSession(); return; }
    tabSession(true);
    void (async () => {
      setBusy(true);
      try { await pilotAPI('login', 'POST', incoming); setCode(''); await loadSession(); }
      catch (e) { setRole('login'); setError(e instanceof Error ? e.message : 'This private link could not sign in. Use your backup codes.'); }
      finally { setBusy(false); }
    })();
  }, [incoming]);
  useEffect(() => {
    const changed = () => {
      const link = window.location.href;
      const next = readSignInLink(window.location.hash);
      if (window.location.hash.includes('signin=')) window.history.replaceState(null, '', window.location.pathname + window.location.search);
      if (!next) return;
      if (role === 'student' || role === 'teacher') { setPendingLink(link); return; }
      malformedLink.current=false; setTeacher(next.role === 'teacher'); setCode(next.code); setClassCode(next.classCode); startup.current=false; setIncoming(next);
    };
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, [role]);
  useEffect(() => { document.title = role === 'teacher' ? 'Teacher classroom · V-Pet' : role === 'student' && save ? `${save.alias} · V-Pet` : 'Sign in · V-Pet'; }, [role, save]);
  const logout = () => { setSave(null); setCode(''); setShowCode(false); setShortcut(false); setRole('login'); };
  const newTabNotice = pendingLink && <aside className="signin-tab-notice" role="status"><span>Keep this account open and use your other login in a new tab.</span><a href={pendingLink} target="_blank" rel="noreferrer" onClick={()=>setPendingLink('')}>Open private link in a new tab</a><button onClick={()=>setPendingLink('')}>Dismiss</button></aside>;
  if (role === 'student' && save) return <>{newTabNotice}<StudentGame key={save.studentId} save={save} onLogout={logout}/></>;
  if (role === 'teacher') return <>{newTabNotice}<PilotTeacher onLogout={logout}/></>;
  if (role === 'loading') return <main className="pilot-shell"><section className="pilot-card" role="status"><h1>Opening the classroom…</h1><p>Checking the server for your saved pet. We will never start a new pet because a save cannot be reached.</p></section></main>;
  if (role === 'error') return <main className="pilot-shell"><section className="pilot-card"><h1>Your game has not been reset.</h1><p role="alert">{error}</p><button onClick={() => { void loadSession(); }}>Try connecting again</button><button onClick={async () => { try { await pilotAPI('logout', 'POST', {}); } catch { /* An expired session is already signed out. */ } logout(); }}>Back to sign in</button></section></main>;
  return <main className="pilot-shell signin-shell"><section className="pilot-card pilot-welcome"><img src="/assets/woodland-v1/pip-portrait.png" alt="Pip welcomes your classroom"/><p className="pilot-eyebrow">{returningToHunt ? 'Auralith · Pet Hunt' : 'V-Pet · Your classroom'}</p><h1>{teacher ? 'Welcome, teacher.' : 'Hello, adventurer.'}</h1><p>{teacher ? 'Open your private shortcut, or enter your teacher key below.' : incoming && code ? 'Check your backup codes below and try again.' : 'Open your private Chromebook bookmark, or enter the codes from your teacher.'}</p>
    {returningToHunt && <p>Sign in to play Pet Hunt with your earned pet. We’ll take you straight back to the game.</p>}
    <form onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { await pilotAPI('login', 'POST', { role: teacher ? 'teacher' : 'student', classCode, code }); setCode(''); await loadSession(); } catch (error) { setError(error instanceof Error ? error.message : 'Could not sign in.'); } finally { setBusy(false); } }}>
      {!teacher && <label>Class code<input name="class-code" autoComplete="off" autoCapitalize="characters" value={classCode} onChange={e => setClassCode(e.target.value)} required maxLength={20}/></label>}
      <label>{teacher ? 'Private teacher key' : 'My secret pet code'}<input name="pet-code" type={showCode ? "text" : "password"} autoComplete="current-password" spellCheck={false} value={code} onChange={e => setCode(e.target.value)} required maxLength={80}/></label>
      <label className="signin-show"><input type="checkbox" checked={showCode} onChange={e=>setShowCode(e.target.checked)}/>Show my code</label>
      <button className="pilot-primary" disabled={busy}>{busy ? 'Opening…' : returningToHunt ? 'Sign in & play Pet Hunt' : teacher ? 'Open teacher classroom' : 'Visit my pet'}</button>
    </form><p role="alert">{error}</p><button className="pilot-link" onClick={() => { setTeacher(!teacher); setCode(''); setError(''); setShortcut(false); setShowCode(false); }}>{teacher ? 'I am a student' : 'Teacher sign in'}</button>
    {teacher && code.trim().length >= 16 && <details onToggle={e=>setShortcut(e.currentTarget.open)}><summary>Save a private teacher shortcut</summary>{shortcut && <SignInCard label="teacher" card={{role:'teacher',code,classCode:''}}/>}</details>}
    <p className="pilot-small">Keep your pet code private. Lost your card? Your teacher can replace the login without replacing your pet. On shared devices, use Save & sign out when you finish.</p><details><summary>Privacy and pilot information</summary><p>This supervised pilot stores a randomly assigned learner code, game progress, teacher-assigned math settings, and limited practice history. It does not ask for names, emails, birthdays, chat, or photos. Your teacher alone keeps any link between a code and a child, outside this game.</p><p>Codes and game records are pseudonymous, not completely anonymous. Cloudflare hosts the service and processes technical request data. Do not put real names in recovery files or login cards. Your school should approve this pilot and decide how long to keep records before students use it.</p></details>
  </section></main>;
}

export function PilotRoot() {
  const query = new URLSearchParams(window.location.search);
  if (query.has("teacherBattle")) return <TeacherBattleEntry/>;
  return query.has("portal") || query.has("portalProjector") ? <PortalEntry/> : <AccountRoot/>;
}
