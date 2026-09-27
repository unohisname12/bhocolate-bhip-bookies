import type { GameEngineAction } from '../../engine/core/ActionTypes';
import type { SkillReview } from '../../types/woodland';
import { useLearningSettings } from '../../components/LearningContext';
import { dueReviews } from './review';
import { supportsLearningRun } from '../arcade/learning';
import './learning.css';
export function LearningJourney({dispatch,reviews=[],hasPet}:{dispatch:(a:GameEngineAction)=>void;reviews?:SkillReview[];hasPet:boolean}) {
  const learning=useLearningSettings(), due=dueReviews(reviews,learning);
  const cafe=supportsLearningRun('cafe',learning),guard=supportsLearningRun('guard',learning),integrated=cafe||guard;
  const openPlans=()=>{window.location.hash=cafe?'arcade-cafe':'arcade-guard';dispatch({type:'SET_SCREEN',screen:'arcade'});};
  return <section className="learning-journey" aria-label="Your learning journey"><p className="learning-kicker">A LITTLE PRACTICE. A REAL ADVENTURE.</p><h2>{due.length?'A skill to revisit':'Your next small goal'}</h2>
    <p>{due.length?`${due[0].topic}: try new numbers and see what you remember. Help is available.`:integrated?'Use your math to prepare café batches or plan a defense. Choose Plan & play to start without a charge.':'Learn from an example, try your assigned skill, and return later with fresh questions. Your game speed and math level are separate.'}</p>
    <button onClick={()=>dispatch({type:'SET_SCREEN',screen:'math'})}>{due.length?'Review my skill':'Practice my skill'}</button>
    {integrated&&<button onClick={openPlans}>Plan & play with my pet</button>}
    {hasPet&&<button onClick={()=>dispatch({type:'SET_SCREEN',screen:'pet_care'})}>Spend time together</button>}
    <details><summary>First visit or coming back?</summary><p>First visits: explore one game, meet your mystery egg, and collect an activity stamp. Five separate activity dates reveal your matched companion. Missed days never erase stamps.</p><p>Coming back: resume your game, revisit a skill, or choose a new goal. After hatching, First Adventure connects practice, a permanent shelf, pet time, and a battle. All games remain available through the game list.</p></details>
    <details><summary>What do I keep?</summary><p>Arcade stars buy permanent arcade garden decorations. Tokens and pet upgrades belong to your account. Play charges buy classic arcade rounds; Plan & play keeps your saved charges.</p><p>Delivery coins, garage bikes, and tactical credits last inside their city. One-use perks are spent on a delivery. Match scores do not buy wins in another game. Pet growth and prizes are different from evidence of math understanding.</p></details>
    <details><summary>Classroom or demo?</summary><p>Classroom accounts: check “Saved online” before changing devices. A local recovery copy is not an online save. Teacher changes apply to future questions.</p><p>Demo: temporary practice and preview learners reset on reload. Cooperative rooms share a goal; Classroom Clash is a teacher-run competition. Neither a win nor a stored answer proves independent mastery.</p></details>
  </section>;
}
