import {createRoot} from 'react-dom/client';
import {ActivePetContext} from '../src/components/ActivePetContext';
import {RivalPortrait} from '../src/features/rivals/RivalBoard';
import type {Pet} from '../src/types/pet';
createRoot(document.getElementById('root')!).render(<main>{(['baby','juvenile','adult',null] as const).map(stage=><section key={stage??'egg'} data-case={stage??'egg'}><h2>{stage??'Egg only'}</h2><ActivePetContext.Provider value={stage?{speciesId:'bramble_hedgehog',stage} as Pet:null}><RivalPortrait species="bramble_hedgehog"/><RivalPortrait species="luna_owl"/></ActivePetContext.Provider></section>)}</main>);
