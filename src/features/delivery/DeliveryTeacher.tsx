import { DeliveryLearning } from './DeliveryLearning';
import { useState } from 'react';
import { useDeliveryCloud } from './client';
import { RulesEditor } from './RulesEditor';
import { DEFAULT_RULES, PERKS, type Perk, type Rules } from './model';
import './delivery.css';
export function DeliveryTeacher() {
  const [open, setOpen] = useState(false);
  return <details className="delivery-teacher" onToggle={e => setOpen(e.currentTarget.open)}><summary>🚚 Delivery Districts · duels, city remixes & math rewards</summary>{open && <TeacherPanel/>}</details>;
}
function TeacherPanel() {
  const { data, error, busy, act, refresh } = useDeliveryCloud(true);
  const [chosen, setChosen] = useState(''), [host, setHost] = useState(''), [rules, setRules] = useState<Rules>({ ...DEFAULT_RULES, format: 'duel', computers: 0 });
  const [targets, setTargets] = useState<string[]>([]), [reward, setReward] = useState<Perk | 'bridge' | 'festival' | 'supply'>('express'), [goal, setGoal] = useState(4), [message, setMessage] = useState('');
  const [amount,setAmount]=useState(1);
  const room = data?.rooms.find(r => r.id === chosen), city = room?.state;
  async function action(op: string, body: Record<string, unknown>, success: string) { const id = await act(op, body); if (id) setMessage(success); return id; }
  return <section className="delivery-teacher-panel"><h2>Your city, your teaching rules.</h2><p>Create a two-student duel or a group city. Reward completed math immediately, or set a new practice goal. Students use their existing individual math levels.</p>
    {error && <p role="alert">{error}<button onClick={() => void refresh()}>Refresh cities</button></p>}<p role="status">{message}</p>
    <label>Open city<select value={chosen} onChange={e => { const r = data?.rooms.find(r => r.id === e.target.value); setChosen(e.target.value); setTargets([]); if (r) setRules(r.state.rules); }}><option value="">Create a new city</option>{data?.rooms.map(r => <option key={r.id} value={r.id}>{r.state.rules.format} · {r.state.players[0]?.alias} · {r.state.phase} · round {Math.min(r.state.round,r.state.rules.rounds)}</option>)}</select></label>
    {!city && <><label>First student / host<select value={host} onChange={e => setHost(e.target.value)}><option value="">Choose a learner</option>{data?.classmates.map(s => <option key={s.id} value={s.id}>{s.alias}</option>)}</select></label><RulesEditor rules={rules} change={setRules} disabled={busy}/><button disabled={busy || !host} onClick={() => void action('create',{rules,studentId:host},'City created. Students open Games → Delivery Districts to join.').then(id => { if (id) setChosen(id); })}>Create classroom city</button></>}
    {city && <>
      <p><strong>{city.players.map(p => p.alias).join(' · ')}</strong></p>
      {city.phase === 'lobby' && <><RulesEditor rules={rules} change={setRules} disabled={busy}/><button disabled={busy} onClick={() => void action('rules',{roomId:city.id,rules},'City rules saved.')}>Save city remix</button><button disabled={busy} onClick={() => void action('start',{roomId:city.id},'Deliveries started.')}>Start classroom deliveries</button><p>For a duel, ask the second student to join this city. Save remixed rules before starting.</p></>}
      {city.phase !== 'done' && <fieldset disabled={busy}><legend>Math rewards that change the game</legend><button onClick={() => setTargets(city.players.filter(p => !p.bot && p.joined).map(p => p.id))}>Select all city students</button><div className="delivery-targets">{city.players.filter(p => !p.bot).map(p => <label key={p.id}><input type="checkbox" checked={targets.includes(p.id)} onChange={e => setTargets(e.target.checked ? [...targets,p.id] : targets.filter(id => id !== p.id))}/>{p.alias}</label>)}</div>
        <label>Reward<select value={reward} onChange={e => setReward(e.target.value as typeof reward)}>{Object.entries(PERKS).map(([id,p]) => <option key={id} value={id}>{p.name}</option>)}<option value="supply">Supply drop · 2–10 random inventory items</option><option value="bridge">Shared city bridge · remove closures</option><option value="festival">Neighborhood party · +4 delivery points for everyone this round</option></select></label>
        <p>{reward in PERKS ? PERKS[reward as Perk].description : reward === 'supply' ? `${amount*2} random items per selected learner from the 100-item pool.` : reward === 'bridge' ? 'Everyone benefits when the bridge opens.' : 'All crews get a festival bonus in the current round.'} One perk can be used per delivery. Each learner can store five of each perk in this city.</p>
        {reward!=='bridge'&&reward!=='festival'&&<label>Reward bundle<select value={amount} onChange={e=>setAmount(+e.target.value)}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{reward==='supply'?`${n*2} random items`:`${n} perks per learner`}</option>)}</select></label>}
        <button disabled={!targets.length} onClick={() => void action('award',{roomId:city.id,targets,reward,amount},'Reward delivered to the city.')}>Award now for math already completed</button>
        <label>New correct answers per student<input type="number" min={1} max={50} value={goal} onChange={e => setGoal(+e.target.value)}/></label><p>Hints and corrected answers count. Individual perks unlock separately. Shared bridge and party events unlock when every selected student reaches their own goal. A new mission replaces the previous city mission.</p><button disabled={!targets.length || !Number.isInteger(goal) || goal < 1 || goal > 50} onClick={() => void action('mission',{roomId:city.id,targets,reward,goal,amount},'Math mission set. Only new saved answers count.')}>Set math mission</button>
      </fieldset>}
      {city.mission && <p>Mission: {city.mission.goal} new answers each · {city.mission.completed.length}/{city.mission.targets.length} completed.</p>}
      <DeliveryLearning key={city.id} city={city}/>
      <table><thead><tr><th>Crew</th><th>{city.rules.market?'Match coins':'Delivery points'}</th><th>Briefing</th><th>Order</th></tr></thead><tbody>{city.players.map(p => <tr key={p.id}><td>{p.alias}</td><td>{p.score}</td><td>{p.bot ? 'Computer' : `${Math.min(2,p.practice)}/2`}</td><td>{p.submitted ? 'Sealed' : 'Planning'}</td></tr>)}</tbody></table>
      {city.phase !== 'done' && <details><summary>Finish city early</summary><p>This ends the game for everyone with current scores.</p><button disabled={busy} onClick={() => void action('finish',{roomId:city.id},'City finished. Scores are final.')}>Finish this city</button></details>}
    </>}
  </section>;
}
