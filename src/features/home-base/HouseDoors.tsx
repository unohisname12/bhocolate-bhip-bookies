import { HouseArt } from './HouseArt';
import type { HomeBase } from './model';
import { HOUSE_LINKS, floorOf, roomName } from './house';
import type { HomeRoomId } from './catalog';
export function HouseDoors({home,visit,yard}:{home:HomeBase;visit:(id:HomeRoomId)=>void;yard:()=>void}) {
 const floor=floorOf(home.activeRoom),hub=floor?'landing':'hall';
 return <nav className="house-doors" aria-label="Doors and stairs">
   <button className="house-stair-door" onClick={()=>visit(floor?'hall':'landing')}><span className="house-stair-art" aria-hidden="true"><HouseArt piece="stairs"/></span><span><strong>{floor?'↓ Go downstairs':'↑ Go upstairs'}</strong><small>{floor?'To the welcome hall':'To the upstairs nook'}</small></span></button>
   {HOUSE_LINKS[home.activeRoom].filter(id=>home.rooms[id]&&floorOf(id)===floor).map(id=><button className="house-room-door" key={id} onClick={()=>visit(id)}><span className="house-door-art" aria-hidden="true"><img src="/assets/generated/final/house_shared_doorframe.png" alt=""/></span><span><strong>{roomName(id)}</strong><small>Walk through →</small></span></button>)}
   {home.activeRoom===hub&&<button className="house-room-door front-door" onClick={yard}><span className="house-door-art" aria-hidden="true"><img src="/assets/generated/final/house_shared_doorframe.png" alt=""/></span><span><strong>Front door</strong><small>Out to the yard →</small></span></button>}
 </nav>;
}
