import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { ASSETS } from '../assetManifest';
import { SPECIES_CONFIG } from '../speciesConfig';
import { COMPANIONS, GROWTH_STAGES, isGrowingPet, petVisualKey } from '../companionConfig';
import { PET_ANIMATIONS, COMBAT_ANIMATIONS } from '../petAnimationCoverage';
import { samplePetPose } from '../../engine/animation/petMotion';

describe('complete pet animation coverage',()=>{
 it('has valid assets and every care/battle action for all species and stages',async()=>{
  const files=new Map<string,{frames:number;width:number;height:number}>(),rows=[];
  async function check(url:string,width:number,height:number,frames:number){
   if(files.has(url))return;
   const meta=await sharp(readFileSync('public'+url)).metadata();expect(meta.width,url).toBe(width);expect(meta.height,url).toBe(height);
   files.set(url,{frames,width,height});
  }
  for(const id of Object.keys(SPECIES_CONFIG)){
   const stages=isGrowingPet(id)?GROWTH_STAGES:['baby'] as const;
   for(const stage of stages){const key=petVisualKey({speciesId:id,stage});
    for(const action of PET_ANIMATIONS){const sheet=ASSETS.pets[`${key}__${action}`]??ASSETS.pets[key];expect(sheet,`${key}/${action}`).toBeTruthy();if(!sheet.spriteSheet)throw Error('Expected sheet');const range=sheet.animations[action];expect(range,`${key}/${action}`).toBeTruthy();expect(range.endFrame).toBeLessThan(sheet.frames);await check(sheet.url,sheet.cols*sheet.frameWidth,sheet.rows*sheet.frameHeight,sheet.frames);
     if(action!=='dead'){const poses=new Set([0,200,400,900,1700,4000].map(t=>JSON.stringify(samplePetPose(action,t,id))));expect(poses.size,`${key}/${action} moves`).toBeGreaterThan(1);}
    }
    for(const action of COMBAT_ANIMATIONS){const sheet=ASSETS.combatAnims[key]?.[action];expect(sheet,`${key}/${action}`).toBeTruthy();await check(sheet.url,sheet.frameWidth*sheet.frameCount,sheet.frameHeight,sheet.frameCount);}
    rows.push({species:id,stage,animatedCareStates:14,stillStates:1,combatActions:6});
   }
  }
  expect(rows).toHaveLength(36);
  const report={species:Object.keys(SPECIES_CONFIG).length,discoveryCompanions:Object.keys(COMPANIONS).length,renderedForms:rows.length,animatedCareMappings:rows.length*14,stillMappings:rows.length,combatMappings:rows.length*6,uniqueReferencedSpriteFiles:files.size,packedFrames:[...files.values()].reduce((s,v)=>s+v.frames,0),rows,files:Object.fromEntries(files)};
  if(process.env.VPET_WRITE_AUDIT)writeFileSync('docs/pet-animation-audit-2026-09-22.json',JSON.stringify(report,null,2));
 });
});
