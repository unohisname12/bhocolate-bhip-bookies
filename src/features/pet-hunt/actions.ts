import { ESCAPE_RANGE, USE_RANGE, arenaOf, distance, type View } from './model';

export interface Action { title: string; hint: string; urgent?: boolean }
/** What the action button (E) will do right now, so the label always matches the result of pressing it. */
export function currentAction(view: View): Action {
  const me = view.players.find(p => p.id === view.you), arena = arenaOf(view);
  if(view.evolution&&me){if(me.evo?.grabbedBy)return {title:'Struggle free',hint:'Hold to break the grip',urgent:true};if(me.evo?.echo)return {title:'Earn second life',hint:'Five familiar math questions'};return {title:'Interact',hint:'Rifts · supplies · core parts'};}
  if (!me || me.escaped || me.out) return { title: 'Help / use', hint: 'Light · rescue · escape' };
  const near = (p: { x: number; y: number }, r = USE_RANGE) => distance(me, p) < r;
  if (me.role === 'hunter') {
    const cage = (arena.cages ?? []).find(c => near(c, 70) && !view.players.some(p => p.caged > 0 && distance(p, c) < 10));
    if (me.carrying) return cage ? { title: 'Cage pet', hint: 'Lock them in', urgent: true } : { title: 'Put down', hint: 'Find a free cage' };
    if ((arena.lockers ?? []).some(l => near(l, USE_RANGE + 10))) return { title: 'Check locker', hint: 'Is someone hiding?' };
    if (view.players.some(p => p.role === 'runner' && p.captured && !p.out && p.caged <= 0 && near(p, 60))) return { title: 'Pick up pet', hint: 'Carry to a cage', urgent: true };
    return { title: 'Help / use', hint: 'Pick up · cage · check lockers' };
  }
  if (me.locker >= 0) return { title: 'Leave locker', hint: 'Or just move' };
  if (view.gate.state === 'open' && near(arena.portal, ESCAPE_RANGE)) return { title: 'ESCAPE!', hint: 'Tap to get out', urgent: true };
  if (view.key?.holder === me.id && !view.doorOpen && arena.door && near({ x: arena.door.x + arena.door.w / 2, y: arena.door.y + arena.door.h / 2 }, 90)) return { title: 'Unlock door', hint: 'Use the key', urgent: true };
  if (me.charging >= 0) return { title: 'Charging…', hint: 'Answer the sparks!' };
  if (view.beacons.some(b => b.progress < 1 && near(b, 62))) return { title: 'Charge beacon', hint: 'Tap once, then answer sparks' };
  if ((arena.vents ?? []).some(([a, b]) => near(a) || near(b)) && me.ventCooldown <= 0) return { title: 'Crawl through vent', hint: 'Pop out far away' };
  if ((arena.lockers ?? []).some((l, i) => near(l) && view.lockers[i] === null)) return { title: 'Hide in locker', hint: 'The hunter can check' };
  return { title: 'Help / use', hint: 'Light · rescue · escape' };
}
