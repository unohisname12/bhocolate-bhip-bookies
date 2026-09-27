/** Every playable species supports these same care and battle actions. */
export const PET_ANIMATIONS = ['idle','walking','happy','hungry','eating','sleeping','sick','dead','dirty','being_petted','being_washed','being_brushed','being_comforted','being_trained','playing_with_hand'] as const;
export const COMBAT_ANIMATIONS = ['attack','special','defend','hurt','heal','math'] as const;
export const POSE_SEQUENCES: Record<typeof PET_ANIMATIONS[number], number[]> = {
  idle: [0,0,0,0,0,1,0,0], walking: [0,0,0,0,0,0,0,0], happy: [0,2,2,0,2,2,2,0],
  hungry: [0,0,1,0,0,1,0,0], eating: [0,2,1,2,0,2,1,2], sleeping: [1,1,1,1,1,1,1,1],
  sick: [1,1,0,1,1,1,0,1], dead: [1,1,1,1,1,1,1,1], dirty: [0,1,0,1,0,0,0,0],
  being_petted: [0,2,2,1,1,2,2,0], being_washed: [0,1,2,1,0,1,2,0], being_brushed: [0,1,1,2,2,1,1,0],
  being_comforted: [1,1,0,0,2,2,1,1], being_trained: [0,0,3,3,0,0,3,0], playing_with_hand: [0,2,3,2,0,2,3,2],
};
