import { TeacherLearningReport } from '../../screens/TeacherLearningReport';
import { useEffect, useState } from 'react';
import { pilotAPI } from '../../pilot/api';
import type { Learner } from '../../pilot/PilotTeacher';
import { GRADE_TOPICS, gradeLabel } from '../../services/game/curriculum';
import type { City } from './model';
export function DeliveryLearning({ city }: {city:City}) {
  const [learners,setLearners]=useState<Learner[]>([]),[error,setError]=useState('');
  const refresh=async()=>{try{const next=await pilotAPI<{students:Learner[]}>('teacher/classroom');setLearners(next.students);}catch(e){setError((e as Error).message);}};
  useEffect(()=>{let live=true;void pilotAPI<{students:Learner[]}>('teacher/classroom').then(next=>{if(live)setLearners(next.students);}).catch(e=>{if(live)setError((e as Error).message);});return()=>{live=false;};},[]);
  return <section className="delivery-learning" aria-label="Delivery challenge progress"><h3>Challenge results & individual math levels</h3><p>Regular briefing uses each learner’s assigned level with their usual help. Wagers use the next grade (up to Grade 12), stretch difficulty, no hints, and 60 seconds. Adjustments apply to the next question; active questions keep their original level. These are practice results, not a mastery assessment.</p>
    {error&&<p role="alert">{error}</p>}
    {city.players.filter(p=>!p.bot).map(p=>{const learner=learners.find(l=>l.id===p.id),history=p.challengeHistory??[];return <article key={p.id}><h4>{p.alias}</h4><TeacherLearningReport rows={p.planningEvidence ?? []}/><p>{history.filter(r=>r.correct).length}/{history.length} successful wagers · {history.filter(r=>r.timedOut).length} timeouts</p><ul>{history.slice(-5).reverse().map((r,i)=><li key={i}>Round {r.round} · {gradeLabel(r.grade)} · {r.topic} · {r.correct?'Correct':r.timedOut?'Timed out':'Incorrect'} · {Math.ceil(r.elapsed/1000)} seconds</li>)}</ul>{p.challenge?.status==='active'&&<p>Working on a timed question now. Changes will apply after it.</p>}{learner&&<LevelEditor key={`${learner.id}:${learner.settingsVersion}`} learner={learner} refresh={refresh}/>}</article>;})}
  </section>;
}
function LevelEditor({ learner, refresh }: {learner:Learner;refresh:()=>Promise<void>}) {
  const [grade,setGrade]=useState(learner.learning.grade),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const save=async()=>{setBusy(true);try{await pilotAPI(`teacher/students/${learner.id}/settings`,'POST',{settingsVersion:learner.settingsVersion,learning:{...learner.learning,grade,topic:grade===learner.learning.grade?learner.learning.topic:'mixed'},assignment:learner.assignment,requestId:crypto.randomUUID()});setMessage('Saved for the next question.');await refresh();}catch(e){setMessage((e as Error).message);await refresh();}finally{setBusy(false);}};
  return <div className="delivery-level-editor"><label>Math grade for {learner.alias}<select value={grade} onChange={e=>setGrade(+e.target.value)} disabled={busy}>{GRADE_TOPICS.map((_,i)=><option value={i} key={i}>{gradeLabel(i)}</option>)}</select></label><button disabled={busy||grade===learner.learning.grade} onClick={()=>void save()}>Save math level for {learner.alias}</button><span role="status">{message}</span></div>;
}
