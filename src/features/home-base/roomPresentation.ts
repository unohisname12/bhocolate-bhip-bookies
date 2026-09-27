import type { CSSProperties } from 'react';
import { furniture, roomSize } from './catalog';
import type { HomeRoom, HomePlacement } from './model';
export function placementStyle(room:HomeRoom,p:HomePlacement):CSSProperties {
 const item=furniture(p.furnitureId)!,{cols,rows}=roomSize(room.tier);
 return {left:`${p.x/cols*100}%`,top:`${p.y/rows*100}%`,width:`${item.width/cols*100}%`,height:`${item.height/rows*100}%`,zIndex:item.layer==='floor'?2:item.layer==='wall'?4:10+(p.y+item.height)*10};
}
export function placementClass(p:HomePlacement) {
 const f=furniture(p.furnitureId)!;
 return `hb-placed ${f.layer==='wall'?'is-wall':''} ${f.layer==='floor'?'is-rug':''} ${f.interaction==='light'&&p.on?'is-lit':''}`;
}

export const residentDepth = (y:number) => 10+(y+.9)*10;
