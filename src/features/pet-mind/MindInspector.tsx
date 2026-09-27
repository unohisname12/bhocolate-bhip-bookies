import type { Pet } from '../../types/pet';
import type { PetDecision } from './decisions';
import { createMind } from './memory';
export function MindInspector({pet,decision}:{pet:Pet;decision?:PetDecision}) {
 const mind=pet.mind??createMind(pet);
 return <details className="pet-mind-inspector"><summary>Pet mind · developer view</summary><p><strong>{decision?.activity??'Settling in'}</strong> · {decision?.reason??'Waiting for the next decision.'}</p><p>Score: {decision?.score.toFixed(1)??'—'}. Runs locally; no API.</p><dl>{Object.entries(mind.traits).map(([trait,value])=><div key={trait}><dt>{trait}</dt><dd>{Math.round(value*100)}%</dd></div>)}</dl><p>{mind.objects.length} remembered objects · {mind.memories.length} memories</p><ul>{mind.memories.slice(0,6).map((m,i)=><li key={i}>{m.kind}{m.objectId?` · ${m.objectId}`:''} · {m.count} meaningful moments</li>)}</ul></details>;
}
