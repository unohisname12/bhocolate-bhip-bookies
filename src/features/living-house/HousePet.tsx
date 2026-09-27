import type {CosmeticSlot} from '../../types/cosmetic';
import {useEffect,useRef} from 'react';
import type {Pet} from '../../types/pet';
import {PetSprite} from '../../components/pet/PetSprite';
import frames from './subtrak-directions.json';
type Direction=keyof typeof frames;
export function HousePet({pet,animation,direction,paused,equipped}:{pet:Pet;animation:string;direction:string;paused:boolean;equipped?:Partial<Record<CosmeticSlot,string|null>>}){
 const image=useRef<SVGImageElement>(null);const d=(direction in frames?direction:'south') as Direction;const walking=animation==='walking',supported=!Object.values(equipped??{}).some(Boolean)&&pet.speciesId==='subtrak'&&pet.stage==='baby'&&['idle','walking'].includes(animation);
 useEffect(()=>{if(!supported||!walking||paused)return;let frame=0;const timer=setInterval(()=>{if(document.hidden)return;frame=(frame+1)%8;image.current?.setAttribute('href',`/assets/pets/subtrak/house-walk/${d}/${frame}.png`);},110);return()=>clearInterval(timer);},[supported,walking,paused,d]);
 if(!supported)return <PetSprite speciesId={pet.speciesId} stage={pet.stage} animationName={animation} paused={paused} scale={.44} equippedCosmetics={equipped}/>;
 const meta=frames[d];return <svg width="56" height="56" viewBox={walking?meta.viewBox:meta.idleViewBox} className="lh-directional-pet" data-facing={d} data-walking={walking} aria-label={`${pet.name}, ${walking?'walking':'looking'} ${d}`}><image ref={image} href={walking?`/assets/pets/subtrak/house-walk/${d}/0.png`:`/assets/pets/subtrak/house-directions/${d}.png`} width={walking?meta.width:meta.idleWidth} height={walking?meta.height:meta.idleHeight}/></svg>;
}
