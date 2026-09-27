import { useEffect, useRef, useState } from 'react';
import { useLearningSettings } from '../../components/LearningContext';
import { skillsForGrade } from '../skill-challenge/catalog';
import { isMiddleGrade } from './catalog';
import { SkillPractice } from './SkillPractice';
import '../quick-check/quick-check.css';

export function MathLab() {
  const learning=useLearningSettings(),dialog=useRef<HTMLDialogElement>(null);
  const [open,setOpen]=useState(false),[selected,setSelected]=useState('');
  useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close();},[open]);
  if(!isMiddleGrade(learning.grade))return null;
  const skills=skillsForGrade(learning.grade).filter(s=>learning.topic==='mixed'||s.topic===learning.topic);
  const topics=[...new Set(skills.map(s=>s.topic))];
  return <section className="quick-check-card" aria-label="Middle school math lab"><div><strong>Grade {learning.grade} Math Lab</strong><p>{skills.length} objectives across {topics.length} topics. Choose an example, practice with help, then try fresh questions.</p></div><button onClick={()=>{setSelected('');setOpen(true);}}>Open my math lab</button>
    <dialog ref={dialog} className="quick-check-dialog" aria-label="Middle school math lab" onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)}><div className="quick-check-content">
      <h2>Grade {learning.grade} Math Lab</h2><p>Your teacher’s assigned topic stays in control. This is a foundations practice collection, not a whole-course completion score.</p>
      {selected&&skills.some(s=>s.id===selected)?<><button onClick={()=>setSelected('')}>← Choose a skill</button><SkillPractice key={`${selected}:${learning.challenge}`} id={selected} settings={learning}/></>:topics.map(topic=><details key={topic}><summary>{topic}</summary>{skills.filter(s=>s.topic===topic).map(s=><p key={s.id}><button onClick={()=>setSelected(s.id)}>{s.name}</button></p>)}</details>)}
      <button onClick={()=>setOpen(false)}>Close math lab</button>
    </div></dialog>
  </section>;
}
