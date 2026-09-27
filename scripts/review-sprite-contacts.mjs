import sharp from 'sharp';
import {readdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url).pathname;
for(const kind of ['pets','enemies']){
 const dir=kind==='pets'?'companions-v1':'enemies-v1';const files=(await readdir(root+'public/assets/'+dir)).filter(f=>kind==='pets'?/-(baby|juvenile|adult)\.png$/.test(f):/-attack\.png$/.test(f));
 const tiles=await Promise.all(files.map(async(f,i)=>({input:await sharp(root+'public/assets/'+dir+'/'+f).flatten({background:'#eee'}).extend({top:22,bottom:0,left:0,right:0,background:'#eee'}).composite([{input:Buffer.from(`<svg width="512" height="22"><text x="4" y="16" font-size="14">${f}</text></svg>`),left:0,top:0}]).png().toBuffer(),left:(i%2)*512,top:Math.floor(i/2)*150})));
 await sharp({create:{width:1024,height:Math.ceil(files.length/2)*150,channels:4,background:'#ddd'}}).composite(tiles).png().toFile(root+'docs/verification/'+kind+'-review.png');
}
