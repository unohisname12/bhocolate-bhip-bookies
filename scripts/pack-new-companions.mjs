import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url).pathname;
const source=root+'art/companions-v2/',out=root+'public/assets/companions-v1/';
await mkdir(source,{recursive:true});await mkdir(out,{recursive:true});
const assets={clover_rabbit:['f5c53e70-2d5f-4849-a6b9-8738e86496d2',[0,300,600,1024]],ripple_otter:['24ba37e6-998c-41b2-9598-09f05ecb6354',[0,330,645,1024]],nova_axolotl:['49ddbd25-8019-4bf2-b05d-d378b267bec6',[0,330,625,1024]],bramble_hedgehog:['a87f3afd-82f9-4f1b-b069-06c2a9e372b5',[0,320,620,1024]],zephyr_dragon:['9781878f-4e25-4dfd-88b2-dc11c0102026',[0,278,547,1024]]};
const clear={r:0,g:0,b:0,alpha:0};
async function crop(input){const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});let l=info.width,t=info.height,r=0,b=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>128){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}return {left:l,top:t,width:r-l+1,height:b-t+1};}
async function sheet(frames,path){await sharp({create:{width:128*frames.length,height:128,channels:4,background:clear}}).composite(frames.map((input,i)=>({input,left:i*128,top:0}))).png().toFile(path);}
for(const [id,[,cuts]] of Object.entries(assets)){
 for(let row=0;row<3;row++){
  const cells=[];for(let col=0;col<4;col++){const input=await sharp(source+id+'.png').extract({left:col*384,top:cuts[row],width:384,height:cuts[row+1]-cuts[row]}).png().toBuffer();cells.push({input,box:await crop(input)});}
  const factor=[83,99,112][row]/Math.max(...cells.map(c=>Math.max(c.box.width,c.box.height)));
  const frames=[];for(const {input,box} of cells){const width=Math.round(box.width*factor),height=Math.round(box.height*factor);const sprite=await sharp(input).extract(box).resize(width,height,{kernel:'nearest'}).png().toBuffer();frames.push(await sharp({create:{width:128,height:128,channels:4,background:clear}}).composite([{input:sprite,left:Math.round((128-width)/2),top:116-height}]).png().toBuffer());}
  const stage=['baby','juvenile','adult'][row];await sheet(frames,out+id+'-'+stage+'.png');await sharp(frames[0]).toFile(out+id+'-'+stage+'-portrait.png');await sheet([frames[0],frames[3],frames[3],frames[0]],out+id+'-'+stage+'-action.png');
 }
}
for(const [row,id] of Object.keys(assets).entries()) {const frames=[];for(let col=0;col<4;col++){const top=Math.round(row*1536/5),bottom=Math.round((row+1)*1536/5);frames.push(await sharp(source+'eggs.png').extract({left:col*256,top,width:256,height:bottom-top}).resize(128,128,{fit:'contain',background:clear,kernel:'nearest'}).png().toBuffer());}await sheet(frames,out+id+'-hatch.png');await sharp(frames[0]).toFile(out+id+'-egg.png');}
console.log('Packed 15 growth atlases, 15 portraits, 15 action sheets, 5 hatch sequences and 5 eggs.');
