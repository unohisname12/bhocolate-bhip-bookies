import { useEffect, useState } from 'react';
import type { EngineState } from '../../types/engine';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
import { pilotAPI } from '../../pilot/api';
import type { ClassroomMetadata, PetNameRow } from '../../pilot/metadata';
import { COMPANIONS, isCompanion } from '../../config/companionConfig';
import { FOOD_ITEMS } from '../../config/gameConfig';
import {
  ACTIVITIES, ACTIVITY_LABELS, MOVE_FIRST, MOVE_SECOND, NAME_FIRST, NAME_SECOND, PERSONALITIES, PERSONALITY_LABELS, SNACKS, TITLES,
  chipName, earnedTitles, type PetIdentity, type Activity, type MoveFirst, type MoveSecond, type NameFirst, type NameSecond, type Personality, type Snack, type TitleId,
} from './model';
import { TREASURES } from '../pet-mind/life';
import './pet-identity.css';

// A short list of next goals reads better for young players than every locked title at once.
const NEXT_TITLES = 3;
const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

function Chips<T extends string>({ label, words, value, onPick }: { label: string; words: readonly T[]; value: T; onPick: (w: T) => void }) {
  return <fieldset className="pi-chips"><legend>{label}</legend>{words.map(w => <button type="button" key={w || 'none'} aria-pressed={value === w} onClick={() => onPick(w)}>{w || 'No first word'}</button>)}</fieldset>;
}

