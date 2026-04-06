export const ANIMATION_CONFIG = {
  petStates: {
    idle: 'anim-sprite-idle',
    sleeping: 'anim-sprite-sleep',
    hungry: 'anim-sprite-hungry',
    happy: 'anim-sprite-happy',
    sick: 'anim-wobble filter grayscale opacity-80',
    dead: 'filter grayscale rotate-180 opacity-50',
    dirty: 'anim-sprite-hungry opacity-90',   // reuse shake + dim until real dirty anim exists
    eating: 'anim-sprite-happy',              // placeholder until eating anim exists
  } as Record<string, string>,
  ui: {
    buttonPress: 'anim-pop',
    warning: 'anim-warning',
    reward: 'anim-pop',
  },
  egg: {
    incubating: 'anim-breathe',
    ready: 'anim-wobble anim-glow',
  },
};