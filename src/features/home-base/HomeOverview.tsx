import { HouseArt } from './HouseArt';
import type { EngineState } from '../../types/engine';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
import { PetSprite } from '../../components/pet/PetSprite';
import { HOME_ROOMS, FLOORS, WALLS, furniture, roomSize, type HomeRoomId } from './catalog';
import type { HomeBase } from './model';
import { floorOf } from './house';
import './house.css';

export function HomeOverview({home,state,dispatch,visit}: {home:HomeBase;state:EngineState;dispatch:(a:GameEngineAction)=>void;visit?:(id:HomeRoomId)=>void}) {
  const enter=(id:HomeRoomId)=>home.rooms[id]&&visit?visit(id):dispatch({type:'HOME_ROOM',roomId:id});
  const miniature=(id:HomeRoomId)=>{
    const def=HOME_ROOMS.find(r=>r.id===id)!,room=home.rooms[id],size=roomSize(room?.tier??0),here=home.activeRoom===id;
    return <button key={id} className={`cottage-room ${here?'is-here':''} ${room?'':'is-unbuilt'}`} aria-label={room?`Visit ${def.name}`:`Add ${def.name} for ${def.cost} tokens`} aria-pressed={here} disabled={!room&&state.player.currencies.tokens<def.cost} onClick={()=>enter(id)}>
      <span className="cottage-mini" style={{'--room-wall':WALLS.find(w=>w.id===room?.wall)?.color??'#797b70','--room-floor':FLOORS.find(f=>f.id===room?.floor)?.color??'#747563'} as React.CSSProperties} aria-hidden="true">
        <span className="cottage-mini-window"/><span className="cottage-mini-floor">{room?.items.map(p=>{const f=furniture(p.furnitureId)!;return <img key={p.id} src={f.art} alt="" loading="lazy" style={{left:`${p.x/size.cols*100}%`,bottom:`${100-(p.y+f.height)/size.rows*100}%`,width:`${f.width/size.cols*100}%`,height:`${f.height/size.rows*(f.layer==='floor'?1:f.layer==='wall'?3.5:2.6)*100}%`,zIndex:f.layer==='floor'?1:Math.round(10+p.y),objectPosition:'bottom',transform:f.layer==='wall'?'translateY(-30%)':undefined}}/>;})}</span>
        {here&&state.pet&&<span className="cottage-you"><PetSprite speciesId={state.pet.speciesId} stage={state.pet.stage} animationName="idle" paused scale={.42}/></span>}
        {!room&&<span className="cottage-room-plan">✧<small>Room to grow</small></span>}
      </span><strong>{def.name}</strong><small>{here?'Your pet is here':room?'Come on in':`${def.cost} tokens · Add room`}</small>
    </button>;
  };
  const stair=(floor:0|1)=><button className="cottage-stairwell" aria-label={floor?'Go downstairs':'Go upstairs'} onClick={()=>enter(floor?'hall':'landing')}><span className="house-stair-art" aria-hidden="true"><HouseArt piece="stairs"/></span><strong>{floor?'↓ Downstairs':'↑ Upstairs'}</strong><small>Take the stairs</small></button>;
  return <section className="cottage-overview" aria-label="Your two-story house">
    <div className="cottage-heading"><div><span>ROOM FOR EVERY LITTLE MOMENT</span><h2>Your woodland cottage</h2></div><p>Two floors. One place to belong.</p></div>
    <div className="cottage-building"><div className="cottage-roof" aria-hidden="true"><i className="cottage-chimney"/><span>✦</span></div>
      <div className="cottage-storey-label"><b>02</b> Upstairs <span>Quiet corners & cozy dreams</span></div>
      <div className="cottage-storey upstairs">{miniature('bedroom')}{miniature('studio')}{stair(1)}{miniature('landing')}{miniature('bathroom')}</div>
      <div className="cottage-storey-label"><b>01</b> Downstairs <span>Good food & time together</span></div>
      <div className="cottage-storey downstairs">{miniature('den')}{miniature('kitchen')}{stair(0)}{miniature('hall')}{miniature('garden')}</div>
      <div className="cottage-porch"><span aria-hidden="true">✿</span><button onClick={()=>{dispatch({type:'CHANGE_ROOM',roomId:'outside'});dispatch({type:'SET_SCREEN',screen:'home'});}}>Front door · Go to the yard →</button><span aria-hidden="true">✿</span></div>
    </div><p className="cottage-map-note">You’re {floorOf(home.activeRoom)?'upstairs':'downstairs'}. Pick a room, or follow the stairs.</p>
  </section>;
}
