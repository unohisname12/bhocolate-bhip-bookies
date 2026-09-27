import { companionSheetKey } from './art';
export function CompanionPortrait({species,stage}:{species:string;stage:string}){
 if(species==='koala_sprite'&&stage==='baby')return <span data-pet-species={species} data-pet-stage={stage} aria-hidden="true" style={{backgroundPositionY:0}}/>;
 return <span className="hunt-detailed-portrait" data-pet-species={species} data-pet-stage={stage} aria-hidden="true" style={{backgroundImage:`url(/assets/companions-v2/${companionSheetKey(species,stage)}.png)`}}/>;
}
