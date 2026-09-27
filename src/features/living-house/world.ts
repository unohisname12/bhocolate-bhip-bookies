import {furniture,roomSize,type HomeRoomId} from '../home-base/catalog';
import meta from './houseArtMeta';
import type {HomeBase,HomePlacement} from '../home-base/model';
export type Point={x:number;y:number;floor:number};
export type HouseResident={petId:string;roomId:HomeRoomId;x:number;y:number;activity:string;objectId?:string;visits?:{objectId:string;count:number}[];destination?:{roomId:HomeRoomId;x:number;y:number;objectId?:string}};
export type WorldRoom={id:HomeRoomId;x:number;y:number;w:number;h:number;floor:number;owned:boolean};
export type WorldObject={key:string;roomId:HomeRoomId;placement:HomePlacement;x:number;y:number;w:number;h:number;floor:number};
export type World={rooms:WorldRoom[];objects:WorldObject[];open:Map<string,Point>;stairs:[Point,Point];width:number;height:number;doors:(Point&{to:HomeRoomId})[]};
export const TILE=32;
// Rooms need headroom for their painted back wall (see houseArt.ts); rows of rooms are spaced to fit it.
export const WALL_TILES=Math.ceil((meta.wallHeight+meta.frame.top)/TILE);
export const key=(p:Point)=>`${p.floor}:${Math.round(p.x)},${Math.round(p.y)}`;
export const distance=(a:Point,b:Point)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)+Math.abs(a.floor-b.floor)*30;
export function buildWorld(home:Pick<HomeBase,'rooms'>):World{
 const sizes=(id:HomeRoomId)=>{const s=roomSize(home.rooms[id]?.tier??0);return {w:s.cols+2,h:s.rows+2};};
 const col=Math.max(...Object.keys(home.rooms).map(id=>sizes(id as HomeRoomId).w))+2;
 const row=Math.max(...Object.keys(home.rooms).map(id=>sizes(id as HomeRoomId).h))+WALL_TILES+2;
 const layout:[HomeRoomId,number,number,number][]=[['den',0,0,0],['hall',1,0,0],['kitchen',2,0,0],['garden',1,1,0],['bedroom',0,0,1],['landing',1,0,1],['bathroom',2,0,1],['studio',1,1,1]];
 const rooms=layout.map(([id,x,y,floor])=>({id,x:2+x*col,y:WALL_TILES+1+y*row,...sizes(id),floor,owned:!!home.rooms[id]}));
 const open=new Map<string,Point>(),doors:(Point&{to:HomeRoomId})[]=[];const add=(x:number,y:number,floor:number)=>{const p={x,y,floor};open.set(key(p),p);};
 for(const r of rooms.filter(r=>r.owned))for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)add(x,y,r.floor);
 const connect=(aId:HomeRoomId,bId:HomeRoomId,vertical=false)=>{const a=rooms.find(r=>r.id===aId)!,b=rooms.find(r=>r.id===bId)!;if(!a.owned||!b.owned)return;
  // The hallway down runs near the right wall so it never cuts through the centred windows and pictures.
  if(vertical){const x=a.x+Math.min(a.w,b.w)-3;for(let y=a.y+a.h-1;y<=b.y;y++){add(x,y,a.floor);add(x+1,y,a.floor);}doors.push({x,y:a.y+a.h,floor:a.floor,to:b.id},{x,y:b.y-1,floor:b.floor,to:a.id});}
  else{const y=a.y+Math.floor(Math.min(a.h,b.h)/2);for(let x=a.x+a.w-1;x<=b.x;x++){add(x,y,a.floor);add(x,y+1,a.floor);}doors.push({x:a.x+a.w,y,floor:a.floor,to:b.id},{x:b.x-1,y,floor:b.floor,to:a.id});}
 };
 connect('den','hall');connect('hall','kitchen');connect('hall','garden',true);connect('bedroom','landing');connect('landing','bathroom');connect('landing','studio',true);
 const objects:WorldObject[]=[];
 for(const r of rooms.filter(r=>r.owned))for(const p of home.rooms[r.id]!.items){const f=furniture(p.furnitureId);if(!f||f.retired)continue;const o={key:`${r.id}:${p.id}`,roomId:r.id,placement:p,x:r.x+1+p.x,y:r.y+1+p.y,w:f.width,h:f.height,floor:r.floor};objects.push(o);if(f.layer==='furniture')for(let y=o.y;y<o.y+o.h;y++)for(let x=o.x;x<o.x+o.w;x++)open.delete(key({x,y,floor:r.floor}));}
 const stair=(id:HomeRoomId)=>{const r=rooms.find(r=>r.id===id)!;return {x:r.x+r.w-1,y:r.y+1,floor:r.floor};};
 return {rooms,objects,open,doors,stairs:[stair('hall'),stair('landing')],width:col*3+4,height:row*2+WALL_TILES+2};
}
export function roomAt(w:World,p:Point):WorldRoom{
 return w.rooms.filter(r=>r.floor===p.floor&&r.owned).sort((a,b)=>distance(p,{x:a.x+a.w/2,y:a.y+a.h/2,floor:a.floor})-distance(p,{x:b.x+b.w/2,y:b.y+b.h/2,floor:b.floor}))[0];
}
export function nearest(w:World,p:Point):Point{return Array.from(w.open.values()).filter(n=>n.floor===p.floor).sort((a,b)=>distance(a,p)-distance(b,p))[0]??w.stairs[0];}
export function route(w:World,start:Point,target:Point):Point[]{
 const from=nearest(w,start),to=nearest(w,target),queue=[from],seen=new Map<string,Point|null>([[key(from),null]]);
 for(let i=0;i<queue.length;i++){const p=queue[i];if(key(p)===key(to)){const path:Point[]=[];let n:Point|null=p;while(n&&key(n)!==key(from)){path.unshift(n);n=seen.get(key(n))??null;}return path;}
  const next=[{...p,x:p.x+1},{...p,x:p.x-1},{...p,y:p.y+1},{...p,y:p.y-1}];const stair=w.stairs.findIndex(s=>key(s)===key(p));if(stair!==-1)next.push(w.stairs[1-stair]);
  for(const n of next)if(w.open.has(key(n))&&!seen.has(key(n))){seen.set(key(n),p);queue.push(n);}
 }return [];
}
export function approach(w:World,o:WorldObject,from:Point):Point|null{
 const candidates=Array.from(w.open.values()).filter(p=>p.floor===o.floor&&p.x>=o.x-1&&p.x<=o.x+o.w&&p.y>=o.y-1&&p.y<=o.y+o.h);
 return candidates.map(p=>({p,path:route(w,from,p)})).filter(v=>v.path.length||distance(from,v.p)<1).sort((a,b)=>a.path.length-b.path.length)[0]?.p??null;
}
export function locate(w:World,saved:HouseResident|undefined,petId:string,roomId:HomeRoomId):Point{
 const r=w.rooms.find(r=>r.id===(saved?.petId===petId?saved.roomId:roomId)&&r.owned)??w.rooms[0];return nearest(w,{x:r.x+(saved?.petId===petId?saved.x:r.w/2),y:r.y+(saved?.petId===petId?saved.y:r.h-1),floor:r.floor});
}
export function checkpoint(w:World,p:Point,petId:string,activity:string,objectId?:string):HouseResident{const r=roomAt(w,p);return {petId,roomId:r.id,x:Math.round((p.x-r.x)*100)/100,y:Math.round((p.y-r.y)*100)/100,activity:activity.slice(0,80),...(objectId?{objectId}: {})};}
export function validResident(v:unknown):v is HouseResident{if(!v||typeof v!=='object')return false;const p=v as HouseResident;return typeof p.petId==='string'&&p.petId.length<=100&&['den','hall','kitchen','garden','bedroom','landing','bathroom','studio'].includes(p.roomId)&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<=50&&Math.abs(p.y)<=50&&typeof p.activity==='string'&&p.activity.length<=80&&(p.objectId===undefined||typeof p.objectId==='string'&&p.objectId.length<=150)&&(p.visits===undefined||Array.isArray(p.visits)&&p.visits.length<=64&&p.visits.every(v=>typeof v.objectId==='string'&&v.objectId.length<=150&&Number.isInteger(v.count)&&v.count>0&&v.count<=99))&&(p.destination===undefined||validResident({petId:p.petId,activity:'',...p.destination}));}
