import {describe,it,expect} from 'vitest';
import {createRoom,joinRoom,apply,type Room,type Member,type Move} from './model';
import {guardianPlan} from './guardianSprite';
import {normalizeLearning} from '../../services/game/curriculum';
const learning=normalizeLearning({grade:0,topic:'Addition within 10'});
const member=(id:string,side:'teachers'|'students'):Member=>({id,alias:id,side,pet:'ember_fox',learning,...(side==='teachers'?{guardian:{name:'Chalkstone',color:'midnight' as const}}:{})});
function round(teacherMove:Move|null,studentMove:Move|null):Room{
  let r=createRoom(member('host','teachers'),3,learning);r=joinRoom(r,member('s0','students'));
  r=apply(r,{action:'next'},'host',()=>.3);
  for(const [id,move] of [['host',teacherMove],['s0',studentMove]] as const)if(move)r=apply(r,{action:'answer',questionId:r.questions[id].id,answer:String(r.questions[id].answer),move},id);
  return apply(r,{action:'next'},'host');
}
const plan=(r:Room)=>guardianPlan(r.phase,r.health,r.results.at(-1));
describe('guardian animation plan',()=>{
  it('reads the spellbook while questions are open',()=>{let r=joinRoom(createRoom(member('host','teachers'),3,learning),member('s0','students'));r=apply(r,{action:'next'},'host');expect(plan(r)).toEqual({once:[],rest:'math',holdLast:false});});
  it('a full-power teacher strike plays the special, and the student hit plays hurt',()=>{expect(plan(round('strike','strike')).once).toEqual(['special','hurt']);});
  it('guard blocks the student strike without a hurt reaction',()=>{expect(plan(round('guard','strike')).once).toEqual(['defend']);});
  it('rally heals',()=>{expect(plan(round('rally',null)).once).toEqual(['heal']);});
  it('an unsolved round just idles',()=>{expect(plan(round(null,null))).toEqual({once:[],rest:'idle',holdLast:false});});
  it('holds victory or defeat at the finale',()=>{
    expect(guardianPlan('finished',{teachers:80,students:40})).toEqual({once:[],rest:'victory',holdLast:true});
    expect(guardianPlan('finished',{teachers:20,students:40}).rest).toBe('defeat');
  });
});
describe('reactions',()=>{
  it('preset emotes only, with a short cooldown, even while paused',()=>{
    let r=joinRoom(createRoom(member('host','teachers'),3,learning),member('s0','students'));
    r=apply(r,{action:'next'},'host');r=apply(r,{action:'pause'},'host');
    r=apply(r,{action:'emote',emote:'wave'},'s0',Math.random,1000);expect(r.emotes).toEqual({s0:{emote:'wave',at:1000}});
    expect(()=>apply(r,{action:'emote',emote:'cheer'},'s0',Math.random,2500)).toThrow(/Wait a moment/);
    expect(()=>apply(r,{action:'emote',emote:'you are bad'},'s0',Math.random,9000)).toThrow(/Choose a reaction/);
    expect(apply(r,{action:'emote',emote:'gg'},'s0',Math.random,3000).emotes!.s0.emote).toBe('gg');
  });
});
