/** Records staged lessons through the actual shared simulation and renderer. No account or saved pet is used. */
import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const out='public/assets/pet-hunt-guide';mkdirSync(out,{recursive:true});
const lessons={
 runner:[
  [0,8,'01 / LIGHT ANY THREE BEACONS','Stand close. Hold E or Help for 5 seconds.','Split up: teammates can light different beacons together.'],
  [8,15,'02 / RESCUE YOUR TEAM','Hold E or Help beside a captured friend for 3 seconds.','A rescued friend gets a short protection window.'],
  [15,22,'03 / MAKE SPACE TO ESCAPE','Your blaster stuns the hunter. Fire, then move away.','Use walls, quiet bushes and your gadget to break the chase.'],
  [22,30,'04 / USE THE BOTTOM GATE','Three lit beacons open the southern portal.','Hold E or Help inside it for 1.5 seconds. Walking over it is not enough.'],
  [30,36,'05 / THREE ESCAPES = TEAM WIN','Get 3 of the 4 runners out before time runs out.','One pet escaping is not the win. Bring your friends home!'],
 ],
 hunter:[
  [0,8,'01 / PLAN YOUR PATROL','Runners get an 8-second head start.','Patrol the beacons. You win by stopping the third escape.'],
  [8,17,'02 / TWO SPACED TAGS','Tag a runner twice to put them in a rescue bubble.','Wait for the 1.8-second glow to fade before your next shot.'],
  [17,25,'03 / AIM, THEN RECOVER','Three charges. Every shot restarts the 3.2-second recharge.','Firing or an empty blaster slows you. Save shots and keep patrolling.'],
  [25,34,'04 / CAPTURE EVERYONE STILL INSIDE','This example starts with three pets already captured.','Capture the last runner before anyone is rescued to win.'],
  [34,41,'05 / OR RUN OUT THE CLOCK','Another win: fewer than 3 escapes when time reaches zero.','Do not camp bubbles: staying close makes them open sooner.'],
 ]
};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{const page=await browser.newPage({viewport:{width:1280,height:720}});await page.goto('http://127.0.0.1:5191');
for(const [side,chapters] of Object.entries(lessons)){
 if(process.argv[2]&&process.argv[2]!==side)continue;
 const data=await page.evaluate(async({side,chapters})=>{
  const model=await import('/src/features/pet-hunt/model.ts'),{draw}=await import('/src/features/pet-hunt/render.ts'),{loadHuntArt}=await import('/src/features/pet-hunt/art.ts');await loadHuntArt();
  document.body.innerHTML='<canvas width="1280" height="720"></canvas>';const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
  const scene=document.createElement('canvas');scene.width=1280;scene.height=720;const g=scene.getContext('2d');
  let m,me,others,hunter,chapter=-1,stunSeen=false,captureSeen=false;const outcomes=[];
  function reset(index){
   m=model.createMatch('garden','normal',180);me=model.addPlayer(m,'you',side==='runner'?'Pip':'Bramble',side,side==='runner'?'koala_sprite':'bramble_hedgehog');model.startMatch(m);for(const p of m.players)p.bot=false;m.time=160;
   hunter=m.players.find(p=>p.role==='hunter');others=m.players.filter(p=>p.role==='runner'&&p.id!=='you');Object.assign(hunter,{x:1000,y:650});
   if(side==='runner'){
    if(index===0){Object.assign(me,m.beacons[0]);others.slice(0,2).forEach((p,i)=>Object.assign(p,m.beacons[i+1]));}
    if(index===1){Object.assign(me,{x:110,y:550});Object.assign(others[0],{x:150,y:550,captured:true});}
    if(index===2){Object.assign(me,{x:100,y:80,aim:0});Object.assign(hunter,{x:260,y:80});}
    if(index===3||index===4){m.beacons.slice(0,3).forEach(b=>b.progress=1);Object.assign(me,model.ARENAS[0].portal);others.slice(0,2).forEach((p,i)=>Object.assign(p,{x:520+i*80,y:650}));}
   }else{
    Object.assign(me,{x:100,y:80,aim:0});others=m.players.filter(p=>p.role==='runner');others.forEach((p,i)=>Object.assign(p,{x:200+i*150,y:80}));
    if(index===0)m.time=m.duration;
    if(index===2)others.forEach(p=>p.y=650);
    if(index===3)others.slice(1).forEach(p=>{p.captured=true;});
    if(index===4){m.time=6;others.slice(0,2).forEach(p=>p.escaped=true);}
   }
  }
  function frame(t){
   const index=chapters.findIndex(c=>t>=c[0]&&t<c[1]);if(index<0)return;
   if(index!==chapter){if(chapter>=0)outcomes.push({chapter,beacons:m.beacons.filter(b=>b.progress>=1).length,winner:m.winner,rescues:me.rescues});if(!(side==='runner'&&index===4))reset(index);chapter=index;}
   const local=t-chapters[index][0],inputs={},idle=model.idleInput;inputs.you=idle();
   if(side==='runner'){
    if(index===0&&local>1)for(const p of [me,...others.slice(0,2)])inputs[p.id]={...idle(),interact:true};
    if(index===1&&local>1)inputs.you={...idle(),interact:true};
    if(index===2){inputs.you={...idle(),fire:local<.1,aim:0,y:local>1?1:0};if(hunter.stun>0)stunSeen=true;}
    if(index===3){inputs.you={...idle(),interact:local>2};if(local>5)for(const p of others.slice(0,2))inputs[p.id]={...idle(),interact:true};}
   }else{
    if(index===1||index===3)inputs.you={...idle(),fire:local>.4&&local<.5||local>2.7&&local<2.8,aim:0};
    if(index===2)inputs.you={...idle(),fire:local<2,aim:-Math.PI/2,x:local>2&&local<5?1:0};
   }
   model.step(m,inputs,1/30);if(others.some(p=>p.captured))captureSeen=true;
   draw(g,model.viewFor(m,'you'),t,{reduced:false,aimAssist:false,hud:{top:90,bottom:175,scale:1}});ctx.drawImage(scene,0,0);
   ctx.fillStyle='#0b1d2bf5';ctx.fillRect(0,0,1280,96);ctx.fillRect(0,550,1280,170);
   ctx.fillStyle='#e8c98b';ctx.font='bold 19px sans-serif';ctx.fillText(`PET HUNT  /  ${side.toUpperCase()} GUIDE  /  PRACTICE DEMONSTRATION`,30,29);
   ctx.fillStyle='#f4f3e4';ctx.font='bold 28px sans-serif';ctx.fillText(chapters[index][2],30,70);
   ctx.font='bold 19px sans-serif';ctx.textAlign='right';ctx.fillStyle='#d6f1c1';ctx.fillText(`${m.beacons.filter(b=>b.progress>=1).length}/3 BEACONS   ${m.players.filter(p=>p.escaped).length}/3 ESCAPED`,1245,32);ctx.fillStyle='#ffe0a4';ctx.fillText(`${Math.floor(Math.ceil(m.time)/60)}:${String(Math.ceil(m.time)%60).padStart(2,'0')}   ${me.ammo}/3 SHOTS`,1245,65);ctx.textAlign='left';
   ctx.font='bold 26px sans-serif';ctx.fillStyle='#fff1c7';ctx.fillText(chapters[index][3],30,591);ctx.font='23px sans-serif';ctx.fillStyle='#c6d9dc';ctx.fillText(chapters[index][4],30,632);
   const status=m.winner?`${m.winner==='runners'?'RUNNERS':'HUNTER'} WIN — ${m.message}`:side==='hunter'&&me.ammo===0?`COOLING: ${Math.max(1,Math.ceil(model.HUNTER_RECHARGE-me.reload))}s until next charge · movement slowed`:side==='runner'&&me.escaped?'YOU ESCAPED · Your team needs three escapes to win.':`Move: WASD / arrows    Fire: click / F    Help: hold E    Gadget: Space`;
   ctx.font='bold 19px sans-serif';ctx.fillStyle='#aee8ac';ctx.fillText(status,30,681);
   ctx.fillStyle='#e1bb72';ctx.fillRect(0,714,1280*t/chapters.at(-1)[1],6);
  }
  frame(0);const chunks=[],stream=canvas.captureStream(30),rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:2300000});rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};const done=new Promise(r=>rec.onstop=r);rec.start();
  await new Promise(resolve=>{let tick=0;const timer=setInterval(()=>{const t=++tick/30;if(t>=chapters.at(-1)[1]){clearInterval(timer);resolve();return;}frame(t);},1000/30);});
  rec.stop();await done;stream.getTracks().forEach(t=>t.stop());
  if(side==='runner'&&(!stunSeen||m.winner!=='runners'||outcomes[0].beacons!==3||outcomes[1].rescues!==1))throw new Error('Runner lesson did not demonstrate the rules');
  if(side==='hunter'&&(!captureSeen||m.winner!=='hunter'||outcomes[3].winner!=='hunter'))throw new Error('Hunter lesson did not demonstrate the win');
  const blob=new Blob(chunks,{type:'video/webm'});return await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob);});
 },{side,chapters});
 writeFileSync(`/tmp/hunt-${side}-lesson.webm`,Buffer.from(data,'base64'));
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',`/tmp/hunt-${side}-lesson.webm`,'-an','-r','30','-c:v','libx264','-preset','fast','-crf','28','-maxrate','1800k','-bufsize','3600k','-pix_fmt','yuv420p','-movflags','+faststart',`${out}/${side}.mp4`]);
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss','2','-i',`${out}/${side}.mp4`,'-frames:v','1',`${out}/${side}.jpg`]);
 const stamp=n=>`00:${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}.000`;
 writeFileSync(`${out}/${side}.vtt`,'WEBVTT\n\n'+chapters.map(c=>`${stamp(c[0])} --> ${stamp(c[1])}\n${c[3]}\n${c[4]}\n`).join('\n'));
 console.log(`Created ${side} walkthrough (${chapters.at(-1)[1]} seconds) with verified game events.`);
}
}finally{await browser.close();}
