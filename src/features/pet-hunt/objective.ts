import { BEACONS_NEEDED, HEAD_START, type View } from './model';
export function nextObjective(view:View):string {
 const me=view.players.find(p=>p.id===view.you),lit=view.beacons.filter(b=>b.progress>=1).length,escaped=view.players.filter(p=>p.escaped).length,need=BEACONS_NEEDED-lit;
 if(view.phase==='finished')return view.message;
 if(!me)return `Team goal: light ${BEACONS_NEEDED} beacons, then get 3 runners out.`;
 if(me.role==='hunter'){
  const elapsed=view.duration-view.time;
  if(elapsed<HEAD_START)return `Runners’ head start: ${Math.ceil(HEAD_START-elapsed)}s`;
  if(view.gate.state!=='closed')return `GATE ${view.gate.state==='open'?'OPEN':'OPENING'} · Guard it! · ${escaped}/3 escaped`;
  return `Stop the third escape · ${lit}/${BEACONS_NEEDED} lanterns lit · Follow the gold rings`;
 }
 if(me.escaped)return `${escaped}/3 escaped · Your team needs ${Math.max(0,3-escaped)} more to win`;
 if(me.captured)return 'In a bubble · A friend can hold E / Help to rescue you';
 if(view.gate.state==='opening')return `GATE OPENING · ${Math.ceil(view.gate.left)}s · Head to the top of the map!`;
 if(view.gate.state==='open')return `GATE OPEN · Top of the map → tap ESCAPE inside · ${escaped}/3 escaped`;
 return me.charging>=0?'CHARGING · Answer the spark checks — a miss is noisy!':`NEXT: Light ${need} more beacon${need===1?'':'s'} · Tap E at a beacon, then answer the sparks`;
}
