import type {HomeBase} from '../home-base/model';
import {RoomThumb} from './RoomThumb';
import type {World,WorldRoom} from './world';
/** A miniature of the actual room, including the learner's furniture placements. */
export function RoomPreview({room,home}:{world:World;room:WorldRoom;home:HomeBase}){
 return <RoomThumb id={room.id} room={home.rooms[room.id]} width={120} height={70}/>;
}
