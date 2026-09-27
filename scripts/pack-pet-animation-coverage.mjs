// Pack pose sequences without claiming duplicated poses are new drawings.
import sharp from 'sharp';import {mkdir,readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url).pathname,out=root+'public/assets/companions-v2/';await mkdir(out,{recursive:true});
const source=await readFile(root+'src/config/petAnimationCoverage.ts','utf8');
const entries=[...source.matchAll(/(\w+): \[([\d,]+)\]/g)].map(m=>[m[1],m[2].split(',').map(Number)]);
const config=await readFile(root+'src/config/companionConfig.ts','utf8');const ids=[...config.matchAll(/^  (\w+): \{ name:/gm)].map(m=>m[1]);
const clear={r:0,g:0,b:0,alpha:0};
for(const id of ids.filter(id=>!['slime_baby','mech_bot','subtrak'].includes(id)))for(const stage of ['baby','juvenile','adult']){
 if(id==='koala_sprite'&&stage==='baby')continue;
 const file=root+`public/assets/companions-v1/${id}-${stage}.png`,frames=[];
 for(let i=0;i<4;i++)frames.push(await sharp(file).extract({left:i*128,top:0,width:128,height:128}).png().toBuffer());
 await sharp({create:{width:1024,height:1920,channels:4,background:clear}}).composite(entries.flatMap(([,seq],row)=>seq.map((f,col)=>({input:frames[f],left:col*128,top:row*128})))).png().toFile(out+`${id}-${stage}.png`);
 const combat={attack:[0,3,3,0],special:[0,2,3,3],defend:[0,1,1,0],hurt:[0,1,0,1],heal:[1,2,2,0],math:[0,1,2,0]};
 for(const [name,seq] of Object.entries(combat))await sharp({create:{width:512,height:128,channels:4,background:clear}}).composite(seq.map((f,i)=>({input:frames[f],left:i*128,top:0}))).png().toFile(out+`${id}-${stage}-${name}.png`);
}
const count=ids.filter(id=>!['slime_baby','mech_bot','subtrak'].includes(id)).length*3-1;
console.log(`Packed ${count} companion care atlases and ${count*6} battle pose sequences; legacy atlases come from pack-reviewed-sprites.mjs.`);
