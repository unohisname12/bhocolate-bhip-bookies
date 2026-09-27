import { useEffect, useRef, useState } from 'react';
import type { Role } from './model';
export function HuntGuide({onClose,initialRole='runner',online=false}:{onClose:()=>void;initialRole?:Role;online?:boolean}){
 const dialog=useRef<HTMLDialogElement>(null),[role,setRole]=useState<Role>(initialRole);
 useEffect(()=>{const el=dialog.current;el?.showModal();return()=>el?.close();},[]);
 const runner=role==='runner';
 return <dialog ref={dialog} className="hunt-guide" aria-labelledby="hunt-guide-title" onCancel={e=>{e.preventDefault();onClose();}}>
  <header><div><p className="hunt-eyebrow">FIELD GUIDE · PET HUNT</p><h2 id="hunt-guide-title">How to win</h2></div><button autoFocus onClick={onClose}>Close guide</button></header>
  {online&&<p className="hunt-guide-notice">Your online round keeps playing while this guide is open.</p>}
  <div className="hunt-guide-tabs" role="group" aria-label="Choose a side"><button aria-pressed={runner} onClick={()=>setRole('runner')}>Runner guide</button><button aria-pressed={!runner} onClick={()=>setRole('hunter')}>Hunter guide</button></div>
  <p className="hunt-win-rule">{runner?'TEAM WIN: Light any 5 of the 7 beacons. Get 3 of the 4 runners out through the gate.':'HUNTER WIN: Stop the third escape until time runs out, or capture every runner still in the garden.'}</p>
  <video key={role} controls playsInline preload="none" poster={`/assets/pet-hunt-guide/${role}.jpg`} aria-label={`${runner?'Runner':'Hunter'} walkthrough`}>
   <source src={`/assets/pet-hunt-guide/${role}.mp4`} type="video/mp4"/>
   <track kind="captions" srcLang="en" label="English" src={`/assets/pet-hunt-guide/${role}.vtt`}/>
   Your browser cannot play this video. Read the steps below.
  </video>
  <p className="hunt-guide-caption">Short practice demonstration · captions included · <a href={`/assets/pet-hunt-guide/${role}.mp4`} download>Download video</a></p>
  {runner?<><h3>Your first escape</h3><ol>
   <li><strong>Light any five of the seven beacons.</strong> Every map is different, so open Menu → Show minimap if you need a map. Tap E once at a beacon to start charging, then stay close. Spark checks pop up — a quick math question with three answers (tap one, or press 1, 2 or 3). A right answer gives the beacon a boost. A miss makes it fizzle: you lose a little charge and the hunter hears it. Friends charging together go faster.</li>
   <li><strong>Break the chase.</strong> Put a wall between you and the hunter. Quiet-walk with Shift in bushes. Your blaster stuns the hunter; it cannot defeat them. Use your gadget to escape.</li>
   <li><strong>Hide and sneak.</strong> Tap E at a locker to hide inside — the hunter can't see you, but it can check lockers. Tap E at a vent to crawl out of a matching vent far away. A gold key opens the locked building; carry it to the door and tap E.</li>
   <li><strong>Rescue a friend.</strong> Hold E / Help beside their bubble for 3 seconds (Helper: 1.8 seconds). Camping makes bubbles open faster. A caged friend has 60 seconds — hold E / Help at the cage to free them, or they sit out the round. Stun the hunter while it carries a friend to make it drop them.</li>
   <li><strong>Race to the gate.</strong> When five beacons glow, the gate at the top of the map starts opening. It takes 12 seconds — the hunter knows, too. When it opens, step inside and tap ESCAPE.</li>
   <li><strong>Three escapes win together.</strong> One escape does not win the round. Your teammates still need to get out before the clock reaches zero.</li>
  </ol></>:<><h3>Your first hunt</h3><ol>
   <li><strong>Let the head start finish.</strong> Runners get 5 seconds to spread out. Patrol unfinished beacons instead of chasing one pet forever. A gold ring means a beacon is charging — go check it. When the gate starts opening, guard it.</li>
   <li><strong>Use your tools.</strong> Press T to set a trap (3 per round) — pets can't see it until they're right on it. Press R to plant your sensor; it pings when a pet walks by. Tap E to pick up a caught pet, carry it to a free cage, and tap E again. Each cage holds one pet. Tap E beside a locker to check it.</li>
   <li><strong>Land two spaced tags.</strong> A runner glows with protection for 1.8 seconds after a hit. Wait for it to fade before using another shot.</li>
   <li><strong>Aim, then recover.</strong> You have 3 charges. Every shot restarts the 3.2-second recharge timer. Firing and an empty blaster slow your movement; you cannot dash while recovering from a shot or while empty.</li>
   <li><strong>Move on after a capture.</strong> A teammate can rescue the runner. Bubbles open after 24 seconds, or about 12 if you stay close. Staying beside one bubble gives others time to finish beacons.</li>
   <li><strong>Watch the escape count.</strong> Fewer than 3 escapes when time ends wins. Capturing everyone still inside also wins. You do not have to capture pets who already escaped.</li>
  </ol></>}
  <footer><strong>Controls</strong><p>WASD / arrows: move · Mouse: aim · Click / F: fire · E: help / use · Space: gadget · Shift: quiet walk · Q: aim assist.</p><p>Phone: Move and Aim pads, Fire, Help / use, Gadget, Quiet walk. Arena health is separate from your saved pet.</p></footer>
 </dialog>;
}
