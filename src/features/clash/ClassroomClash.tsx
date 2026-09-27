import { DeliveryTeacher } from '../delivery/DeliveryTeacher';
import { startPolling } from '../../pilot/polling';
import { TeacherPrizePicker } from './TeacherPrizePicker';
import { teacherPrize } from './prizeCatalog';
import { useEffect, useRef, useState } from 'react';
import { pilotAPI } from '../../pilot/api';
import './clash.css';
interface ClashData {
  round: { id: string; started_at: number; ends_at: number; finished_at: number | null } | null;
  serverNow: number;
  myId: string | null;
  standings: { studentId: string; alias: string; score: number; rank: number }[];
  rewards: { id: string; score: number }[];
}
export function ClassroomClash({ teacher = false, claim, play, showTeacherTools = true }: { teacher?: boolean; showTeacherTools?: boolean; claim?: (roundId: string) => Promise<void>; play?: (screen: 'math' | 'catch_math') => void }) {
  const [gifts,setGifts]=useState<{id:string;prize_id:string;claimed_at:number|null;used_at:number|null}[]>([]);
  const panel = useRef<HTMLElement>(null);
  const [data, setData] = useState<ClashData | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [minutes, setMinutes] = useState(10);
  const [expanded, setExpanded] = useState(teacher);
  useEffect(() => {
    let alive = true;
    const refresh = async () => { try { const next = await pilotAPI<ClashData>('clash'); if (alive) { setData(next); setError(''); } if(!teacher){const extra=await pilotAPI<{grants:typeof gifts}>('clash/gifts');if(alive)setGifts(extra.grants);} } catch (e) { if (alive) setError(e instanceof Error ? e.message : 'Standings unavailable.'); } };
    const stop = startPolling(refresh, 5000);
    return () => { alive = false; stop(); };
  }, [teacher]);
  const run = async (operation: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await operation(); setData(await pilotAPI<ClashData>('clash')); } catch (e) { setError(e instanceof Error ? e.message : 'Try again.'); } finally { setBusy(false); }
  };
  const round = data?.round;
  const active = !!round && !round.finished_at && round.ends_at > (data?.serverNow ?? 0);
  const me = data?.standings.find(s => s.studentId === data.myId);
  return <section ref={panel} className={`clash-panel${teacher ? '' : ' clash-student'}`} aria-label="Classroom Clash">
    <button className="clash-heading" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}><span>⚡ Classroom Clash <small>{active ? `Class event LIVE · ${Math.max(1, Math.ceil((round.ends_at - data!.serverNow) / 60000))} min left` : round ? 'Round complete' : 'Waiting for your teacher'}</small></span><span>{me && active ? `#${me.rank} · ${me.score} pts` : (data?.rewards.length || gifts.some(g=>!g.claimed_at)) ? '🎁 Prize ready!' : teacher ? 'Math → lasting prizes' : ''} {expanded ? 'Minimize ▴' : 'Details ▾'}</span></button>
    {error && <p role="alert">{error} Standings may be out of date.</p>}
    {expanded && <div className="clash-body">
      <p>Solve math and Catch Math challenges to race your class! Each new correct answer is worth <strong>10 points</strong>. Hints and retries are welcome. Saved answers count while the round is live.</p>
      <div className="clash-prize-banner"><strong>Keep what you earn.</strong><span>Everyone who scores: a permanent room item + 15–40 tokens + 2 optional boosts. Top 3: trophy + 25 extra tokens; other finishers: Adventure Shelf. First place: a pet crown too! Ties share prizes. Owned collectibles become 15 tokens.</span></div>
      {teacher && <div className="clash-actions"><button onClick={() => { void panel.current?.requestFullscreen().catch(() => setError('Fullscreen is unavailable on this device.')); }}>Project standings</button><label>Round length <select value={minutes} onChange={e => setMinutes(Number(e.target.value))} disabled={busy || (!!round && !round.finished_at)}>{[5,10,15,20,30].map(n => <option key={n} value={n}>{n} minutes</option>)}</select></label>{round && !round.finished_at ? <button disabled={busy} onClick={() => { void run(() => pilotAPI('clash/finish', 'POST', { roundId: round.id })); }}>{active ? 'Finish round & open prizes' : 'Close round for next game'}</button> : <button disabled={busy || !data} onClick={() => { void run(() => pilotAPI('clash/start', 'POST', { minutes })); }}>Start Classroom Clash</button>}</div>}
      {!teacher && active && play && <div className="clash-actions"><button onClick={() => { setExpanded(false); play('math'); }}>Play Math Practice</button><button onClick={() => { setExpanded(false); play('catch_math'); }}>Play Catch Math</button></div>}
      {teacher&&showTeacherTools&&<><DeliveryTeacher/><TeacherPrizePicker standings={data?.standings??[]}/></>}
      {!teacher&&gifts.length>0&&<section aria-label="Your teacher prizes"><h3>Your private teacher prizes</h3><p>Collect when ready. Surprise perks activate automatically in your next matching classmate game, at most one per learner per game. Your classmates do not see this inbox.</p>{gifts.map(g=><div key={g.id}><strong>{teacherPrize(g.prize_id)?.name}</strong><p>{teacherPrize(g.prize_id)?.description}</p>{!g.claimed_at?<button disabled={busy} onClick={()=>{if(claim)void run(()=>claim(`gift:${g.id}`));}}>Collect {teacherPrize(g.prize_id)?.name}</button>:<small>Ready for your next matching classmate game</small>}</div>)}</section>}
      {!teacher && data?.rewards.map((reward, index) => <button key={reward.id} disabled={busy} onClick={() => { if (claim) void run(() => claim(reward.id)); }}>Claim round prize {index + 1} · {reward.score} points</button>)}
      {!teacher && active && me && <div className="clash-personal-goal"><strong>{me.score === 0 ? 'Solve your first question to unlock your round prize!' : me.score < 250 ? `${50 - me.score % 50} points to your next 5 bonus tokens` : 'All 25 bonus tokens earned! Keep climbing the standings.'}</strong><progress aria-label="Next bonus tokens" value={me.score >= 250 ? 50 : me.score % 50} max={50}/></div>}
      {!!round && <ol className="clash-standings" aria-label="Class standings">{data?.standings.map(s => <li key={s.studentId} className={s.studentId === data.myId ? 'is-me' : ''}><strong>#{s.rank}</strong><span>{s.alias}{s.studentId === data.myId ? ' (you)' : ''}</span><progress aria-label={`${s.alias} score`} max={Math.max(50, data?.standings[0]?.score ?? 0)} value={s.score}/><b>{s.score} pts</b></li>)}</ol>}
      {active && <p className="clash-small">Standings refresh every 5 seconds. Earn 5 extra tokens every 50 points, up to 25. Tokens buy decorations and boosts in the Prize Studio.</p>}
    </div>}
  </section>;
}
