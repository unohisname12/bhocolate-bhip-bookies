/** Staged demonstrations resolve through the game's actual power and capture rules. */
import {chromium} from '@playwright/test';
import {writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const out='public/assets/momentum-v2';mkdirSync(out,{recursive:true});
const chapters=[
 [0,8,'POWER CLASH','Four guardians. Four math powers.','No answers to type. Choose a piece, then a glowing tile or power.'],
 [8,17,'+ SCOUT / CHARGE','Give an ally +2 energy.','Walk up to 3 straight tiles; pieces block your path. Charge reaches 2 tiles, including diagonals.'],
 [17,26,'− SHADE / DRAIN','Spend 2 to remove up to 2.','Slide up to 3 diagonal tiles. Drain an enemy within 2 tiles. Their next turn still restores +1.'],
 [26,35,'× LANCER / DOUBLE STRIDE','2 energy carries you 4 tiles.','Vault exactly 2 or 4 straight tiles, jumping over other pieces. Land on an enemy to capture it.'],
 [35,44,'÷ WEAVER / SPLIT','6 energy becomes 3 + 3.','Move up to 2 straight or diagonal tiles. With 2, 4 or 6 energy, share half with an adjacent ally.'],
 [44,53,'CAPTURE ALL FOUR TO WIN','Take the last red guardian.','Move or use one power each turn. Recharge +1, capped at 6. Win before the 60-turn limit.'],
];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{const page=await browser.newPage();await page.goto('http://localhost:5199');
const data=await page.evaluate(async chapters=>{
 const sys=await import('/src/engine/systems/MomentumSystem.ts'),powers=await import('/src/engine/systems/MomentumPowers.ts');
 const art=new Image();art.src='/assets/momentum-v2/guardians.png';await art.decode();
 const c=document.createElement('canvas');c.width=1280;c.height=720;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
 const p=(id,role,x,y,energy=3,team='player')=>({id,mathPower:role,team,rank:2,energy,position:{x,y},isTemporaryRank4:false,rank4TurnsRemaining:0,previousRank:null});
 const scenarios=[null,[p('p','add',1,5),p('a','multiply',3,5,1),p('e','divide',6,0,2,'enemy')],[p('p','subtract',2,3,4),p('e','multiply',4,3,3,'enemy')],[p('p','multiply',1,5,2),p('a','add',1,4),p('e','subtract',1,1,3,'enemy'),p('e2','divide',6,0,2,'enemy')],[p('p','divide',3,4,6),p('a','subtract',4,4,0),p('e','add',0,0,2,'enemy')],[p('p','add',3,4,3),p('e','divide',3,2,2,'enemy')]];
 let state,index=-1,acted=false;const verified=[];const symbols=['+','−','×','÷'];
 const text=(s,x,y,size=20,color='#d5e2d9',weight=500)=>{ctx.font=`${weight} ${size}px sans-serif`;ctx.fillStyle=color;ctx.fillText(s,x,y);};
 function wrap(s,x,y,width,size=23){ctx.font=`500 ${size}px sans-serif`;let line='',rows=0;for(const w of s.split(' ')){if(ctx.measureText(line+w).width>width){text(line,x,y+rows*34,size);rows++;line='';}line+=w+' ';}text(line,x,y+rows*34,size);return y+(rows+1)*34;}
 function draw(t){const ci=chapters.findIndex(a=>t>=a[0]&&t<a[1]);const ch=chapters[Math.max(0,ci)],local=t-ch[0];if(ci!==index){index=ci;acted=false;state=sys.initMomentum('hard','powers');if(scenarios[index]){state.pieces=structuredClone(scenarios[index]);state.board=sys.buildBoard(state.pieces,7);}}
  if(local>=4.5&&!acted&&index>0){acted=true;if([1,2,4].includes(index)){state=powers.applyMathPower(state,'p',index===2?'e':'a');const energies=state.pieces.map(p=>p.energy);const expected=index===1?[3,3,2]:index===2?[2,1]:[3,3,2];if(JSON.stringify(energies)!==JSON.stringify(expected))throw Error('Power demonstration mismatch');}else{state=sys.selectPiece(state,'p');state=sys.advanceAfterAnimation(sys.beginMove(state,state.validMoves.findIndex(m=>m.targetPieceId==='e')));if(state.pieces.some(p=>p.id==='e'))throw Error('Capture demo failed');if(index===5&&state.phase!=='victory')throw Error('Win demo failed');}verified.push(index);}
  ctx.fillStyle='#10252f';ctx.fillRect(0,0,1280,720);ctx.fillStyle='#1b3640';ctx.fillRect(26,26,1228,668);text('MOMENTUM',60,70,26,'#f1d49a',800);text('POWER CLASH • HARD',855,68,17,'#a4c7c0',700);
  const bx=64,by=110,cell=72;ctx.fillStyle='#829f8b';ctx.fillRect(bx-6,by-6,cell*7+12,cell*7+12);
  for(let y=0;y<7;y++)for(let x=0;x<7;x++){ctx.fillStyle=(x+y)%2?'#2c4953':'#354f58';ctx.fillRect(bx+x*cell,by+y*cell,cell-2,cell-2);}
  if(index>0){const orig=scenarios[index],a=orig[0],target=orig.find(p=>p.id===([1,4].includes(index)?'a':'e'));ctx.strokeStyle='#f8d992';ctx.lineWidth=4;for(const piece of[a,target])ctx.strokeRect(bx+piece.position.x*cell+3,by+piece.position.y*cell+3,cell-8,cell-8);if(local>2&&local<5){ctx.strokeStyle='#f5dda0';ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(bx+(a.position.x+.5)*cell,by+(a.position.y+.5)*cell);ctx.lineTo(bx+(target.position.x+.5)*cell,by+(target.position.y+.5)*cell);ctx.stroke();ctx.setLineDash([]);}}
  for(const piece of state.pieces){let {x,y}=piece.position;if([3,5].includes(index)&&piece.id==='p'&&!acted&&local>3){const end=scenarios[index].find(p=>p.id==='e').position;const f=Math.min(1,(local-3)/1.5);x+=(end.x-x)*f;y+=(end.y-y)*f;}const role=powers.POWER_ORDER.indexOf(piece.mathPower),px=bx+x*cell,py=by+y*cell;ctx.fillStyle=piece.team==='player'?'#76cde6':'#e6919c';ctx.beginPath();ctx.ellipse(px+36,py+57,27,9,0,0,7);ctx.fill();ctx.drawImage(art,role*art.width/4,(piece.team==='player'?0:1)*art.height/2,art.width/4,art.height/2,px+2,py-3,68,68);ctx.fillStyle='#11262f';ctx.fillRect(px+2,py+3,22,22);text(symbols[role],px+5,py+21,20,'#e8dec2',800);ctx.fillStyle='#11262f';ctx.fillRect(px+26,py+53,23,19);text(String(piece.energy),px+31,py+69,18,'#f5d78c',800);}
  const right=640; text(`${String(index+1).padStart(2,'0')} / 06`,right,125,17,'#8bb7ad',800);wrap(ch[2],right,170,550,29);const role=index===1?0:index===2?1:index===3?2:index===4?3:0;ctx.drawImage(art,role*art.width/4,0,art.width/4,art.height/2,1030,210,150,150);wrap(ch[3],right,280,360,29);wrap(ch[4],right,395,535,22);
  if(index===0){text('BLUE = YOU     RED = COMPUTER',right,560,20,'#edd49d',700);}else if(acted){const label=index===1?'ALLY: 1 → 3 ENERGY':index===2?'YOU: 4 → 2 • ENEMY: 3 → 1':index===3?'VAULT + CAPTURE • 2 ENERGY USED':index===4?'WEAVER: 6 → 3 • ALLY: 0 → 3':'VICTORY • NO RED PIECES LEFT';wrap(label,right,555,540,21);}else{text(index===5?'Example: three enemies already captured.':'Watch the highlighted pieces…',right,560,19,'#efdbad');}
  text(index===0?'No quizzes. The pieces do the math.':'One action ends your turn. Every piece gets +1 on its team’s next turn.',64,660,20,'#d8e6d7');ctx.fillStyle='#d9bd79';ctx.fillRect(26,691,1228*t/53,3);
 }
 draw(0);const stream=c.captureStream(24),rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:2200000}),chunks=[];rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};const done=new Promise(r=>rec.onstop=r);rec.start();await new Promise(resolve=>{let frame=0;const timer=setInterval(()=>{const t=++frame/24;if(t>=53){clearInterval(timer);resolve();return;}draw(t);},1000/24);});rec.stop();await done;stream.getTracks().forEach(t=>t.stop());if(verified.length!==5)throw Error('Missing demonstration');const blob=new Blob(chunks,{type:'video/webm'});return await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob);});
},chapters);
writeFileSync('/tmp/momentum-powers-guide.webm',Buffer.from(data,'base64'));
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i','/tmp/momentum-powers-guide.webm','-an','-r','24','-c:v','libx264','-preset','fast','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',`${out}/powers-guide.mp4`]);
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss','1','-i',`${out}/powers-guide.mp4`,'-frames:v','1',`${out}/powers-poster.jpg`]);
const stamp=n=>`00:00:${String(n).padStart(2,'0')}.000`;
writeFileSync(`${out}/powers-guide.vtt`,'WEBVTT\n\n'+chapters.map(c=>`${stamp(c[0])} --> ${stamp(c[1])}\n${c[3]} ${c[4]}\n`).join('\n'));console.log('Recorded 53-second rules-verified powers guide.');
}finally{await browser.close();}
