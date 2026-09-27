import { GRADE_TOPICS, gradeLabel, type LearningSettings } from '../../services/game/curriculum';
import './learner-settings.css';

export function LearnerSettings({ value, onChange, disabled = false }: { value: LearningSettings; onChange: (patch: Partial<LearningSettings>) => void; disabled?: boolean }) {
  const grade = (next: number) => onChange({ grade: next, topic: 'mixed' });
  return <fieldset className="learner-settings" disabled={disabled}>
    <legend>Learning level</legend>
    <p>Choose the math level that fits this learner. Changes apply when you save their settings.</p>
    <div className="learner-setting-grid">
      <div><label>Grade level<select id="learner-grade-level" aria-label="Grade level" value={value.grade} onChange={e => grade(Number(e.target.value))}>{GRADE_TOPICS.map((_, index) => <option key={index} value={index}>{gradeLabel(index)}</option>)}</select></label><div className="learner-grade-steps"><button type="button" disabled={disabled || value.grade === 0} onClick={() => grade(value.grade - 1)}>← Lower grade</button><button type="button" disabled={disabled || value.grade === 12} onClick={() => grade(value.grade + 1)}>Higher grade →</button></div><small>Changing grade resets the practice topic to mixed.</small></div>
      <div><label>Practice topic<select aria-label="Practice topic" value={value.topic} onChange={e => onChange({ topic: e.target.value })}><option value="mixed">Mix this grade’s topics</option>{GRADE_TOPICS[value.grade].map(topic => <option key={topic}>{topic}</option>)}</select></label><small>{value.topic === 'mixed' ? GRADE_TOPICS[value.grade].join(' · ') : `Focus practice on ${value.topic.toLowerCase()}.`}</small></div>
      <div><label>Challenge level<select aria-label="Challenge level" value={value.challenge} onChange={e => onChange({ challenge: e.target.value as LearningSettings['challenge'] })}><option value="support">Support · gentler practice</option><option value="standard">Standard · regular practice</option><option value="stretch">Stretch · extra challenge</option></select></label><small>Changes difficulty within the selected grade. Does not move the learner to another grade.</small></div>
    </div>
    <div className="learner-presets" aria-label="Quick learning settings"><strong>Quick setup</strong><button type="button" onClick={() => onChange({ challenge: 'support', learningHelp: true })}>More support <small>Gentler questions + hints</small></button><button type="button" onClick={() => onChange({ challenge: 'standard', learningHelp: false })}>Independent practice <small>Standard questions, hints off</small></button><button type="button" onClick={() => onChange({ challenge: 'stretch', learningHelp: true })}>Extra challenge <small>Stretch questions + hints</small></button></div>
    <p className="learner-note">Quick setup keeps the grade and topic you chose. You can adjust hints separately below.</p>
  </fieldset>;
}
