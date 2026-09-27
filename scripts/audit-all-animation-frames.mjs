import { chromium } from '@playwright/test';
import sharp from 'sharp';
import {writeFile,mkdir} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage();await page.goto('http://localhost:5000');
const inventory=await page.evaluate(async()=>{
 const {ASSETS}=await import('/src/config/assetManifest.ts');const {GROWING_PETS,GROWTH_STAGES,petVisualKey}=await import('/src/config/companionConfig.ts');const {PET_ANIMATIONS,COMBAT_ANIMATIONS}=await import('/src/config/petAnimationCoverage.ts');
 return Object.keys(GROWING_PETS).map(id=>({id,forms:GROWTH_STAGES.map(stage=>{const key=petVisualKey({speciesId:id,stage});return {stage,care:PET_ANIMATIONS.map(action=>({action,sheet:ASSETS.pets[`${key}__${action}`]??ASSETS.pets[key]})),combat:COMBAT_ANIMATIONS.map(action=>({action,sheet:ASSETS.combatAnims[key][action]}))};})}));
});await browser.close();await mkdir('docs/verification/animation-frames',{recursive:true});
for(const pet of inventory){
 const tiles=[];
 for(const [stageIndex,form] of pet.forms.entries())for(const [row,entry] of [...form.care,...form.combat].entries()){
  const {sheet,action}=entry,isCare='animations' in sheet,range=isCare?sheet.animations[action]:{startFrame:0,endFrame:sheet.frameCount-1},cols=isCare?sheet.cols:sheet.frameCount;
  const label=Buffer.from(`<svg width="384" height="18"><text x="2" y="13" font-size="12">${form.stage} ${action} (${range.startFrame}-${range.endFrame})</text></svg>`);tiles.push({input:label,left:stageIndex*384,top:row*66});
  // Every distinct frame, including long original Pip sheets, is exported separately too.
  for(let f=range.startFrame;f<=range.endFrame;f++){
   const buffer=await sharp('public'+sheet.url).extract({left:f%cols*sheet.frameWidth,top:Math.floor(f/cols)*sheet.frameHeight,width:sheet.frameWidth,height:sheet.frameHeight}).resize(48,48,{kernel:'nearest'}).png().toBuffer();
   // Production pose atlases contain eight frames; long legacy sheets use a separate strip.
   if(f-range.startFrame<8)tiles.push({input:buffer,left:stageIndex*384+(f-range.startFrame)*48,top:row*66+18});
  }
  if(range.endFrame-range.startFrame>=8){
   await sharp('public'+sheet.url).flatten({background:'#eee'}).png().toFile(`docs/verification/animation-frames/${pet.id}-${form.stage}-${action}-full.png`);
  }
 }
 await sharp({create:{width:1152,height:21*66,channels:4,background:'#eee'}}).composite(tiles).png().toFile(`docs/verification/animation-frames/${pet.id}.png`);
}
await writeFile('docs/verification/animation-inventory.json',JSON.stringify(inventory,null,2));console.log('Exported every care/battle sequence for 36 forms.');
