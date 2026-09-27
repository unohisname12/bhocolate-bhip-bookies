/** Shared production pet sprites and bespoke environment art. */
import { PROP_ATLAS, PROP_SHEET, type PropName } from './propAtlas';
export const ART_ROOT='/assets/pet-hunt-v2';
export const WORLD_ART='/assets/pet-hunt-v3';
let loading:Promise<void>|undefined;
type ArtName='pets'|'scenery'|'meadow'|'landmarks'|'ruins'|'props';
export const art:Partial<Record<ArtName,HTMLImageElement>>={};
const variants=new Map<string,HTMLCanvasElement>();
export function loadHuntArt():Promise<void>{
 return loading??=Promise.all((['pets','scenery','meadow','landmarks','ruins','props'] as const).map(async key=>{
  const img=new Image();img.src=key==='props'?PROP_SHEET:`${key==='landmarks'||key==='ruins'?WORLD_ART:ART_ROOT}/${key}.png`;await img.decode();art[key]=img;
 })).then(()=>{}).catch(error=>{loading=undefined;throw error;});
}
export const PROP={bush:0,bushBerry:1,tree:2,flowers:3,grass:4,mushroom:5,rocks:6,barrel:7,books:8,plant:9,lantern:10,logs:11};
export function prop(c:CanvasRenderingContext2D,index:number,x:number,y:number,w=64,h=w){
 if(art.scenery)c.drawImage(art.scenery,index*64,0,64,64,Math.round(x),Math.round(y),w,h);
}
export function landmark(c:CanvasRenderingContext2D,index:number,x:number,y:number,w:number,h:number,variant='normal'){
 if(!art.landmarks)return;
 let source:CanvasImageSource=art.landmarks;
 if(variant!=='normal'){
  let canvas=variants.get(variant);
  if(!canvas){canvas=document.createElement('canvas');canvas.width=384;canvas.height=96;const g=canvas.getContext('2d')!;
   g.filter=variant==='unlit'?'brightness(.58) saturate(.35)':variant==='moon'?'brightness(.82) hue-rotate(30deg) saturate(.75)':'brightness(.9)';
   g.drawImage(art.landmarks,0,0);variants.set(variant,canvas);
  }source=canvas;
 }
 c.drawImage(source,index*96,0,96,96,Math.round(x),Math.round(y),w,h);
}

export function ruin(c:CanvasRenderingContext2D,index:number,x:number,y:number,w:number,h:number){
 if(art.ruins)c.drawImage(art.ruins,index*128,0,128,128,Math.round(x),Math.round(y),w,h);
}

/** Draw one packed prop at its real pixel size times `scale`, with its bottom edge at `bottom` and centred on `cx`. */
export function propSprite(c:CanvasRenderingContext2D,name:PropName,cx:number,bottom:number,scale:number){
 const a=PROP_ATLAS[name];if(!art.props)return;const w=Math.round(a.w*scale),h=Math.round(a.h*scale);
 c.drawImage(art.props,a.x,a.y,a.w,a.h,Math.round(cx-w/2),Math.round(bottom-h),w,h);
}
/** Repeat a wall or hedge segment along a run at its real size instead of stretching one image; the last tile is cropped. */
export function propTiles(c:CanvasRenderingContext2D,name:PropName,x:number,y:number,w:number,h:number,vertical:boolean,scale:number){
 const a=PROP_ATLAS[name];if(!art.props)return;
 if(vertical){const tw=w,th=Math.round(a.h*tw/a.w);for(let yy=y;yy<y+h;yy+=th){const part=Math.min(th,y+h-yy);c.drawImage(art.props,a.x,a.y,a.w,a.h*part/th,Math.round(x),Math.round(yy),tw,part);}}
 else{const th=Math.round(a.h*scale),tw=Math.round(a.w*scale),top=y+h-th;for(let xx=x;xx<x+w;xx+=tw){const part=Math.min(tw,x+w-xx);c.drawImage(art.props,a.x,a.y,a.w*part/tw,a.h,Math.round(xx),Math.round(top),part,th);}}
}

/** The detailed 128 px V-Pet sheets (idle/walk/happy rows plus attack and hurt strips), loaded only for pets in the match. */
export interface CompanionArt { sheet: HTMLImageElement; attack: HTMLImageElement; hurt: HTMLImageElement }
const companions=new Map<string,CompanionArt|null>(),pending=new Set<string>();
const stageFor=(stage:string)=>stage==='baby'||stage==='juvenile'?stage:'adult';
export const companionSheetKey=(species:string,stage:string)=>`${species}-${stageFor(stage)}`;
export function companionArt(species:string,stage:string):CompanionArt|null{
 // Pip keeps its original baby artwork; a juvenile sheet would reveal an unearned evolution.
 if(species==='koala_sprite'&&stage==='baby')return null;
 const key=companionSheetKey(species,stage);
 if(companions.has(key))return companions.get(key)!;
 if(!pending.has(key)){pending.add(key);
  const load=(url:string)=>{const img=new Image();img.src=url;return img.decode().then(()=>img);};
  Promise.all([load(`/assets/companions-v2/${key}.png`),load(`/assets/companions-v2/${key}-attack.png`),load(`/assets/companions-v2/${key}-hurt.png`)])
   .then(([sheet,attack,hurt])=>companions.set(key,{sheet,attack,hurt}),()=>companions.set(key,null));}
 return null;
}
