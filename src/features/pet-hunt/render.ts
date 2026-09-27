import { BEACONS_NEEDED, HEIGHT, WIDTH, SPECIES, arenaOf, distance, type View, type Arena } from './model';
import { art, companionArt, landmark, propSprite, propTiles } from './art';
import type { Piece } from './mapgen';
import { arenaCamera } from './camera';
import { ground, obstacle, cover, glow, lighting } from './environment';
type PetView=View['players'][number];
const q=(n:number)=>Math.round(n/2)*2;
function box(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,color:string){c.fillStyle=color;c.fillRect(q(x),q(y),q(w),q(h));}
function text(c:CanvasRenderingContext2D,value:string,x:number,y:number,size=12,color='#eff8d7'){
 c.font=`bold ${size}px "JetBrains Mono", monospace`;c.textAlign='center';c.lineJoin='round';c.lineWidth=4;c.strokeStyle='#152c32';c.strokeText(value,q(x),q(y));c.fillStyle=color;c.fillText(value,q(x),q(y));
}
function ring(c:CanvasRenderingContext2D,x:number,y:number,r:number,color:string,progress=1){
 for(let i=0;i<32*progress;i++){const a=i*Math.PI/16;box(c,x+Math.cos(a)*r-2,y+Math.sin(a)*r*.6-2,4,4,color);}
}
function star(c:CanvasRenderingContext2D,x:number,y:number,color:string,size=3){box(c,x-size,y,size*3,size,color);box(c,x,y-size,size,size*3,color);}
// Pixel blaster is an accessory. Aimed away from the camera it goes behind the pet, so it never covers the face.
function blaster(c:CanvasRenderingContext2D,p:PetView,hunter:boolean){
 if(p.captured||p.escaped)return;c.save();c.translate(q(p.x),q(p.y-8));c.rotate(p.aim);const recoil=p.shot>0?-4:0;
 box(c,17+recoil,-6,24,12,'#233843');box(c,19+recoil,-4,18,6,hunter?'#df8c65':'#79d5c8');box(c,35+recoil,-3,10,6,'#f0dfb2');box(c,22+recoil,5,6,7,'#39495c');
 if(p.shot>0){star(c,50,0,hunter?'#ffce83':'#b6fff0',4);box(c,57,-2,7,4,'#fffad4');}c.restore();}
