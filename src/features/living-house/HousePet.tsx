import type {CosmeticSlot} from '../../types/cosmetic';
import type {Pet} from '../../types/pet';
import {PetSprite} from '../../components/pet/PetSprite';
// The house must show the same pet the student raised; directional art only belongs here once it is generated from that pet's own sprite.
export function HousePet({pet,animation,paused,equipped}:{pet:Pet;animation:string;direction?:string;paused:boolean;equipped?:Partial<Record<CosmeticSlot,string|null>>}){
 return <PetSprite speciesId={pet.speciesId} stage={pet.stage} animationName={animation} paused={paused} scale={.5} equippedCosmetics={equipped}/>;
}
