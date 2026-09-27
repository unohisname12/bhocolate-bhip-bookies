import { useContext, useEffect, useRef, useState } from 'react';
import { LearningActionContext } from '../../components/LearningContext';
import { dayKey } from '../pet-mind/life';
import { welcomeLine, type PetLine } from '../pet-mind/voice';
import { PetSprite } from '../../components/pet/PetSprite';
import { ASSETS } from '../../config/assetManifest';
import { COMPANIONS } from '../../config/companionConfig';
import { usePageVisible } from '../../hooks/usePageVisible';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { EngineState } from '../../types/engine';

/** Greetings are presentation only; they never advance care, egg days or rewards. */
export function GoalCompanion({ state, paused = false, interactive = false, scale = 1.15 }: { state: EngineState; showEgg?: boolean; paused?: boolean; interactive?: boolean; scale?: number }) {
  const visible = usePageVisible(), reducedMotion = useReducedMotion();
  const dispatch = useContext(LearningActionContext);
  const [message, setMessage] = useState<{ petId?: string; line?: PetLine } | null>(null);
  const greeted = useRef('');
  const greeting = !!message && message.petId === state.pet?.id;
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(null), 12000); return () => clearTimeout(timer); }, [message]);
  useEffect(() => { if (interactive && visible && state.pet?.id) dispatch({type:'PET_VISIT'}); }, [interactive, visible, state.pet?.id, dispatch]);
  useEffect(() => {
    const pet = state.pet, life = pet?.mind?.life;
    if (!interactive || !visible || paused || !pet || !life || ['dead','sleeping'].includes(pet.state)) return;
    const key = `welcome:${dayKey(Date.now())}`, visitKey = `${pet.id}:${key}`;
    if (greeted.current === visitKey || life.said.some(s => s.key === key)) return;
    const timer = setTimeout(() => {
      greeted.current = visitKey;
      const line = welcomeLine(pet, state, Date.now());
      setMessage({petId:pet.id,line});
      dispatch({type:'PET_SAID',key:line.key});
      dispatch({type:'PET_SAID',key});
    }, 350);
    return () => clearTimeout(timer);
  }, [state, interactive, visible, paused, dispatch]);
  const sayHello = () => {
    const pet = state.pet, line = pet ? welcomeLine(pet, state, Date.now()) : undefined;
    setMessage({petId:pet?.id,line});
    if (line) dispatch({type:'PET_SAID',key:line.key});
  };
  const pet = state.pet; // A new egg goal must never replace an already hatched companion.
  const matched = state.eggDiscovery?.status === 'matched' ? state.eggDiscovery.companion : null;
  const eggType = state.egg?.type ?? (matched ? COMPANIONS[matched].egg : 'basic');
  const still = paused || reducedMotion || !visible;
  const art = <div className="student-companion-stage" aria-hidden="true">
    <span className="student-companion-spark spark-one">✦</span><span className="student-companion-spark spark-two">✧</span><span className="student-companion-ground" />
    {pet ? <div className="student-companion-pet"><PetSprite speciesId={pet.speciesId} stage={pet.stage} animationName={pet.state === 'dead' ? 'dead' : pet.state === 'sleeping' ? 'sleeping' : pet.needs.health < 30 ? 'sick' : pet.needs.hunger < 30 ? 'hungry' : greeting ? pet.speciesId === 'subtrak' && pet.stage === 'baby' ? 'being_petted' : message?.line?.animation ?? 'happy' : 'idle'} paused={still} scale={scale} equippedCosmetics={state.cosmetics.equipped[pet.id] ?? undefined} /></div>
      : <img className="student-companion-egg" src={(ASSETS.eggs[eggType] ?? ASSETS.eggs.basic).url} alt="" width={128} height={128} />}
  </div>;
  return <figure className="student-companion" data-still={still} data-greeting={greeting} aria-label={pet ? `${pet.name}, your companion` : 'Your adventure egg'}>
    {interactive ? <button className="student-companion-hello" onClick={sayHello} aria-label={pet ? `Say hello to ${pet.name}` : 'Say hello to your egg'}>{art}</button> : art}
    {greeting && <span className="student-companion-greeting" role="status">{pet ? `${pet.name}: ${message?.line?.text ?? "Hello! ♡"}` : 'Wiggle, wiggle! Hello in there! ♡'}</span>}
    <figcaption>{interactive ? 'Click to say hello' : pet ? pet.name : 'Your adventure is growing'}</figcaption>
  </figure>;
}
