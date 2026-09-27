import {createRoot} from 'react-dom/client';
import {FeedingScene} from '../src/components/care/FeedingScene';
import {GROWING_PETS,GROWTH_STAGES} from '../src/config/companionConfig';
import {hatchEgg} from '../src/services/game/evolutionEngine';
import {FOOD_ITEMS} from '../src/config/gameConfig';
const done=()=>{};
export function mount(){const host=document.createElement('div');document.body.replaceChildren(host);createRoot(host).render(<main style={{padding:24,background:'#172c35'}}><h1 style={{color:'#f4d598',fontSize:28}}>Every companion • every growth stage</h1><div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:16}}>{GROWTH_STAGES.flatMap(stage=>Object.entries(GROWING_PETS).map(([speciesId,def])=>{const pet={...hatchEgg({id:speciesId,type:def.egg,state:'ready',progress:100,createdAt:new Date().toISOString()}),speciesId,stage,name:`${def.name} · ${stage}`};return <FeedingScene key={`${speciesId}-${stage}`} pet={pet} food={FOOD_ITEMS[0]} onDone={done}/>;}))}</div></main>);}
