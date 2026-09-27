// Export complete connected sprites before scaling. Never slice a character at
// an assumed grid edge: generated poses can extend beyond their nominal cell.
import sharp from 'sharp';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
const clear={r:0,g:0,b:0,alpha:0};
const root=new URL('../',import.meta.url).pathname;
const out=root+'public/assets/companions-v1/';
const audit=[];
async function extractGrid(file,cols,rows,targets){
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const seen=new Uint8Array(info.width*info.height),groups=Array.from({length:cols*rows},()=>[]);
 for(let start=0;start<seen.length;start++){
  if(seen[start]||data[start*4+3]<=32)continue;
  const pixels=[start];seen[start]=1;let l=info.width,r=0,t=info.height,b=0;
  for(let i=0;i<pixels.length;i++){
   const p=pixels[i],x=p%info.width,y=Math.floor(p/info.width);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);
   for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){const n=ny*info.width+nx;if(nx<0||nx>=info.width||ny<0||ny>=info.height||seen[n]||data[n*4+3]<=32)continue;seen[n]=1;pixels.push(n);}
  }
  if(pixels.length<8)continue;
  const col=Math.min(cols-1,Math.floor((l+r)/2/info.width*cols)),row=Math.min(rows-1,Math.floor((t+b)/2/info.height*rows));
  groups[row*cols+col].push({pixels,l,r,t,b});
 }
 const cells=groups.map((parts,index)=>{
  parts.sort((a,b)=>b.pixels.length-a.pixels.length);const main=parts[0];if(!main)throw Error(`Missing ${file} cell ${index}`);
  // Keep nearby disconnected leaves, sparks and ears, discard a neighbor's sliver.
  const kept=parts.filter(p=>p===main||(p.pixels.length>=12&&p.l<=main.r+40&&p.r>=main.l-40&&p.t<=main.b+40&&p.b>=main.t-40));
  const l=Math.min(...kept.map(p=>p.l)),r=Math.max(...kept.map(p=>p.r)),t=Math.min(...kept.map(p=>p.t)),b=Math.max(...kept.map(p=>p.b));
  const width=r-l+1,height=b-t+1,raw=Buffer.alloc(width*height*4);
  for(const part of kept)for(const p of part.pixels){const x=p%info.width,y=Math.floor(p/info.width),dest=((y-t)*width+x-l)*4;data.copy(raw,dest,p*4,p*4+4);}
  audit.push({file:file.replace(root,''),cell:index,bounds:{l,t,width,height}});
  return {raw,width,height};
 });
 const frames=[];
 for(let row=0;row<rows;row++){
  const factor=targets[row]/Math.max(...cells.slice(row*cols,(row+1)*cols).map(c=>Math.max(c.width,c.height)));
  for(const c of cells.slice(row*cols,(row+1)*cols)){
   const width=Math.max(1,Math.round(c.width*factor)),height=Math.max(1,Math.round(c.height*factor));
   const input=await sharp(c.raw,{raw:{width:c.width,height:c.height,channels:4}}).resize(width,height,{kernel:'nearest'}).png().toBuffer();
   frames.push(await sharp({create:{width:128,height:128,channels:4,background:clear}}).composite([{input,left:Math.round((128-width)/2),top:116-height}]).png().toBuffer());
  }
 }
 return frames;
}
async function sheet(frames,path){await sharp({create:{width:128*frames.length,height:128,channels:4,background:clear}}).composite(frames.map((input,i)=>({input,left:i*128,top:0}))).png().toFile(path);}
const stages=['baby','juvenile','adult'];
for(const folder of ['companions-v1','companions-v2'])for(const file of await readdir(root+'art/'+folder)){
 if(!file.endsWith('.png')||file==='eggs.png')continue;
 const id=file.slice(0,-4),rows=id==='koala_sprite'?2:3;
 const frames=await extractGrid(root+'art/'+folder+'/'+file,4,rows,rows===2?[99,112]:[83,99,112]);
 for(let row=0;row<rows;row++){const stage=stages[row+(rows===2?1:0)],poses=frames.slice(row*4,row*4+4);await sheet(poses,out+`${id}-${stage}.png`);await sharp(poses[0]).toFile(out+`${id}-${stage}-portrait.png`);await sheet([poses[0],poses[3],poses[3],poses[0]],out+`${id}-${stage}-action.png`);}
}
const seqSource=await readFile(root+'src/config/petAnimationCoverage.ts','utf8');
const sequences=[...seqSource.matchAll(/(\w+): \[([\d,]+)\]/g)].map(m=>[m[1],m[2].split(',').map(Number)]);
for(const id of ['slime_baby','mech_bot','subtrak']){
 const all=await extractGrid(root+`art/legacy-v2/${id}.png`,6,3,[83,99,112]);
 for(let row=0;row<3;row++){
  const stage=stages[row],poses=all.slice(row*6,row*6+6);
  // Source: neutral, step, joy, sleep, attack, hurt. Care has real step/sleep poses.
  const map=[0,3,2,4];
  await sheet(map.map(i=>poses[i]),out+`${id}-${stage}.png`);
  await sharp(poses[0]).toFile(out+`${id}-${stage}-portrait.png`);
  const seqs=sequences.map(([name,seq])=>[name,
   name==='walking'?[0,1,1,0,0,1,1,0]:
   ['sleeping','dead'].includes(name)?Array(8).fill(3):
   name==='sick'?Array(8).fill(5):
   ['idle','hungry','dirty','eating'].includes(name)?Array(8).fill(0):
   name==='being_trained'?[0,0,4,4,0,0,4,0]:
   seq.map(i=>i===2?2:0)]);

  await sharp({create:{width:1024,height:1920,channels:4,background:clear}}).composite(seqs.flatMap(([,seq],r)=>seq.map((f,c)=>({input:poses[f],left:c*128,top:r*128})))).png().toFile(root+`public/assets/companions-v2/${id}-${stage}.png`);
  for(const [name,seq] of Object.entries({attack:[0,4,4,0],special:[0,2,4,0],defend:[0,0,0,0],hurt:[0,5,5,0],heal:[0,2,2,0],math:[0,0,2,0]}))await sheet(seq.map(i=>poses[i]),root+`public/assets/companions-v2/${id}-${stage}-${name}.png`);
 }
}
await mkdir(root+'public/assets/enemies-v1',{recursive:true});
for(const file of await readdir(root+'art/enemies-v1')){
 if(!file.endsWith('.png'))continue;
 const id=file.slice(0,-4),poses=await extractGrid(root+'art/enemies-v1/'+file,3,2,[110,110]);
 await sharp(poses[0]).toFile(root+`public/assets/enemies-v1/${id}-portrait.png`);
 for(const [name,index] of Object.entries({idle:0,attack:1,special:2,defend:3,hurt:4,heal:5,math:5}))await sheet([poses[0],poses[index],poses[index],poses[0]],root+`public/assets/enemies-v1/${id}-${name}.png`);
}
await writeFile(root+'docs/verification/sprite-crop-audit.json',JSON.stringify(audit,null,2));
console.log('Reviewed crop export:',audit.length,'source poses');
