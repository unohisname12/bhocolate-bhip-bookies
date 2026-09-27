import { PetHuntLauncher } from '../pet-hunt/PetHuntLauncher';
import {PetDuels} from '../pet-duel/PetDuels';
import { PetIdentityStudio } from '../pet-identity/PetIdentityStudio';
import { RivalBoard } from '../rivals/RivalBoard';
import {MathLab} from '../middle-school/MathLab';
import {GameCheckContext} from '../quick-check/context';
import {useStudentChallenge,type StudentData} from '../skill-challenge/studentContext';
import {QuickCheck,QuickCheckCard} from '../quick-check/QuickCheck';
import {useQuickCheck} from '../quick-check/useQuickCheck';
import {usePlayTime} from '../play-time/usePlayTime';
import {gameSpendsTime,spendsTime} from '../play-time/model';
import {PlayTimeChip,EarnTimePrompt} from '../play-time/PlayTime';
import {getSkill} from '../skill-challenge/catalog';
import {supportsLearningRun} from '../arcade/learning';
import {pilotAPI} from '../../pilot/api';
import {useCallback,useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import type {GameEngine} from '../../engine/core/GameEngine';
import type {EngineState} from '../../types/engine';
import {useClassroomParty} from '../classroom-party/context';
import {PrizeStudio} from '../clash/PrizeStudio';
import {activities} from './catalog';
import {nextUnlock,unlockedFeatures,type Feature} from './unlocks';
import {UnlockIntro} from './UnlockIntro';
import {GoalCompanion} from './GoalCompanion';
import {HomeWorld,HomeDestinations} from './HomeWorld';
import {activityNames,checkActivity,exclusiveActivity,isNavigation,navLabel,nextEgg,type Destination,type Intent} from './model';
import './student-navigation.css';
const tabs:[Destination,string,string][]=[['today','Home','⌂'],['pet','My Pet','♡'],['games','Games','▦'],['together','Together','♧'],['rewards','Rewards','☆']];
export function StudentShell({state,engine,children,flush,assignment,tools,onActivity}:{state:EngineState;engine:GameEngine;children:ReactNode;flush?:()=>Promise<boolean>;assignment?:()=>string;tools?:ReactNode;onActivity?:(active:boolean)=>void}){
 const [view,setView]=useState<Destination>('today'),[filter,setFilter]=useState('All'),[search,setSearch]=useState('');
 const [pending,setPending]=useState<{intent:Intent;reason:string;end:boolean}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const viewRef=useRef<Destination>('today'),lock=useRef(false),accepted=useRef(false),ticket=useRef(0),requestRef=useRef<(i:Intent)=>void>(()=>{}),main=useRef<HTMLElement>(null),dialog=useRef<HTMLDialogElement>(null);
 const externalResolve=useRef<((ok:boolean)=>void)|null>(null);
 const performRef=useRef<(i:Intent,end?:boolean)=>Promise<void>>(async()=>{});
 const party=useClassroomParty();
 const quickCheck=useQuickCheck(),ensureCheck=quickCheck.ensureReady;
 const challenge=useStudentChallenge(),assignmentData=challenge?.data?.assignment,challengeInfo=challenge?.data?.challenge;
 const focus=challengeInfo&&!challengeInfo.closedAt&&!assignmentData?.gradeChanged?assignmentData?.progress.focus:null;
 const focusRef=useRef(focus);focusRef.current=focus;
 const playing=view==='activity'&&!focus&&spendsTime(state.screen);
 const playTime=usePlayTime(engine,playing),playBlocked=useRef(false);playBlocked.current=playTime.blocked;
 const [earnOpen,setEarnOpen]=useState(false);
 useEffect(()=>{if(!playing)return;if(playTime.blocked)engine.pause();else engine.resume();},[playing,playTime.blocked,engine]);
 useEffect(()=>{if(focus)engine.pause();},[focus,engine]);
 const target=assignmentData?.progress.targets.find(t=>t.id===(focus?.skillId??assignmentData.progress.current?.skill))??assignmentData?.progress.targets.find(t=>!t.confirmedAt&&t.baseline!==3);
 const mission=target&&challengeInfo&&!challengeInfo.closedAt&&!assignmentData?.gradeChanged?{title:getSkill(target.id)?.name??target.id,detail:focus?'One target for this classroom session. Your place is saved after every answer.':'Your teacher chose this target for you. Learn, practice, and try a fresh check.',button:'Open my learning target',open:()=>challenge?.open()}:undefined;
 const shell=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const bars=Array.from(document.querySelectorAll('.pilot-savebar, .student-nav, .student-activity-bar'));
  const update=()=>shell.current?.style.setProperty('--student-activity-top', `${Math.max(0,...bars.map(bar=>bar.getBoundingClientRect().bottom))}px`);
  const observer=new ResizeObserver(update);bars.forEach(bar=>observer.observe(bar));
  window.addEventListener('resize',update);update();
  return ()=>{observer.disconnect();window.removeEventListener('resize',update);};
 },[view]);
 const changeView=useCallback((next:Destination,history=true)=>{
  viewRef.current=next;setView(next);onActivity?.(next==='activity');if(next!=='activity')engine.pause();else engine.resume();
  if(history)window.history.pushState({vpetView:next},'',window.location.pathname+window.location.search);
  window.scrollTo(0,0);requestAnimationFrame(()=>main.current?.focus({preventScroll:true}));
 },[engine,onActivity]);
 const perform=useCallback(async(i:Intent,end=false)=>{
  if(lock.current)return;lock.current=true;setBusy(true);setError('');const generation=++ticket.current;
  try{
   const game=checkActivity(i,engine.getState());
   if(game&&!focusRef.current&&!await ensureCheck(game,()=>void performRef.current(i,end))){externalResolve.current?.(false);externalResolve.current=null;return;}
   if(gameSpendsTime(game)&&!focusRef.current&&playBlocked.current){setEarnOpen(true);externalResolve.current?.(false);externalResolve.current=null;return;}
   await engine.finishPendingAnswer();
   engine.cancelPendingNavigation();
   if(flush&&!await flush())throw new Error('Your progress is not saved online yet. Retry the connection before switching.');
   if(generation!==ticket.current)return;
   accepted.current=true;
   if(end){const activity=exclusiveActivity(engine.getState());for(const a of activity?.ends??[])engine.dispatchDirect(a);if(!activity&&engine.getState().arcade?.run){engine.dispatchDirect({type:'ARCADE_END'});engine.dispatchDirect({type:'ARCADE_CLOSE'});}}
   if(engine.getState().interaction.careGameActive)engine.dispatchDirect({type:'SET_HAND_MODE',mode:'idle'});
   if(i.action?.type==='SET_SCREEN'&&i.action.screen==='arcade'){const route=i.hash??(i.resume?engine.getState().activityRoute:'')??'';engine.dispatchDirect({type:'SET_ACTIVITY_ROUTE',route:['delivery','arcade-dash','arcade-guard','arcade-cafe','arcade-shop'].includes(route)?route as NonNullable<EngineState['activityRoute']>:''});i={...i,hash:route};}
   if(end&&flush&&!await flush())throw new Error('The activity has ended locally. Retry saving before switching.');
   if(i.hash!==undefined)window.history.replaceState(window.history.state,'',window.location.pathname+window.location.search+(i.hash?'#'+i.hash:''));
   else if(!i.resume)window.history.replaceState(window.history.state,'',window.location.pathname+window.location.search);
   if(i.view&&i.view!=='activity'){changeView(i.view,i.history!==false);}
   else if(i.callback){if(viewRef.current==='activity')changeView('together');i.callback();}
   else {
    changeView('activity',false);
    if(i.action)engine.dispatchDirect(i.action.type==='ARCADE_START'&&supportsLearningRun(i.action.game,engine.getState().learning)?{...i.action,learningMode:true}:i.action);
    window.history.pushState({vpetView:viewRef.current},'',window.location.href);
   }
   setPending(null);
  }catch(e){setError(e instanceof Error?e.message:'Could not switch activities.');externalResolve.current?.(false);externalResolve.current=null;}
  finally{accepted.current=false;lock.current=false;setBusy(false);}
 },[engine,flush,changeView,ensureCheck]);
 useEffect(()=>{performRef.current=perform;},[perform]);
 const request=useCallback((i:Intent)=>{
  if(lock.current)return;
  if(focusRef.current&&!i.callback&&i.view!=='today'){setError('Your teacher has started a focused session. Open your learning target or take an approved pet break.');return;}
  const s=engine.getState(),active=exclusiveActivity(s);
  if(['START_BATTLE','START_RUN'].includes(i.action?.type??'')&&(!s.pet||['sick','dead'].includes(s.pet.state))){setError('Your companion needs care before this adventure. Open My Pet, then Pet care.');return;}
  // Hub browsing keeps the saved exclusive activity. Starting another activity requires a real exit.
  if(active&&(!i.view||i.view==='activity')&&!i.resume){
   setPending({intent:i,reason:`${active.label} is still open. ${active.consequence}`,end:true});return;
  }
  if(s.arcade?.run&&i.hash?.startsWith('arcade-')&&i.hash!=='arcade-shop'&&i.hash!==`arcade-${s.arcade.run.game}`){setPending({intent:i,reason:'Another arcade round is saved. Finish that round with its current score before starting this game. Your earned stars stay yours.',end:true});return;}
  if(viewRef.current==='activity'&&['number_merge','catch_math','pet_care','feeding'].includes(s.screen)){
   setPending({intent:i,reason:s.screen==='number_merge'?'Leaving restarts this Number Merge board. Rewards already earned stay yours.':s.screen==='catch_math'?'Leaving starts a new Catch Math round next time. Answers and rewards already recorded stay yours.':'Leaving cancels any unfinished care activity. Completed care and rewards stay yours.',end:false});return;
  }
  void perform(i);
 },[engine,perform]);
 useEffect(()=>{requestRef.current=request;},[request]);
 useEffect(()=>{
  window.history.replaceState({vpetView:'today'},'',window.location.pathname+window.location.search);
  engine.pause();
  engine.setExternalNavigationHandler((label,purpose)=>new Promise(resolve=>{externalResolve.current?.(false);externalResolve.current=resolve;if(lock.current){resolve(false);externalResolve.current=null;return;}requestRef.current({label,purpose,callback:()=>{externalResolve.current?.(true);externalResolve.current=null;}});}));
  engine.setNavigationHandler(a=>{
   if(accepted.current||(!isNavigation(a)&&a.type!=='ARCADE_START'&&a.type!=='ARCADE_RETRY'))return false;
   if(a.type==='SET_SCREEN'&&a.screen==='play'){requestRef.current({label:'Games',view:'games'});return true;}
   if(a.type==='SET_SCREEN'&&a.screen==='home'){requestRef.current({label:'Home',view:'today'});return true;}
   const s=engine.getState(),active=exclusiveActivity(s);
   const insideRun=a.type==='SET_SCREEN'&&s.run.active&&['run_map','run_encounter','run_reward','run_rest','run_event','run_over','battle'].includes(a.screen);
   const resume=a.type==='SET_SCREEN'&&(a.screen===active?.screen||insideRun);
   requestRef.current({label:navLabel(a),action:a,resume,hash:a.type==='SET_SCREEN'&&a.screen==='arcade'?window.location.hash.slice(1):undefined});return true;
  });
  const off=engine.onAction((a,previous,next)=>{
   if(accepted.current)return;
   if(a.type==='START_ENGINE'&&viewRef.current!=='activity'){engine.pause();return;}
   if(next.screen!==previous.screen&&!['TICK','PAUSE_ENGINE','RESUME_ENGINE','START_ENGINE'].includes(a.type)){
    changeView(next.screen==='home'?'today':next.screen==='play'?'games':'activity',false);
   }
  });
  const back=(e:PopStateEvent)=>{const v=e.state?.vpetView;requestRef.current({label:'Home',view:['today','pet','games','together','rewards'].includes(v)?v:'today',history:false});};
  window.addEventListener('popstate',back);
  return()=>{engine.cancelPendingNavigation();engine.setNavigationHandler(null);engine.setExternalNavigationHandler(null);externalResolve.current?.(false);off();window.removeEventListener('popstate',back);};
 // Register once for the engine; callbacks read current activity state and requestRef.
 },[engine,changeView]);
 useEffect(()=>{if(pending){dialog.current?.showModal();}else dialog.current?.close();},[pending]);
 const egg=nextEgg(state),active=exclusiveActivity(state),run=state.arcade?.run,open=unlockedFeatures(state);
 const savedActivity=active?{label:active.label,screen:active.screen}:state.eggDiscovery?.mission?{label:'Egg questions',screen:'discovery' as const}:!['home','play','discovery','incubation'].includes(state.screen)?{label:state.screen==='arcade'&&state.activityRoute==='delivery'?'Delivery Districts':activityNames[state.screen]??'Your saved activity',screen:state.screen}:null;
 const go=(label:string,screen:EngineState['screen'])=>request({label,action:{type:'SET_SCREEN',screen}});
 const resume=()=>{if(savedActivity)request({label:savedActivity.label,resume:true,action:{type:'SET_SCREEN',screen:savedActivity.screen}});};
 const assigned=assignment?.()??'free';
 const teacherTask=()=>assigned==='discovery'&&egg?request(egg.intent):go('Teacher’s activity',assigned==='bridge'?'woodland':assigned==='care'&&state.pet?'pet_care':'math');
 const cards=(items:Intent[])=> <div className="student-grid">{items.map(i=><button key={i.label} className="student-card" onClick={()=>request(i)}><strong>{i.label}</strong><span>Open →</span></button>)}</div>;
 if(challenge&&!challenge.ready)return <main className="student-hub"><p role="status">Checking your classroom target…</p>{challenge.error&&<p role="alert">{challenge.error} <button onClick={()=>void challenge.refresh().catch(()=>{})}>Retry</button></p>}</main>;
 return <GameCheckContext.Provider value={ensureCheck}><div ref={shell} className="student-shell" data-view={view} aria-busy={busy} inert={busy}>
  {!focus&&<nav className="student-nav" aria-label="Student menus">{tabs.map(([id,name,icon])=><button key={id} aria-current={view===id?'page':undefined} onClick={()=>request({label:name,view:id})}><span aria-hidden="true">{icon}</span>{name}</button>)}</nav>}
  {!focus&&!['today','pet','activity'].includes(view)&&egg&&<div className="student-activity-bar"><button className="student-egg-link" onClick={()=>request(egg.intent)} aria-label="Open my egg’s next step">Egg · {egg.title==='Today is complete!'?'Today complete':'Next step'}</button></div>}
  {!focus&&view==='activity'&&<div className="student-activity-bar"><button onClick={()=>request({label:'Home',view:'today'})}>← Home</button><strong>{activityNames[state.screen]??(state.screen.startsWith('run_')?'Dungeon adventure':'Your activity')}</strong><PlayTimeChip play={playTime}/>{egg&&<button className="student-egg-link" onClick={()=>request(egg.intent)} aria-label="Open my egg’s next step">Egg · {egg.title==='Today is complete!'?'Today complete':'Next step'}</button>}</div>}
  {error&&<p className="student-error" role="alert">{error}</p>}
  {!focus&&<QuickCheck check={quickCheck}/>}
  {!focus&&(earnOpen||(playing&&playTime.blocked))&&<EarnTimePrompt play={playTime} inGame={playing} onMath={()=>{setEarnOpen(false);request({label:'Math Practice',action:{type:'SET_SCREEN',screen:'math'}});}} onHome={()=>{setEarnOpen(false);request({label:'Home',view:'today'});}} onClose={earnOpen&&!playing?()=>setEarnOpen(false):undefined}/>}
  {focus?<main className="student-hub student-focus" aria-label="Focused classroom session"><HomeWorld state={state} assigned={assigned} request={request} teacherTask={teacherTask} mission={mission} focused/>{focus.onBreak?<section className="student-card"><h2>A quiet moment with your companion</h2><p>Stretch, breathe, or say hello. Your learning work is saved.</p></section>:<p className="student-note">Your teacher chose {focus.activity==='lesson'?'an example and guided practice':'practice and due checks'}. You can stop after any saved answer. Use Account & help if you need to sign out.</p>}{focus.breakAllowed&&<button disabled={busy} onClick={async()=>{if(!challengeInfo||!assignmentData)return;setBusy(true);try{challenge?.accept(await pilotAPI<StudentData>(`skill-challenges/break?id=${challengeInfo.id}`,'POST',{revision:assignmentData.revision,onBreak:!focus.onBreak}));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>{focus.onBreak?'Return to my target':'Take an approved pet break'}</button>}{egg&&<p className="student-note">Your egg’s next step is saved for after the session.</p>}</main>:view==='activity'?<div className="student-activity">{children}</div>:<main className="student-hub" ref={main} tabIndex={-1}>
   <header className="student-heading"><p className="student-eyebrow">YOUR WOODLAND WORLD</p><h1>{view==='today'?`Welcome back, ${state.player.displayName}.`:view==='pet'?'A little friend. A world of possibilities.':view==='games'?'What will you play?':view==='together'?'Better with your class.':'Make it yours.'}</h1><p>{view==='today'?'Your next step is right here.':view==='games'?'Choose one game. Start or pick up where you left off.':view==='pet'?'Care, grow, and build a home together.':view==='together'?'Invitations, shared games, and teacher activities.':'Gifts, goals, and things worth saving for.'}</p></header>
   {view==='pet'&&egg&&<section className="student-goal" aria-label="Today’s egg goal"><div><p className="student-eyebrow">YOUR NEXT EGG STEP</p><h2>{egg.title}</h2><p>{egg.detail}</p><button className="student-primary" onClick={()=>request(egg.intent)}>{egg.button} →</button></div><GoalCompanion state={state} showEgg/></section>}
   {view==='today'&&<>
    <UnlockIntro learnerId={state.player.id} open={open}/>
    <HomeWorld state={state} assigned={assigned} request={request} teacherTask={teacherTask} mission={mission}/>
    <QuickCheckCard check={quickCheck}/>
    <PlayTimeChip play={playTime} card/>
    <MathLab/>
    <div className="student-supporting">{savedActivity&&<button className="student-card" onClick={resume}><strong>Continue {savedActivity.label}</strong><span>{active?'Your saved game is waiting.':'Return to this activity.'} →</span></button>}{run&&savedActivity?.screen!=='arcade'&&<button className="student-card" onClick={()=>request({label:'Saved arcade round',action:{type:'SET_SCREEN',screen:'arcade'},hash:run?`arcade-${run.game}`:'',resume:!active})}><strong>{run.done?'View arcade results':'Continue your arcade round'}</strong><span>Your round and score are saved. →</span></button>}{egg&&assigned!=='free'&&assigned!=='discovery'&&<button className="student-card" onClick={teacherTask}><strong>Your teacher’s activity</strong><span>Open your assigned {assigned==='bridge'?'bridge adventure':assigned==='care'?'care activity':'practice'}. →</span></button>}</div>
    {!mission&&open.has('cafe')&&(supportsLearningRun('cafe',state.learning)||supportsLearningRun('guard',state.learning))&&<section className="student-card"><h2>Use your math in the world</h2><p>{state.learning.grade===8?'Plan how many towers to build and how much energy to keep.':state.learning.grade===5?'Use fractions of your stock to prepare real café batches.':state.learning.grade===7?'Predict the percentage of café stock a serving will use.':state.learning.grade===6?'Scale a recipe and watch the batch use your ingredients.':'Plan supplies or a defense using the quantities in your game.'}</p><button onClick={()=>request({label:'Plan & play',action:{type:'SET_SCREEN',screen:'arcade'},hash:supportsLearningRun('cafe',state.learning)?'arcade-cafe':'arcade-guard'})}>Open Plan & play</button></section>}
    <HomeDestinations hasPet={!!state.pet} games={activities.filter(g=>open.has(g.id as Feature)).length} request={request}/>
    {tools&&<section className="student-teacher-tools"><h2>From your teacher</h2>{tools}</section>}
   </>}
   {view==='games'&&<><div className="student-filters"><label>Find a game<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search games"/></label><div aria-label="Game categories">{['All','Quick','Puzzles','Action','Adventures'].map(x=><button key={x} aria-pressed={filter===x} onClick={()=>setFilter(x)}>{x}</button>)}</div></div><div className="student-grid">{activities.filter(g=>open.has(g.id as Feature)&&(filter==='All'||g.group===filter)&&`${g.label} ${g.description}`.toLowerCase().includes(search.toLowerCase())).map(g=>{const locked=g.needsPet&&!state.pet;const continuing=(g.id==='momentum'&&state.momentum.active)||(g.id==='battle'&&state.battle.active&&!state.run.active)||(g.id==='dungeon'&&state.run.active)||(run&&g.id===run.game);return <article className="student-card" key={g.id}><span className="student-game-icon" aria-hidden="true">{g.icon}</span><h2>{g.label}</h2><p>{g.description}</p><button className="student-card-action" onClick={()=>locked?egg&&request(egg.intent):continuing?request({label:g.label,resume:true,action:{type:'SET_SCREEN',screen:g.id==='momentum'?'momentum':g.id==='battle'?'battle':g.id==='dungeon'?active!.screen:'arcade'},hash:g.id==='dungeon'||g.id==='momentum'||g.id==='battle'?undefined:`arcade-${g.id}`}):request(g)} disabled={!!locked&&!egg}>{locked?'Hatch your pet first →':continuing?'Continue →':'Start →'}</button></article>;})}</div>{nextUnlock(open)&&<p className="student-note">More games are on the way: {nextUnlock(open)}</p>}</>}
   {view==='pet'&&<>{!state.pet&&<p className="student-note">Your companion’s care, home, and growth open after hatching. Games are ready now.</p>}{state.pet&&cards([{label:'Visit my companion',action:{type:'SET_SCREEN',screen:'home'},resume:!active},{label:'Pet care',action:{type:'SET_SCREEN',screen:'pet_care'}},{label:'Feed my pet',action:{type:'SET_SCREEN',screen:'feeding'}},{label:'Build my home',action:{type:'HOME_OPEN'}},{label:'Growth & companion family',action:{type:'SET_SCREEN',screen:'growth'}},{label:'Wardrobe & accessories',action:{type:'SET_SCREEN',screen:'gacha'}}])}{state.pet&&<PetIdentityStudio state={state} dispatch={a=>engine.dispatch(a)}/>}</>}
   {view==='together'&&<>{open.has('petGames')?<><PetHuntLauncher prepare={flush}/><RivalBoard/><PetDuels/></>:<p className="student-note">Pet Hunt, class rivals and pet duels open when your egg hatches. Class events below are ready now.</p>}<section className="student-card"><h2>Beat the Teacher</h2><p>Bring your pet to a math battle against your teacher’s griffin. Ask for a match code.</p><a className="student-primary" href={`/?teacherBattle=join&pet=${encodeURIComponent(state.pet?.speciesId??'ember_fox')}`} target="_blank" rel="noreferrer">Join the teacher challenge →</a></section><section className="student-goal"><div><h2>Play with classmates</h2><p>Serve at the café, defend the nest, or race together. Check here for your invitations.</p><button className="student-primary" onClick={()=>party?.()} disabled={!party}>Open invitations & games →</button></div></section><p className="student-note">Closing a live race or defense panel does not pause the class. Reopen it to return, or choose Leave room.</p>{cards([{label:'Shared Delivery Districts',action:{type:'SET_SCREEN',screen:'arcade'},hash:'delivery'}])}{tools&&<section className="student-teacher-tools"><h2>Classroom events & challenges</h2>{tools}</section>}<section className="student-card"><h2>Portal Party</h2><p>Your teacher shares a special join link and code for this class festival. Open that link in another tab. Festival seats and points are separate from your pet account.</p></section></>}
   {view==='rewards'&&<>{cards(([['shop',{label:'Shop',action:{type:'SET_SCREEN',screen:'shop'}}],['quests',{label:'Quests',action:{type:'SET_SCREEN',screen:'quest_log'}}],['season',{label:'Season rewards',action:{type:'SET_SCREEN',screen:'season_pass'}}],['wardrobe',{label:'Cosmetics & crafting',action:{type:'SET_SCREEN',screen:'gacha'}}],['forge',{label:'Power Forge',action:{type:'SET_SCREEN',screen:'power_forge'}}],['dash',{label:'Arcade decorations',action:{type:'SET_SCREEN',screen:'arcade'},hash:'arcade-shop'}]] as [Feature,Intent][]).filter(([f])=>open.has(f)).map(([,i])=>i))}{open.has('prizeStudio')&&<PrizeStudio inline state={state} dispatch={a=>engine.dispatch(a)}/>}{tools&&<section className="student-teacher-tools"><h2>Teacher gifts & class prizes</h2>{tools}</section>}</>}
  </main>}
  <dialog className="student-switch" ref={dialog} onCancel={e=>{if(busy)e.preventDefault();else setPending(null);}} onClose={()=>{if(!lock.current){setPending(null);externalResolve.current?.(false);externalResolve.current=null;}}}><h2>Switch to {pending?.intent.label}?</h2><p>{pending?.reason}</p>{error&&<p role="alert">{error}</p>}<div><button className="student-primary" disabled={busy} onClick={()=>{if(pending)void perform(pending.intent,pending.end);}}>{busy?'Saving…':pending?.end?'End this activity and switch':'Leave and switch'}</button><button disabled={busy} onClick={()=>{setPending(null);externalResolve.current?.(false);externalResolve.current=null;}}>Keep playing</button></div></dialog>
 </div></GameCheckContext.Provider>;
}
