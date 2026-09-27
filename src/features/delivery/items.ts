export type ItemFamily = 'bike'|'teleport'|'shield'|'cargo'|'insurance'|'warehouse'|'battery'|'scanner'|'contract'|'broker';
export interface LootItem { id:string; name:string; family:ItemFamily; rank:number; description:string; color:string }
const families: {id:ItemFamily;name:string;color:string;describe:(r:number)=>string}[] = [
 {id:'bike',name:'EV Bike',color:'#a4df8b',describe:r=>`Travel costs ${Math.round((1-r/12)*100)}% of van travel, rounded up. One delivery.`},
 {id:'teleport',name:'Warp Drive',color:'#cfacff',describe:r=>`Jump over all travel, tolls and roadwork. Activation costs ${11-r} coins. Compare with driving first.`},
 {id:'shield',name:'Phase Shield',color:'#8ad9ef',describe:r=>`Remove up to ${r} coins of roadwork and toll costs.`},
 {id:'cargo',name:'Cargo Drone',color:'#f7c77c',describe:r=>`A successful delivery earns ${r} extra coins from the cargo sponsor.`},
 {id:'insurance',name:'Contract Insurance',color:'#f0b7c8',describe:r=>`If another crew wins the customer, recover ${r} coins. Consumed on a submitted job.`},
 {id:'warehouse',name:'Depot Gate',color:'#abc4f1',describe:r=>`Start this delivery at Central Depot and save up to ${r} coins of travel.`},
 {id:'battery',name:'Plasma Battery',color:'#cce78d',describe:r=>`Reduce travel cost by up to ${r} coins. Tolls and roadwork still apply.`},
 {id:'scanner',name:'Demand Scanner',color:'#f7d8a0',describe:r=>`Earn ${r} bonus coins if you successfully deliver to a neighborhood with rising demand (above zero).`},
 {id:'contract',name:'Chain Amplifier',color:'#d1b9f3',describe:r=>`Earn ${r} extra coins when this delivery completes your three-stop contract.`},
 {id:'broker',name:'Broker Beacon',color:'#85d9bb',describe:r=>`Earn ${r} bonus coins when you successfully deliver a subcontract for another crew.`},
];
const marks=['Pocket','Copper','Neon','Solar','Quantum','Lunar','Stellar','Prismatic','Nova','Singularity'];
/** Exactly 100 equipable, consumable items: ten tool families, ten strengths each. */
export const LOOT: LootItem[] = families.flatMap(f=>marks.map((mark,i)=>({id:`${f.id}-${i+1}`,name:`${mark} ${f.name}`,family:f.id,rank:i+1,description:f.describe(i+1),color:f.color})));
export const lootItem = (id?:string) => LOOT.find(i=>i.id===id);
