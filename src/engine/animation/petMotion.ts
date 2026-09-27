/** Small whole-body gestures layered over the original illustrated frames. */
export interface PetPose { x: number; y: number; sx: number; sy: number; rotation: number; gesture: string }
const wave = (time: number, period: number) => Math.sin(time / period * Math.PI * 2);
const envelope = (t: number) => Math.sin(Math.PI * Math.max(0,Math.min(1,t))) ** 2;
export function petPersonality(species: string) {
  if (species.includes('rabbit')) return { tempo: 1.2, energy: 1.05, offset: 2 };
  if (species.includes('otter')) return { tempo: 1.08, energy: 1, offset: 0 };
  if (species.includes('axolotl')) return { tempo: .8, energy: .75, offset: 3 };
  if (species.includes('hedgehog')) return { tempo: .86, energy: .85, offset: 1 };
  if (species.includes('dragon')) return { tempo: .95, energy: 1.05, offset: 0 };
  if (species.includes('turtle')) return { tempo: .72, energy: .65, offset: 2 };
  if (species.includes('fox')) return { tempo: 1.15, energy: 1.1, offset: 0 };
  if (species.includes('owl')) return { tempo: .88, energy: .8, offset: 1 };
  return { tempo: 1, energy: .9, offset: 3 };
}
export function samplePetPose(animation: string, elapsed: number, species: string): PetPose {
  const {tempo,energy,offset}=petPersonality(species), time=elapsed*tempo;
  const pose:PetPose={x:0,y:0,sx:1,sy:1,rotation:0,gesture:animation};
  if (animation==='dead') return {...pose,gesture:'still'};
  if (animation==='sleeping' || animation==='being_comforted') {
    pose.sy=1+wave(time,3800)*.018;pose.sx=1-wave(time,3800)*.009;
    pose.rotation=animation==='being_comforted'?wave(time,4200)*1.3:0;
    pose.gesture=animation==='sleeping'?'sleep-breath':'comfort-sway'; return pose;
  }
  if (animation==='walking') {pose.y=-Math.abs(wave(time,520))*1.1*energy;pose.rotation=wave(time,520)*.6;pose.sx=1+wave(time,260)*.012;pose.gesture='little-steps';return pose;}
  if (animation==='eating') {const bite=envelope((time%800)/800);pose.y=bite*2;pose.rotation=bite*3;pose.sy=1-bite*.035;pose.gesture='nibble';return pose;}
  if (animation==='being_washed' || animation==='dirty') {const shake=envelope((time%3400)/1200);pose.rotation=wave(time,170)*3*shake;pose.x=wave(time,170)*1.5*shake;pose.gesture='shake-off';return pose;}
  if (animation==='being_brushed') {pose.rotation=wave(time,1800)*2.5;pose.sy=1+wave(time,1800)*.018;pose.gesture='brush-wiggle';return pose;}
  if (animation==='being_petted') {pose.rotation=wave(time,2600)*3;pose.sy=1-envelope((time%1800)/1800)*.025;pose.gesture='contented-lean';return pose;}
  if (animation==='being_trained') {pose.sy=1-envelope((time%1600)/1600)*.055;pose.y=envelope((time%1600)/1600)*1.5;pose.gesture='attentive-nod';return pose;}
  if (animation==='hungry') {pose.rotation=wave(time,2200)*1.8;pose.y=envelope((time%2200)/2200)*1.2;pose.gesture='hopeful-sniff';return pose;}
  if (animation==='playing_with_hand') {pose.x=wave(time,1800)*3*energy;pose.y=-Math.abs(wave(time,900))*3*energy;pose.rotation=wave(time,1800)*3;pose.gesture='playful-pounce';return pose;}
  if (animation==='sick') {pose.sy=1+wave(time,3200)*.008;pose.rotation=wave(time,4600)*.6;pose.gesture='quiet-breath';return pose;}
  if (!['idle','happy','playing_with_hand'].includes(animation)) return pose;
  pose.sy=1+wave(time,2600)*.012;pose.y=wave(time,2600)*.7*energy;
  const cheerful=animation!=='idle', cycle=cheerful?5200:9000, part=time%cycle;
  const duration=cheerful?1500:2200, start=cheerful?1100:3600;
  pose.gesture='breathing';
  if (part>=start && part<start+duration) {
    const progress=(part-start)/duration, amount=envelope(progress), index=(Math.floor(time/cycle)+offset)%4;
    if (cheerful || index===2) {pose.y-=Math.abs(Math.sin(progress*Math.PI*2))*5*energy;pose.sx+=amount*.035;pose.sy-=amount*.025;pose.gesture=cheerful?'happy-hop':'little-hop';}
    else if(index===0) {pose.rotation=wave(progress,1)*3.5*amount;pose.x=wave(progress,1)*1.4;pose.gesture='look-around';}
    else if(index===1) {pose.sy+=amount*.055;pose.sx-=amount*.03;pose.rotation=amount*-1.5;pose.gesture='stretch';}
    else {pose.rotation=wave(progress,1)*3*amount;pose.sy-=amount*.016;pose.gesture='curious-sway';}
  }
  return pose;
}
