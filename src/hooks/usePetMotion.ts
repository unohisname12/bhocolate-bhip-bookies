import { useEffect, useRef } from 'react';
import { samplePetPose } from '../engine/animation/petMotion';
type ReactionPhase = 'idle' | 'anticipation' | 'reacting' | 'afterglow';
export interface UsePetMotionOpts { animationName: string; petX: number; reactionPhase: ReactionPhase; enabled: boolean; speciesId?: string }
/** Animate the sprite, cosmetics, and held item as one body, without changing
 * layout/hitboxes or game state. The caller controls pause and visibility. */
export function usePetMotion(ref: React.RefObject<HTMLElement | null>, opts: UsePetMotionOpts): void {
  const options=useRef(opts);
  useEffect(()=>{options.current=opts;},[opts]);
  useEffect(()=>{
    const element=ref.current;
    if (!opts.enabled || !element) return;
    let raf=0, previous=0, elapsed=0, lastDraw=0, lastX=options.current.petX, tilt=0;
    let previousAnimation=options.current.animationName, previousPhase=options.current.reactionPhase, pulse=0;
    const draw=(now:number)=>{
      const dt=previous?Math.min(64,now-previous):0;previous=now;elapsed+=dt;
      const current=options.current;
      if(current.animationName!==previousAnimation){elapsed=0;previousAnimation=current.animationName;}
      if(current.reactionPhase==='reacting' && previousPhase!=='reacting')pulse=240;
      previousPhase=current.reactionPhase;pulse=Math.max(0,pulse-dt);
      const velocity=dt>0?(current.petX-lastX)/dt:0;lastX=current.petX;
      const limit=current.animationName==='walking'?.6:2.5;
      tilt+=(Math.max(-limit,Math.min(limit,velocity*12))-tilt)*.15;
      if(now-lastDraw>=32){
        lastDraw=now;
        const pose=samplePetPose(current.animationName,elapsed,current.speciesId??'koala_sprite');
        const amount=pulse>0?Math.sin((1-pulse/240)*Math.PI):0;
        const anticipation=current.reactionPhase==='anticipation'?1:0;
        element.style.transform=`translate3d(${pose.x.toFixed(3)}px, ${(pose.y-anticipation*1.5).toFixed(3)}px, 0) rotate(${(pose.rotation+tilt).toFixed(3)}deg) scale(${(pose.sx+amount*.055).toFixed(4)},${(pose.sy-amount*.07).toFixed(4)})`;
        element.style.filter=anticipation?'brightness(1.06)':'';
        element.dataset.motionGesture=pose.gesture;
      }
      raf=requestAnimationFrame(draw);
    };
    raf=requestAnimationFrame(draw);
    return ()=>{cancelAnimationFrame(raf);element.style.transform='';element.style.filter='';delete element.dataset.motionGesture;};
  },[ref,opts.enabled]);
}