export function PetIdentityStudio({ state, dispatch }: { state: EngineState; dispatch: (a: GameEngineAction) => void }) {
  const pet = state.pet!, identity = pet.identity ?? {};
  const species = isCompanion(pet.speciesId) ? COMPANIONS[pet.speciesId].name : 'Companion';
  const set = (patch: Partial<PetIdentity>, approvedName?: string) => dispatch({ type: 'SET_PET_IDENTITY', patch, approvedName });
  const [first, setFirst] = useState<NameFirst>(identity.nameWords?.[0] ?? 'Captain');
  const [second, setSecond] = useState<NameSecond>(identity.nameWords?.[1] ?? 'Waffles');
  const [moveA, setMoveA] = useState<MoveFirst>(identity.moveWords?.[0] ?? 'Waffle');
  const [moveB, setMoveB] = useState<MoveSecond>(identity.moveWords?.[1] ?? 'Blast');
  const [typed, setTyped] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  // Outside the classroom pilot there is no teacher to approve typed names; chips still work.
  const [server, setServer] = useState<{ row?: PetNameRow; typed: boolean } | null>(null);
  const load = async () => {
    const meta = await pilotAPI<ClassroomMetadata>('metadata');
    setServer({ row: meta.petNames?.find(r => r.pet_id === pet.id), typed: meta.typedPetNames !== false });
  };
  useEffect(() => { void load().catch(() => setServer(null)); }, [pet.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const treasures = pet.mind?.life?.treasures ?? [];
  const earned = earnedTitles(state.player.lifetimeMathCorrect, state.skillReviews);
  const approved = server?.row?.approved ?? null, pending = server?.row?.status === 'pending' ? server.row.proposed : null;
  const locked = (Object.keys(TITLES) as TitleId[]).filter(id => !earned.includes(id));
  const titleGrid = (ids: TitleId[]) => <div className="pi-titles">{ids.map(id => {
    const has = earned.includes(id);
    return <button type="button" key={id} disabled={!has} aria-pressed={identity.title === id} onClick={() => set({ title: identity.title === id ? undefined : id })}>
      <strong>{TITLES[id].label}</strong><small>{has ? (identity.title === id ? 'Wearing it' : 'Tap to wear') : `🔒 ${TITLES[id].how}`}</small></button>;
  })}</div>;
  const snackLabel = (id: Snack) => FOOD_ITEMS.find(f => f.id === id)?.label ?? id;

  return <section className="pi-studio" aria-label="Make your pet yours">
    <header><p className="student-eyebrow">MAKE IT YOURS</p><h2>{pet.name}{identity.title && earned.includes(identity.title) ? ` ${TITLES[identity.title].label}` : ''}</h2><p>{species} · classmates see this name in duels.</p></header>

    <details open><summary>Name</summary>
      <p className="pi-help">Tap one word from each row. Every chip is classroom-approved, so it works right away.</p>
      <Chips label="First word" words={NAME_FIRST} value={first} onPick={setFirst}/>
      <Chips label="Name" words={NAME_SECOND} value={second} onPick={setSecond}/>
      <div className="pi-actions"><strong className="pi-preview" aria-live="polite">{chipName([first, second])}</strong>
        <button type="button" onClick={() => { setFirst(pick(NAME_FIRST)); setSecond(pick(NAME_SECOND)); }}>Surprise me</button>
        <button type="button" className="pi-primary" onClick={() => { set({ nameSource: 'chips', nameWords: [first, second] }); setMessage(`Your pet is now ${chipName([first, second])}.`); }}>Use this name</button>
        {identity.nameSource && identity.nameSource !== 'species' && <button type="button" onClick={() => { set({ nameSource: 'species' }); setMessage(`Back to ${species}.`); }}>Use {species}</button>}</div>
      {server?.typed && <form className="pi-typed" onSubmit={async e => {
        e.preventDefault(); setBusy(true);
        try { await pilotAPI('pet-name', 'POST', { petId: pet.id, name: typed }); await load(); setTyped(''); setMessage('Sent to your teacher. Keep playing while they review it.'); }
        catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
      }}>
        <label>Or type your own name<input value={typed} maxLength={24} onChange={e => setTyped(e.target.value)} placeholder="Your teacher approves it first"/></label>
        <button disabled={busy || typed.trim().length < 2}>Ask my teacher</button>
      </form>}
      {pending && <p role="status">Waiting for your teacher: “{pending}”. <button type="button" onClick={async () => { await pilotAPI('pet-name', 'POST', { petId: pet.id, cancel: true }); await load(); }}>Cancel request</button></p>}
      {server?.row?.status === 'declined' && !approved && <p role="status">Your teacher said no to that name. Try another one.</p>}
      {approved && identity.nameSource !== 'typed' && <p role="status">Your teacher approved “{approved}”. <button type="button" className="pi-primary" onClick={() => { set({ nameSource: 'typed' }, approved); setMessage(`Your pet is now ${approved}.`); }}>Use {approved}</button></p>}
    </details>

    <details><summary>Title</summary>
      <p className="pi-help">Titles come from your math. Master a skill on two different days to earn its title.</p>
      {titleGrid([...earned, ...locked.slice(0, NEXT_TITLES)])}
      {locked.length > NEXT_TITLES && <details className="pi-more"><summary>See all {locked.length} titles to earn</summary>{titleGrid(locked.slice(NEXT_TITLES))}</details>}
    </details>

    <details><summary>Signature move</summary>
      <p className="pi-help">Your pet shouts this when it strikes in a duel.</p>
      <Chips label="Power" words={MOVE_FIRST} value={moveA} onPick={setMoveA}/>
      <Chips label="Action" words={MOVE_SECOND} value={moveB} onPick={setMoveB}/>
      <div className="pi-actions"><strong className="pi-preview">{chipName([moveA, moveB])}</strong>
        <button type="button" onClick={() => { setMoveA(pick(MOVE_FIRST)); setMoveB(pick(MOVE_SECOND)); }}>Surprise me</button>
        <button type="button" className="pi-primary" onClick={() => { set({ moveWords: [moveA, moveB] }); setMessage(`Signature move: ${chipName([moveA, moveB])}!`); }}>Use this move</button></div>
    </details>

    <details><summary>Personality & favorites</summary>
      <fieldset className="pi-personality"><legend>Personality</legend>{PERSONALITIES.map((p: Personality) =>
        <label key={p}><input type="radio" name="pi-personality" checked={identity.personality === p} onChange={() => set({ personality: p })}/><strong>{PERSONALITY_LABELS[p].title}</strong><small>{PERSONALITY_LABELS[p].help}</small></label>)}</fieldset>
      <div className="pi-favorites">
        <label>Favorite snack<select value={identity.snack ?? ''} onChange={e => set({ snack: (e.target.value || undefined) as Snack | undefined })}><option value="">No favorite yet</option>{SNACKS.map(s => <option key={s} value={s}>{snackLabel(s)}</option>)}</select></label>
        <label>Favorite thing to do<select value={identity.activity ?? ''} onChange={e => set({ activity: (e.target.value || undefined) as Activity | undefined })}><option value="">No favorite yet</option>{ACTIVITIES.map(a => <option key={a} value={a}>{ACTIVITY_LABELS[a]}</option>)}</select></label>
      </div>
      <p className="pi-help">Favorites give a little extra bond when you feed or care for your pet that way.</p>
    </details>
    <details><summary>Treasure shelf · {treasures.length}</summary>
      {treasures.length ? <ul className="pi-treasures">{treasures.map(t => <li key={t.id}><span aria-hidden="true">{TREASURES[t.id].icon}</span><strong>{TREASURES[t.id].name}</strong><small>Found {new Date(t.at).toLocaleDateString()}</small></li>)}</ul>
        : <p className="pi-help">Take care of {pet.name} and it may find little keepsakes to put here.</p>}
    </details>
    <p role="status" className="pi-message">{message}</p>
  </section>;
}
