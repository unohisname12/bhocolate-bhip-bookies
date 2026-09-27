import type { EngineState } from '../../types/engine';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
import { PetSprite } from '../../components/pet/PetSprite';
import { HOME_ROOMS, type HomeRoomId } from './catalog';
import { RoomThumb } from '../living-house/RoomThumb';
import type { HomeBase } from './model';
import { floorOf } from './house';
import './house.css';

export function HomeOverview({home,state,dispatch,visit}: {home:HomeBase;state:EngineState;dispatch:(a:GameEngineAction)=>void;visit?:(id:HomeRoomId)=>void}) {
  const enter=(id:HomeRoomId)=>home.rooms[id]&&visit?visit(id):dispatch({type:'HOME_ROOM',roomId:id});
  const miniature=(id:HomeRoomId)=>{
    const def=HOME_ROOMS.find(r=>r.id===id)!,room=home.rooms[id],here=home.activeRoom===id;
    return <button key={id} className={`cottage-room ${here?'is-here':''} ${room?'':'is-unbuilt'}`} aria-label={room?`Visit ${def.name}`:`Add ${def.name} for ${def.cost} tokens`} aria-pressed={here} disabled={!room&&state.player.currencies.tokens<def.cost} onClick={()=>enter(id)}>
      <span className="cottage-mini" aria-hidden="true"><RoomThumb id={id} room={room} width={240} height={130}/>
        {here&&state.pet&&<span className="cottage-you"><PetSprite speciesId={state.pet.speciesId} stage={state.pet.stage} animationName="idle" paused scale={.5}/></span>}
        {!room&&<span className="cottage-room-plan">✧<small>Room to grow</small></span>}
      </span><strong>{def.name}</strong><small>{here?'Your pet is here':room?'Come on in':`${def.cost} tokens · Add room`}</small>
    </button>;
  };
  const stair=(floor:0|1)=><button className="cottage-stairwell" aria-label={floor?'Go downstairs':'Go upstairs'} onClick={()=>enter(floor?'hall':'landing')}><img className="cottage-stair-art" src={`/assets/house-v2/stairs-${floor?'down':'up'}.png`} alt="" aria-hidden="true"/><strong>{floor?'↓ Downstairs':'↑ Upstairs'}</strong><small>Take the stairs</small></button>;
  return <section className="cottage-overview" aria-label="Your two-story house">
    <div className="cottage-heading"><div><span>ROOM FOR EVERY LITTLE MOMENT</span><h2>Your woodland cottage</h2></div><p>Two floors. One place to belong.</p></div>
    <div className="cottage-building"><img className="cottage-roof-art" src="/assets/house-v2/roof.png" alt="" aria-hidden="true"/>
      <div className="cottage-storey-label"><b>02</b> Upstairs <span>Quiet corners & cozy dreams</span></div>
      <div className="cottage-storey upstairs">{miniature('bedroom')}{miniature('studio')}{stair(1)}{miniature('landing')}{miniature('bathroom')}</div>
      <div className="cottage-storey-label"><b>01</b> Downstairs <span>Good food & time together</span></div>
      <div className="cottage-storey downstairs">{miniature('den')}{miniature('kitchen')}{stair(0)}{miniature('hall')}{miniature('garden')}</div>
      <div className="cottage-porch"><span aria-hidden="true">✿</span><button onClick={()=>{dispatch({type:'CHANGE_ROOM',roomId:'outside'});dispatch({type:'SET_SCREEN',screen:'home'});}}>Front door · Go to the yard →</button><span aria-hidden="true">✿</span></div>
    </div><p className="cottage-map-note">You’re {floorOf(home.activeRoom)?'upstairs':'downstairs'}. Pick a room, or follow the stairs.</p>
  </section>;
}
