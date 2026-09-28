import {WIDTH,HEIGHT,arenaOf,type Arena,type Rect,type View} from './model';
import {art,landmark,prop,PROP,propSprite,ruin} from './art';
type C=CanvasRenderingContext2D;
// One baked background per generated layout (arenaOf memoizes the arena object per seed).
const cache=new WeakMap<Arena,HTMLCanvasElement>();
const rect=(c:C,x:number,y:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(x/2)*2,Math.round(y/2)*2,w,h);};
export function ground(arena:Arena){
 const WIDTH=arena.width??2240,HEIGHT=arena.height??1440;
 const existing=cache.get(arena);if(existing)return existing;
 // Half-resolution terrain makes the paths, texture, and shadows share a pixel grid.
 const canvas=document.createElement('canvas');canvas.width=WIDTH/2;canvas.height=HEIGHT/2;const c=canvas.getContext('2d')!;c.scale(.5,.5);c.imageSmoothingEnabled=false;
 const wood=arena.id==='workshop',moon=arena.id==='moonhouse';
 rect(c,0,0,WIDTH,HEIGHT,wood?'#59483f':moon?'#26384b':'#314d45');
 if(!wood&&!moon&&art.meadow){c.globalAlpha=.38;for(let y=0;y<HEIGHT;y+=512)for(let x=0;x<WIDTH;x+=512)c.drawImage(art.meadow,x,y,512,512);c.globalAlpha=1;}
 if(wood||moon)for(let y=16;y<HEIGHT;y+=wood?28:48)for(let x=-48;x<WIDTH;x+=wood?112:96){
  const xx=x+(y%2?0:((y/ (wood?28:48))%2)*48);
  rect(c,xx,y,wood?110:94,wood?26:46,wood?((x+y)%3?'#695548':'#614c43'):((x+y)%3?'#2d4253':'#314756'));
  rect(c,xx+6,y+4,wood?90:80,2,wood?'#95705155':'#657b8840');
  if(wood){rect(c,xx+8,y+20,60,2,'#342e3340');rect(c,xx+4,y+9,2,2,'#332e30');}
 }
 // Worn paths, with dark soil edges and small offset paving stones.
 c.lineCap='round';c.lineJoin='round';
 const gx=arena.portal.x;
 const route=(color:string,width:number)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(gx,HEIGHT);c.bezierCurveTo(gx,HEIGHT*.75,gx+20,HEIGHT*.45,gx-20,arena.portal.y);c.stroke();
  for(const b of arena.beacons){c.beginPath();c.moveTo(b.x,b.y+8);c.bezierCurveTo(b.x+(gx-b.x)*.25,b.y+24,gx-20,b.y-6,gx,b.y+12);c.stroke();}
 };
 if(!wood){route(moon?'#182b3e':'#263e36',80);route(moon?'#3c5161':'#7d795d',65);route(moon?'#425966':'#89836a',48);}
 for(let i=0;i<Math.round(450*WIDTH*HEIGHT/(1120*720));i++){const x=(i*193+31)%WIDTH,y=(i*97+17)%HEIGHT;
  rect(c,x,y,i%4?2:6,2,wood?'#d3ad7d18':moon?'#adcbd621':'#b4c28c24');
 }
 if(!wood)for(let i=0;i<Math.floor(HEIGHT/27);i++){const y=32+i*27,x=gx-8+Math.sin(y/95)*12;
  rect(c,x-15,y+2,34,17,moon?'#1f3446':'#4a5948');rect(c,x-17,y,34,15,moon?'#647987':'#a7a58a');rect(c,x-13,y,25,2,moon?'#8ca0ac':'#cdbea0');
 }
 // Window light and canopy shadows are baked once, away from gameplay entities.
 if(moon){c.fillStyle='#93cad811';for(let i=0;i<Math.ceil(WIDTH/280);i++){c.beginPath();c.moveTo(i*280+30,0);c.lineTo(i*280+135,0);c.lineTo(i*280+300,HEIGHT);c.lineTo(i*280+190,HEIGHT);c.fill();}}

 // A framed world boundary, not a dashed rectangle.
 rect(c,0,0,WIDTH,12,'#172934');rect(c,0,HEIGHT-12,WIDTH,12,'#172934');rect(c,0,0,12,HEIGHT,'#172934');rect(c,WIDTH-12,0,12,HEIGHT,'#172934');
 for(let x=0;x<WIDTH;x+=40){rect(c,x+2,0,36,8,wood?'#80634a':moon?'#586479':'#657263');rect(c,x+2,HEIGHT-10,36,8,wood?'#80634a':moon?'#586479':'#657263');}
 if(wood){for(let x=80;x<WIDTH;x+=240){prop(c,PROP.books,x,-8,50,68);prop(c,PROP.lantern,x+115,-8,40,56);}}
 else{for(const [x,y]of [[-80,-100],[WIDTH-120,-100],[-100,HEIGHT-80],[WIDTH-80,HEIGHT-80]])ruin(c,3,x,y,190,190);
  for(let i=0;i<70;i++){const x=30+i*157%(WIDTH-70),y=24+i*101%(HEIGHT-60);if(arena.walls.some(r=>x>r.x-20&&x<r.x+r.w+20&&y>r.y-35&&y<r.y+r.h+20))continue;prop(c,i%3===0?PROP.mushroom:PROP.flowers,x,y,16,20);}
 }
 cache.set(arena,canvas);return canvas;
}
export function obstacle(c:C,r:Rect,arena:Arena){
 const wood=arena.id==='workshop',moon=arena.id==='moonhouse';
 rect(c,r.x+6,r.y+10,r.w+2,r.h+3,'#081b2c65');
 if(!wood){ruin(c,moon&&r.w>r.h?2:r.w>r.h?0:1,r.x,r.y-22,r.w,r.h+22);return;}
 if(wood&&r.w>r.h){landmark(c,3,r.x,r.y-38,r.w,r.h+48);return;}
 rect(c,r.x,r.y,r.w,r.h,wood?'#4c3833':moon?'#27394d':'#344740');
 for(let y=r.y;y<r.y+r.h;y+=18)for(let x=r.x;x<r.x+r.w;x+=32){
  rect(c,x+2,y+2,Math.min(28,r.x+r.w-x-2),Math.min(14,r.y+r.h-y-2),wood?'#99704c':moon?'#586d7d':'#778474');
 }
 rect(c,r.x,r.y-14,r.w,r.h,wood?'#816143':moon?'#74828c':'#8c917a');
 rect(c,r.x+2,r.y-14,r.w-4,4,wood?'#d0a472':moon?'#bac3b7':'#b9b594');
 for(let y=r.y-10;y<r.y+r.h-15;y+=24)for(let x=r.x+4;x<r.x+r.w-8;x+=28){rect(c,x,y,Math.min(24,r.x+r.w-x-4),18,wood?'#a47a50':moon?'#647380':'#788475');rect(c,x+2,y+2,12,2,wood?'#d1a366':'#bdc5a844');}
 if(wood){for(let y=r.y;y<r.y+r.h;y+=52)prop(c,PROP.barrel,r.x+4,y-28,46,52);}
 else{for(let i=0;i<Math.ceil(r.w/18);i++){const x=r.x+i*18,y=r.y-12;rect(c,x,y,12,6,moon?'#59796c':'#426c51');rect(c,x+2,y+6,6,8+i%3*4,moon?'#4c6b68':'#365846');}
  if(moon)prop(c,PROP.plant,r.x+r.w/2-20,r.y-35,40,50);
  else {prop(c,PROP.mushroom,r.x+4,r.y-24,22,28);if(r.w>100)prop(c,PROP.flowers,r.x+r.w-32,r.y-25,24,30);}
 }
}
export function cover(c:C,r:Rect,arena:Arena,me?:View['players'][number]){
 const near=me&&me.x>r.x-20&&me.x<r.x+r.w+20&&me.y>r.y-35&&me.y<r.y+r.h+20;
 rect(c,r.x+2,r.y+r.h-8,r.w,14,'#0c273366');c.save();c.globalAlpha=near?.55:1;
 // Hiding spots read as places to duck into: a draped pile indoors, fern clumps in the greenhouse, bushes in the garden.
 if(arena.id==='workshop'&&art.props)propSprite(c,'cover_workshop',r.x+r.w/2,r.y+r.h+8,r.w/96);
 else if(arena.id==='moonhouse'&&art.props){const n=Math.max(1,Math.round(r.w/70));for(let i=0;i<n;i++)propSprite(c,'cover_moon',r.x+(i+.5)*r.w/n,r.y+r.h+6,r.w/n/62);}
 else if(arena.id==='workshop'){for(let x=r.x;x<r.x+r.w;x+=36)prop(c,PROP.books,x,r.y-24,42,r.h+30);}
 else {landmark(c,2,r.x-6,r.y-25,r.w+12,r.h+35,arena.id==='moonhouse'?'moon':'normal');}
 c.restore();
}
const glows=new Map<string,HTMLCanvasElement>();
export function glow(c:C,x:number,y:number,r:number,color:string,strength=1){
 let texture=glows.get(color);if(!texture){texture=document.createElement('canvas');texture.width=128;texture.height=128;const g=texture.getContext('2d')!,gradient=g.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,color);gradient.addColorStop(.4,color+'55');gradient.addColorStop(1,color+'00');g.fillStyle=gradient;g.fillRect(0,0,128,128);glows.set(color,texture);}
 c.save();c.globalCompositeOperation='screen';c.globalAlpha=strength;c.drawImage(texture,x-r,y-r,r*2,r*2);c.restore();
}
export function lighting(c:C,view:View,t:number){
 const arena=arenaOf(view);
 // Light locations come only from shared map objectives, never hidden players.
 for(const b of view.beacons)glow(c,b.x,b.y-25,b.progress>=1?100:52,b.progress>=1?'#e9b457':'#938857',b.progress>=1?.28:.1);
 if(view.gate.state!=='closed')glow(c,arena.portal.x,arena.portal.y-30,110,'#68e2c2',.35);
 if(view.map==='workshop')for(let x=195;x<WIDTH;x+=240)glow(c,x,30,120,'#ffb358',.16);
 else for(let i=0;i<16;i++){const x=(i*197+32)%WIDTH+Math.sin(t*.5+i)*12,y=(i*113+72)%HEIGHT+Math.cos(t*.7+i)*10;glow(c,x,y,14,'#bce6a1',.3);rect(c,x,y,2,2,'#e6ecad');}
}