// V-Pet sheets are 128 px frames whose feet sit 12 px above the bottom edge.
const GROUND=12;
const petSize=(p:PetView)=>p.role==='hunter'?112:100;
function pet(c:CanvasRenderingContext2D,p:PetView,t:number,reduced:boolean,you:boolean){
 const hunter=p.role==='hunter',moving=p.moving&&!p.captured&&!p.escaped;
 const time=reduced?0:t,phase=Math.floor(time*(moving?10:4))%8;
 const state=p.stun>0||p.captured?3:p.shot>0?2:p.escaped||p.action==='rescue'||p.action==='interact'?4:moving?1:0;
 const bob=moving&&!reduced?[0,-2,-4,-2,0,-2,-4,-2][phase]:0;
 const size=hunter?86:76;const feet=p.y+12;
 if(moving&&!reduced&&!p.quiet)for(let i=0;i<3;i++){const age=(t*5+i*.33)%1;box(c,p.x-Math.cos(p.aim)*(12+age*18)+(i-1)*6,p.y-Math.sin(p.aim)*(12+age*18)+10,4-age*2,4-age*2,'#d6d5ad55');}
 c.fillStyle='#10203255';c.beginPath();c.ellipse(q(p.x+3),q(p.y+10),hunter?23:19,7,0,0,Math.PI*2);c.fill();
 if(hunter)ring(c,p.x,p.y+10,25,'#e9a96a');
 if(you)ring(c,p.x,p.y+10,26,'#f3efb0');
 const behind=Math.sin(p.aim)<-.35;if(behind)blaster(c,p,hunter);
 c.save();if(p.hidden)c.globalAlpha=.7;if(p.escaped)c.globalAlpha=.65;
 c.translate(q(p.x),q(feet+bob));if(moving&&!reduced)c.rotate(Math.sin(t*10)*.025);if(Math.cos(p.aim)<0)c.scale(-1,1);
 // The learner's own detailed V-Pet sheet when it has loaded; the small arena sheet covers the first moments.
 const detailed=companionArt(p.species,p.stage);
 if(detailed){
  const big=petSize(p),frame=state===2?{img:detailed.attack,x:(phase%4)*128,y:0}:state===3?{img:detailed.hurt,x:(phase%4)*128,y:0}:{img:detailed.sheet,x:phase*128,y:(state===1?1:state===4?2:0)*128};
  c.drawImage(frame.img,frame.x,frame.y,128,128,-big/2,-big+Math.round(big*GROUND/128),big,big);
 }else if(art.pets)c.drawImage(art.pets,(state*8+phase)*64,Math.max(0,SPECIES.indexOf(p.species as typeof SPECIES[number]))*64,64,64,-size/2,-size,size,size);
 c.restore();
 if(!behind)blaster(c,p,hunter);
 if(p.shield>0||p.immune>0)ring(c,p.x,p.y-14,37,p.shield>0?'#ffe4a0':'#b4eaf5');
 if(p.captured){
  ring(c,p.x,p.y+8,32,'#c8a4ed');box(c,p.x-33,p.y-58,4,66,'#c3b4f0aa');box(c,p.x+29,p.y-58,4,66,'#c3b4f0aa');
  for(let i=0;i<6;i++)star(c,p.x-25+i*10,p.y-58+Math.sin(time*3+i)*4,'#d3bcf5',2);
  text(c,'RESCUE ME',p.x,p.y-74,10,'#e4c7ff');box(c,p.x-23,p.y+22,46,5,'#302c49');box(c,p.x-23,p.y+22,46*Math.max(p.rescue,p.captureTime/24),5,'#d5b5f8');
 }
 if(p.stun>0)for(let i=0;i<3;i++)star(c,p.x+Math.cos(time*3+i*2.1)*22,p.y-62+Math.sin(time*3+i*2.1)*5,'#ffeca8',3);
 if(p.action==='rescue'||p.action==='interact')ring(c,p.x,p.y+10,31,'#c5f1aa',.7);

}
// Phase 2–3 map tools: simple pixel shapes so they read clearly at a glance on any theme.
// Furniture art is drawn a little larger than its source pixels so it sits in scale with the pets.
const PROP_SCALE=1.35;
const TILE:Record<string,Partial<Record<Piece['kind'],'wall_v'|'stone_h'|'stone_v'|'hedge_h'|'hedge_v'>>>={
 workshop:{wall_v:'wall_v'},garden:{wall_h:'stone_h',wall_v:'stone_v',hedge_h:'hedge_h',hedge_v:'hedge_v'},moonhouse:{hedge_h:'hedge_h',hedge_v:'hedge_v'},
};
/** Greenhouse walls are drawn in code: dark iron frame, pale glass panes, brick footing. */
function glassWall(c:CanvasRenderingContext2D,p:Piece){
 const vertical=p.kind==='wall_v';
 if(vertical){box(c,p.x,p.y,p.w,p.h,'#2c3544');box(c,p.x+6,p.y,p.w-12,p.h,'#9fc8d6aa');for(let y=p.y;y<p.y+p.h;y+=40)box(c,p.x,y,p.w,4,'#1d242f');return;}
 const top=p.y-34;box(c,p.x,top,p.w,p.h+34,'#2c3544');
 for(let x=p.x+4;x<p.x+p.w-4;x+=34){box(c,x,top+4,Math.min(28,p.x+p.w-4-x),30,'#a7d2dfb0');box(c,x+3,top+7,6,2,'#eef8fb');}
 box(c,p.x,p.y+p.h-16,p.w,16,'#7b3f35');for(let x=p.x;x<p.x+p.w;x+=16)box(c,x,p.y+p.h-10,1,6,'#5a2c25');
}
/** Long workshop walls in code: one continuous run of planks over a stone footing, with staggered seams. */
function plankWall(c:CanvasRenderingContext2D,p:Piece){
 const top=p.y-30,h=p.h+30;box(c,p.x,top,p.w,h,'#3a2a22');
 for(let row=0;row<4;row++){const y=top+3+row*9,shade=row%2?'#8a5d3c':'#9a6a45';box(c,p.x+2,y,p.w-4,8,shade);box(c,p.x+2,y,p.w-4,1,'#b98458');
  for(let x=p.x+((row*37)%56)+18;x<p.x+p.w-6;x+=56)box(c,x,y+1,2,7,'#4a3326');}
 box(c,p.x,top,p.w,3,'#c89662');
 const foot=p.y+p.h-16;box(c,p.x,foot,p.w,16,'#6f6f73');for(let x=p.x;x<p.x+p.w;x+=22){box(c,x+1,foot+2,19,6,'#88888d');box(c,x+11,foot+9,19,6,'#7c7c82');}
}
// Static pieces are painted once into their own small canvas; each frame then costs one drawImage per piece
// instead of hundreds of tiles and pixel runs, which keeps slower classroom Chromebooks at full frame rate.
const PAD_X=48,PAD_TOP=240,PAD_BOTTOM=24,pieceCache=new WeakMap<Piece,HTMLCanvasElement>();
function drawPiece(c:CanvasRenderingContext2D,p:Piece,theme:string){
 let canvas=pieceCache.get(p);
 if(!canvas&&art.props){
  canvas=document.createElement('canvas');canvas.width=Math.ceil(p.w+PAD_X*2);canvas.height=Math.ceil(p.h+PAD_TOP+PAD_BOTTOM);
  const g=canvas.getContext('2d')!;g.imageSmoothingEnabled=false;g.translate(PAD_X-p.x,PAD_TOP-p.y);paintPiece(g,p,theme);pieceCache.set(p,canvas);
 }
 if(canvas)c.drawImage(canvas,Math.round(p.x-PAD_X),Math.round(p.y-PAD_TOP));else paintPiece(c,p,theme);
}
function paintPiece(c:CanvasRenderingContext2D,p:Piece,theme:string){
 const tile=TILE[theme]?.[p.kind];
 if(tile)return propTiles(c,tile,p.x,p.y,p.w,p.h,p.kind.endsWith('_v'),PROP_SCALE);
 if(theme==='workshop'&&p.kind==='wall_h')return plankWall(c,p);
 if(p.kind==='wall_h'||p.kind==='wall_v')return glassWall(c,p);
 if(p.kind==='hedge_h'||p.kind==='hedge_v')return;
 // Furniture: the sprite rises above its floor footprint, centred and scaled to the footprint's width.
 const shadow=p.kind==='pond'||p.kind==='fountain'?0:6;c.fillStyle='#08131c55';c.fillRect(Math.round(p.x+4),Math.round(p.y+p.h-8),Math.round(p.w-2),10);void shadow;
 propSprite(c,p.kind,p.x+p.w/2,p.y+p.h+6,p.w/({shelf:64,table:96,workbench:112,crate:48,barrel:40,bench:64,pond:192,flowerbed:64,planter:96,potting:96,fountain:128} as Record<string,number>)[p.kind]);
}
function locker(c:CanvasRenderingContext2D,x:number,y:number,mine:boolean){
 if(art.props){propSprite(c,'locker',x,y+12,1.3);if(mine)ring(c,x,y+8,22,'#c7ecaa');return;}
 box(c,x-18,y-44,36,54,'#3d5a63');box(c,x-15,y-41,30,48,mine?'#6fa39a':'#557883');for(let i=0;i<3;i++)box(c,x-10,y-34+i*6,20,2,'#2c434b');box(c,x+8,y-14,3,6,'#e9d9a6');text(c,'LOCKER',x,y+22,9,'#cfe3dc');
}
function vent(c:CanvasRenderingContext2D,x:number,y:number,pair:number){
 if(art.props){propSprite(c,'vent',x,y+14,1.2);text(c,`VENT ${pair+1}`,x,y+26,9,['#8fd3ff','#ffb4d9','#c6ff9f','#ffd98a'][pair%4]);return;}
 const tint=['#8fd3ff','#ffb4d9','#c6ff9f','#ffd98a'][pair%4];box(c,x-20,y-10,40,20,'#1d2b33');for(let i=0;i<5;i++)box(c,x-16+i*7,y-7,4,14,tint);text(c,`VENT ${pair+1}`,x,y+24,9,tint);
}
function cage(c:CanvasRenderingContext2D,x:number,y:number,full:boolean){
 if(art.props){propSprite(c,'cage',x,y+14,1.4);if(!full)text(c,'EMPTY CAGE',x,y+28,9,'#cbbfae');return;}
 box(c,x-30,y-58,60,6,'#8b7a66');box(c,x-30,y+6,60,6,'#8b7a66');for(let i=0;i<6;i++)box(c,x-28+i*11,y-54,4,62,full?'#d8b6ff':'#a99a86');text(c,full?'CAGE':'EMPTY CAGE',x,y+26,9,full?'#e6ccff':'#cbbfae');
}
function tools(c:CanvasRenderingContext2D,v:View,arena:Arena,me:PetView|undefined,t:number,layers:{y:number;draw:()=>void}[]){
 (arena.lockers??[]).forEach((l,i)=>layers.push({y:l.y,draw:()=>locker(c,l.x,l.y,!!me&&v.lockers[i]===me.id)}));
 (arena.vents??[]).forEach(([a,b],i)=>{layers.push({y:a.y-20,draw:()=>vent(c,a.x,a.y,i)});layers.push({y:b.y-20,draw:()=>vent(c,b.x,b.y,i)});});
 (arena.cages??[]).forEach(g=>layers.push({y:g.y+12,draw:()=>cage(c,g.x,g.y,v.players.some(p=>p.caged>0&&distance(p,g)<10))}));
 if(arena.door&&!v.doorOpen){const d=arena.door;layers.push({y:d.y+d.h,draw:()=>{box(c,d.x,d.y,d.w,d.h,'#7a4a2c');box(c,d.x+2,d.y+2,d.w-4,d.h-4,'#a86a3c');text(c,'🔒 LOCKED',d.x+d.w/2,d.y+d.h/2+4,10,'#ffe3b0');}});}
 if(v.key&&!v.key.holder){const k=v.key;layers.push({y:k.y,draw:()=>{glow(c,k.x,k.y,26,'#ffe27a',.35);if(art.props){propSprite(c,'key',k.x,k.y+14,1.3);text(c,'KEY',k.x,k.y+24,9,'#ffe7a0');return;}box(c,k.x-10,k.y-4,14,8,'#f5c542');box(c,k.x+4,k.y-2,10,4,'#f5c542');box(c,k.x+10,k.y+2,3,4,'#f5c542');text(c,'KEY',k.x,k.y+20,9,'#ffe7a0');}});}
 for(const tr of v.traps)layers.push({y:tr.y-10,draw:()=>{if(art.props){propSprite(c,'trap',tr.x,tr.y+12,1.2);return;}ring(c,tr.x,tr.y,16,'#d98a5a');box(c,tr.x-10,tr.y-2,20,4,'#6b4a3a');text(c,'TRAP',tr.x,tr.y+18,8,'#f0b48a');}});
 if(v.sensor){const s=v.sensor;layers.push({y:s.y,draw:()=>{if(art.props){propSprite(c,'sensor',s.x,s.y+8,1.3);ring(c,s.x,s.y,24+(Math.sin(t*3)+1)*4,'#8ec5ff66');return;}box(c,s.x-6,s.y-40,12,40,'#4c5f73');box(c,s.x-10,s.y-48,20,10,'#8ec5ff');ring(c,s.x,s.y,24+(Math.sin(t*3)+1)*4,'#8ec5ff66');text(c,'SENSOR',s.x,s.y+16,8,'#bfe0ff');}});}
}
function petLabel(c:CanvasRenderingContext2D,p:PetView,you:boolean){
 const hunter=p.role==='hunter',size=companionArt(p.species,p.stage)?petSize(p)-14:hunter?86:76;
 text(c,p.name+(you?' · YOU':''),p.x,p.y+35,11,you?'#fff4be':'#f1ebd6');
 if(hunter)text(c,'HUNTER',p.x,p.y-size-4,10,'#ffc58c');
 else if(!p.captured&&!p.escaped)for(let i=0;i<2;i++){const x=p.x-10+i*13;box(c,x,p.y-size,9,6,i<p.hp?'#c8eeb8':'#38514c');box(c,x+2,p.y-size+6,5,3,i<p.hp?'#c8eeb8':'#38514c');}
 if(p.hidden&&you)text(c,'HIDDEN',p.x,p.y-77,10,'#c7ecaa');
 if(p.locker>=0)text(c,'IN LOCKER',p.x,p.y-60,10,'#c7ecaa');else if(p.vent>0)text(c,'CRAWLING…',p.x,p.y-60,10,'#9fd8ff');
 if(p.out)text(c,'OUT THIS ROUND',p.x,p.y-60,10,'#c8b8d8');else if(p.caged>0)text(c,`CAGED · ${Math.ceil(p.caged)}s · RESCUE!`,p.x,p.y-74,10,'#e4c7ff');
}
function beacon(c:CanvasRenderingContext2D,b:View['beacons'][number],i:number,t:number,reduced:boolean,near:boolean){
 const lit=b.progress>=1;
 ring(c,b.x,b.y+8,29,'#293f3d');landmark(c,0,b.x-36,b.y-70,72,88,lit?'normal':'unlit');
 if(lit){glow(c,b.x,b.y-48,28,'#ffe7a0',.3);for(let j=0;j<3;j++)star(c,b.x+Math.sin(j*7+t*.5)*16,b.y-68-((reduced?j*8:t*12+j*11)%25),'#f4dfa2',2);}
 if(b.progress>0&&b.progress<1){ring(c,b.x,b.y+8,33,'#e5d298',b.progress);text(c,`${Math.floor(b.progress*100)}%`,b.x,b.y-78,11);}
 if(near&&!lit)text(c,'E · CHARGE',b.x,b.y+39,11,'#ffe2a3');
 else {box(c,b.x-8,b.y+24,16,16,lit?'#ae9862':'#253e43');text(c,lit?'✓':String(i+1),b.x,b.y+37,10,lit?'#fff0c6':'#b1c3b4');}
}
function portal(c:CanvasRenderingContext2D,arena:Arena,gate:View['gate'],lit:number,t:number,reduced:boolean){
 const {x,y}=arena.portal,open=gate.state==='open';
 ring(c,x,y+10,44,open?'#b2eec7':gate.state==='opening'?'#e9d58f':'#52676b');landmark(c,1,x-57,y-96,114,122,open?'normal':'unlit');
 if(open){for(let i=0;i<9;i++){const a=i*2.4+(reduced?0:t),r=12+i*2;star(c,x+Math.cos(a)*r,y-40+Math.sin(a)*r,'#b9fff1',2);}text(c,'ESCAPE HERE · TAP E',x,y+42,12,'#ceffdc');}
 else if(gate.state==='opening'){ring(c,x,y+10,50,'#ffe7a0',1-gate.left/12);text(c,`GATE OPENING · ${Math.ceil(gate.left)}`,x,y+42,12,'#ffe7a0');}
 else text(c,`LIGHT ${BEACONS_NEEDED} LANTERNS · ${lit}/${BEACONS_NEEDED}`,x,y+42,10,'#c6c2a4');
}
export interface DrawOptions {reduced:boolean;aimAssist:boolean;minimap?:boolean;hud?:{top:number;bottom:number;scale:number};}
export function draw(c:CanvasRenderingContext2D,v:View,t:number,options:DrawOptions){
 if(options.reduced)t=0;else if(v.paused)t=v.time;
 const arena=arenaOf(v),me=v.players.find(p=>p.id===v.you),lit=v.beacons.filter(b=>b.progress>=1).length;
 const cw=c.canvas.width,ch=c.canvas.height,{x:cx,y:cy}=arenaCamera(me,cw,ch,options.hud?.top??0,options.hud?.bottom);
 c.imageSmoothingEnabled=false;c.clearRect(0,0,cw,ch);c.fillStyle=v.map==='workshop'?'#493f37':v.map==='moonhouse'?'#263a4b':'#2b443c';c.fillRect(0,0,cw,ch);
 if(art.meadow&&v.map==='garden'){c.save();c.globalAlpha=.18;for(let y=-512;y<ch;y+=512)for(let x=0;x<cw;x+=512)c.drawImage(art.meadow,x,y,512,512);c.restore();}
 c.save();c.translate(-cx,-cy);
 c.drawImage(ground(arena),0,0,WIDTH,HEIGHT);
 if(me&&!me.captured&&!me.escaped&&v.phase==='playing')for(let d=50;d<(options.aimAssist?200:110);d+=14)box(c,me.x+Math.cos(me.aim)*d,me.y+Math.sin(me.aim)*d,2,2,'#f2eeb365');
 const layers:{y:number;draw:()=>void}[]=[];
 // Generated maps draw each typed piece with its own art; the fixed legacy arenas keep the old wall skins.
 if(arena.pieces)arena.pieces.forEach(p=>layers.push({y:p.y+p.h,draw:()=>drawPiece(c,p,arena.id)}));
 else arena.walls.forEach(r=>layers.push({y:r.y+r.h,draw:()=>obstacle(c,r,arena)}));
 arena.bushes.forEach(r=>layers.push({y:r.y+r.h,draw:()=>cover(c,r,arena,me)}));
tools(c,v,arena,me,t,layers);
 v.beacons.forEach((b,i)=>layers.push({y:b.y+12,draw:()=>beacon(c,b,i,t,options.reduced,!!me&&distance(me,b)<85)}));
 layers.push({y:arena.portal.y+12,draw:()=>portal(c,arena,v.gate,lit,t,options.reduced)});
 v.players.forEach(p=>layers.push({y:p.y+12,draw:()=>pet(c,p,t,options.reduced,p.id===v.you)}));
 layers.sort((a,b)=>a.y-b.y).forEach(l=>l.draw());

 for(const b of v.bullets){for(let j=1;j<=4;j++)box(c,b.x-b.vx*.008*j,b.y-b.vy*.008*j,6-j,6-j,b.role==='hunter'?'#e9a66e':'#b3e1c0');star(c,b.x,b.y,'#fff7c7',3);}
 for(const e of v.effects){c.save();c.globalAlpha=Math.min(1,e.life);
  if(e.kind==='smoke'){for(let j=0;j<18;j++){const a=j*2.4,r=15+j*3;box(c,e.x+Math.cos(a)*r-18,e.y+Math.sin(a)*r-18,36,36,'#bdb3d077');}text(c,'SMOKE',e.x,e.y,10,'#f1dfef');}
  else if(e.kind==='decoy')ring(c,e.x,e.y,36+(options.reduced?0:Math.sin(t*5)*12),'#ffcf9b');
  // A charging beacon's hum: an expanding gold ring everyone can see, so the hunter has a lead to chase.
  else if(e.kind==='beacon')ring(c,e.x,e.y-20,(1.4-e.life)*170,'#ffd76a');
  // Hunter-only clue from a trap or the sensor: a red ring where a pet was, roughly.
  else if(e.kind==='ping'){ring(c,e.x,e.y,20+(2-e.life)*40,'#ff6b6b');text(c,'!',e.x,e.y-8,16,'#ffb3b3');}
  else {const radius=e.kind==='pulse'?(1.2-e.life)*200:16+(1-e.life)*30;ring(c,e.x,e.y,radius,e.kind==='hit'?'#ffdeb0':'#c7eab1');for(let j=0;j<8;j++){const a=j*Math.PI/4;star(c,e.x+Math.cos(a)*radius,e.y+Math.sin(a)*radius,'#ffedba',2);}}
  c.restore();
 }
 lighting(c,v,t);
 // Labels stay above scenery and lighting. Cover only labels itself when useful.
 for(const p of v.players)petLabel(c,p,p.id===v.you);
 if(me)for(const r of arena.bushes)if(me.x>r.x-20&&me.x<r.x+r.w+20&&me.y>r.y-25&&me.y<r.y+r.h+25)text(c,me.hidden?'HIDDEN':'SHIFT · HIDE',r.x+r.w/2,r.y+r.h+15,10,'#bddfc2');
 c.restore();
 const uiScale=options.hud?.scale??1,uiWidth=cw/uiScale,uiTop=(options.hud?.top??0)/uiScale;
 c.save();c.scale(uiScale,uiScale);c.translate(0,uiTop);
 if(options.minimap){const k=120/WIDTH,mh=Math.round(HEIGHT*k)+8,mx=(x:number)=>uiWidth-126+x*k,my=(y:number)=>14+y*k;box(c,uiWidth-130,10,128,mh,'#162e35e8');c.strokeStyle='#a4b78c';c.lineWidth=2;c.strokeRect(uiWidth-130,10,128,mh);for(const r of arena.walls)box(c,mx(r.x),my(r.y),Math.max(1,r.w*k),Math.max(1,r.h*k),'#667e6d');box(c,mx(arena.portal.x)-4,my(arena.portal.y)-2,8,5,v.gate.state==='open'?'#b2eec7':v.gate.state==='opening'?'#ffe7a0':'#8aa0a3');for(const b of v.beacons)box(c,mx(b.x)-2,my(b.y)-2,4,4,b.progress>=1?'#c7edae':'#bba77a');for(const p of v.players)if(!p.escaped)box(c,mx(p.x)-2,my(p.y)-2,4,4,p.id===v.you?'#ffffff':p.role==='hunter'?'#fca77a':'#a4e6c9');}
 c.restore();
 if(me){const hunter=v.players.find(p=>p.role==='hunter'&&p.id!==me.id);if(hunter&&distance(me,hunter)<230){c.strokeStyle='#ec986d99';c.lineWidth=8;c.strokeRect(4,4,cw-8,ch-8);text(c,'THE HUNTER IS CLOSE',cw/2,(options.hud?.top??0)+30*uiScale,12*uiScale,'#ffd4a7');}
}

}
