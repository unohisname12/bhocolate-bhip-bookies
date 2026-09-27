/** Package the existing production pet art, without redrawing their identities. */
import sharp from 'sharp';
import { build } from 'esbuild';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const temp='/tmp/auralith-hunt-manifest.mjs';
await build({entryPoints:['src/config/assetManifest.ts'],bundle:true,platform:'node',format:'esm',outfile:temp});
const {ASSETS}=await import(pathToFileURL(temp));
const ids=['koala_sprite','ember_fox','moss_turtle','luna_owl','clover_rabbit','ripple_otter','nova_axolotl','bramble_hedgehog','zephyr_dragon','slime_baby','mech_bot','subtrak'];
const states=['idle','walking','attack','hurt','happy'];
const layers=[];
for(let row=0;row<ids.length;row++)for(let s=0;s<states.length;s++){
 const id=ids[row],state=states[s],combat=ASSETS.combatAnims[id]?.[state];
 const config=ASSETS.pets[`${id}__${state}`]??ASSETS.pets[id];
 const useCombat=['attack','hurt'].includes(state)&&combat;
 const range=config.animations[state]??config.animations.idle;
 const url=useCombat?combat.url:config.url,cols=useCombat?combat.frameCount:config.cols;
 const start=useCombat?0:range.startFrame,count=useCombat?combat.frameCount:range.endFrame-start+1;
 const fw=useCombat?combat.frameWidth:config.frameWidth,fh=useCombat?combat.frameHeight:config.frameHeight;
 for(let f=0;f<8;f++){
  const frame=start+f%count;
  layers.push({input:await sharp('public'+url).extract({left:frame%cols*fw,top:Math.floor(frame/cols)*fh,width:fw,height:fh}).resize(64,64,{kernel:'nearest'}).png().toBuffer(),left:(s*8+f)*64,top:row*64});
 }
}
// Normalize transparent margins per species, preserving relative positions across frames.
for(let row=0;row<ids.length;row++){
 const frames=layers.filter(l=>l.top===row*64);let left=64,top=64,right=0,bottom=0;
 for(const layer of frames){const data=await sharp(layer.input).ensureAlpha().raw().toBuffer();for(let y=0;y<64;y++)for(let x=0;x<64;x++)if(data[(y*64+x)*4+3]>32){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}}
 for(const layer of frames)layer.input=await sharp(layer.input).extract({left,top,width:right-left+1,height:bottom-top+1}).resize(56,56,{fit:'contain',position:'bottom',background:'#00000000',kernel:'nearest'}).extend({top:4,bottom:4,left:4,right:4,background:'#00000000'}).png().toBuffer();
}
const dir='public/assets/pet-hunt-v2';await mkdir(dir,{recursive:true});
await sharp({create:{width:40*64,height:12*64,channels:4,background:'#00000000'}}).composite(layers).png({palette:true}).toFile(dir+'/pets.png');
const root='public/assets/generated/final/environment/';
const props={bush:'outdoor/props/prop_bush_a.png',bushBerry:'outdoor/props/prop_bush_b.png',tree:'outdoor/props/prop_tree_small.png',flowers:'outdoor/accents/accent_flowers_red.png',grass:'outdoor/accents/accent_grass_tuft_a.png',mushroom:'outdoor/accents/accent_mushroom.png',rocks:'outdoor/accents/accent_rock_a.png',barrel:'indoor/warm/props/prop_barrel.png',books:'indoor/warm/props/prop_bookshelf.png',plant:'indoor/warm/props/prop_plant_pot.png',lantern:'indoor/warm/props/prop_hanging_lantern.png',logs:'indoor/warm/props/prop_log_pile.png'};
const propLayers=[];
for(const [index,[,path]]of Object.entries(props).entries()){
 const buffer=await sharp(root+path).trim().resize(64,64,{fit:'contain',background:'#00000000',kernel:'nearest'}).png().toBuffer();
 propLayers.push({input:buffer,left:index*64,top:0});
}
await sharp({create:{width:12*64,height:64,channels:4,background:'#00000000'}}).composite(propLayers).png({palette:true}).toFile(dir+'/scenery.png');
await writeFile(dir+'/credits.json',JSON.stringify({description:'Repacked existing Auralith production artwork. Pet frames retain the main game identities.',species:ids,states,props:Object.keys(props)},null,2)+'\n');
await rm(temp);console.log('Packed 480 pet frames and 12 scenery sprites.');
