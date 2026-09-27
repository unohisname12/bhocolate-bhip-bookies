import { COSMETICS } from '../../config/cosmeticConfig';
import { FURNITURE } from '../home-base/catalog';
export type GiftEffect = 'furniture'|'cosmetic'|'tokens'|'shards'|'medals'|'stars'|'charges'|'attack'|'defense'|'hatch'|'party';
export interface TeacherPrize { id:string; name:string; category:string; description:string; effect:GiftEffect; amount:number; target?:string; art?:string }
const homeNames:Record<string,string>={comfort:'Cozy furniture',tables:'Desks & shelves',nature:'Gardens & nature',lights:'Lights & glow',wall:'Wall art',treasures:'Toys & trophies'};
const wearNames:Record<string,string>={hat:'Hats & crowns',eyewear:'Glasses & disguises',collar:'Scarves & accessories',aura:'Pet auras'};
export const TEACHER_PRIZES:TeacherPrize[] = [
 ...FURNITURE.filter(f=>f.cost>0||f.prize).map(f=>({id:`gift_${f.id}`,name:f.name,category:homeNames[f.category],description:`Permanent Home Base item. ${f.description} If already owned: 15 tokens instead.`,effect:'furniture' as const,amount:1,target:f.id,art:f.art})),
 ...COSMETICS.map(c=>({id:`gift_${c.id}`,name:c.name,category:wearNames[c.slot],description:`Permanent ${c.slot} item. Equip in Wardrobe. If already owned: 15 tokens instead.`,effect:'cosmetic' as const,amount:1,target:c.id})),
 ...([['tokens','Pocket money',[25,50,100]],['shards','Wardrobe shards',[5,10,20]],['medals','Prize medals',[3,5,10]],['stars','Arcade stars',[5,10,20]],['charges','Arcade passes',[1,3,5]],['attack','Battle boosts',[1,2,3]],['defense','Battle boosts',[1,2,3]]] as const).flatMap(([effect,category,amounts])=>amounts.map(amount=>({id:`gift_${effect}_${amount}`,name:`${amount} ${effect==='charges'?'arcade passes':effect==='attack'?'attack boosts':effect==='defense'?'defense boosts':effect}`,category,description:effect==='attack'||effect==='defense'?`${amount} optional +20% ${effect} boosts. Arm in Prize Studio; one per battle.`:effect==='charges'?`${amount} extra solo arcade plays. Use from the game library.`:`Adds ${amount} ${effect} to your saved balance.`,effect,amount}))),
 {id:'gift_early_hatch',name:'One-Day-Early Egg Pass',category:'Egg adventures',description:'Use in egg discovery or Prize Studio during an egg journey to replace one of its five activity days. The questionnaire is optional. Maximum one day saved per egg; keep the pass until eligible.',effect:'hatch',amount:1},
 {id:'gift_party_dash_heart',name:'Secret Bumper',category:'Surprise racing perks',description:'Your next classmate race starts with 2 extra hearts. One-use, automatic; no prize announcement to classmates.',effect:'party',target:'dash',amount:2},
 {id:'gift_party_dash_stars',name:'Hidden Star Cache',category:'Surprise racing perks',description:'Your next classmate race starts with 20 bonus score. One-use, automatic; no prize announcement to classmates.',effect:'party',target:'dash',amount:20},
 {id:'gift_party_guard_energy',name:'Mystery Toolbox',category:'Surprise team perks',description:'Your next team-defense game gets 8 extra shared build energy. One-use, automatic; donor is not announced.',effect:'party',target:'guard',amount:8},
 {id:'gift_party_guard_heart',name:'Nest Safety Net',category:'Surprise team perks',description:'Your next team-defense nest gets 3 extra hearts. One-use, automatic; donor is not announced.',effect:'party',target:'guard',amount:3},
 {id:'gift_party_cafe_stock',name:'Secret Pantry Delivery',category:'Surprise café perks',description:'Your next classmate café gets 3 extra of every ingredient. One-use, automatic; donor is not announced.',effect:'party',target:'cafe',amount:3},
 {id:'gift_party_cafe_score',name:'Mystery Tip Jar',category:'Surprise café perks',description:'Your next classmate café starts with 25 bonus team score. One-use, automatic; donor is not announced.',effect:'party',target:'cafe',amount:25},
];
// Medals, arcade stars and arcade passes were folded into tokens. Their entries stay resolvable so
// gifts already waiting in an inbox still pay out, but they are no longer offered.
const RETIRED:GiftEffect[]=['medals','stars','charges'];
export const OFFERED_PRIZES=TEACHER_PRIZES.filter(p=>!RETIRED.includes(p.effect));
export const PRIZE_CATEGORIES=[...new Set(OFFERED_PRIZES.map(p=>p.category))];
export const teacherPrize=(id:string)=>TEACHER_PRIZES.find(p=>p.id===id);
