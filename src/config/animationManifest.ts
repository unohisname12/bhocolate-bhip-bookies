/**
 * Animation manifest — defines all 20 blue koala action animations.
 *
 * Each animation is generated as a single 640x512 grid image (5x4 of 128x128 frames)
 * via one Pixel Lab API call, then extracted into a horizontal sprite sheet.
 */

export interface AnimationDefinition {
  id: string;
  action: string;
  label: string;
  prompt: string;
  gridImagePath: string;
  spriteSheetPath: string;
  framesDir: string;
}

const BASE_DIR = '/assets/generated/review/animations';

const BASE_PROMPT =
  'Create a pixel art sprite sheet, 3 columns 3 rows grid, 128x128 pixel frames, cute blue koala pet character';
const STYLE_SUFFIX =
  'sequential animation frames, 16-bit RPG style, clean pixel edges, transparent background';

function def(action: string, label: string, motion: string): AnimationDefinition {
  return {
    id: `blue_koala_${action}`,
    action,
    label,
    prompt: `${BASE_PROMPT} ${motion}, ${STYLE_SUFFIX}`,
    gridImagePath: `${BASE_DIR}/${action}/grid.png`,
    spriteSheetPath: `${BASE_DIR}/${action}/blue-koala-${action}.png`,
    framesDir: `${BASE_DIR}/${action}/frames`,
  };
}

export const ANIMATION_DEFINITIONS: AnimationDefinition[] = [
  def('eating', 'Eating', 'picking up food, opening mouth wide, chewing with puffed cheeks, swallowing, satisfied smile'),
  def('attack', 'Attack', 'pulling arm back, lunging forward with fist punch, impact burst, returning to stance'),
  def('talking', 'Talking', 'mouth opening and closing, head tilting, small hand gestures, chatting animatedly'),
  def('smiling', 'Smiling', 'neutral face becoming wide smile, eyes squinting with joy, slight happy bounce'),
  def('walking', 'Walking', 'left foot forward, body shifting, right foot forward, full walk cycle loop'),
  def('running', 'Running', 'leaning forward, legs pumping fast, dust trail, full run cycle loop'),
  def('sleeping', 'Sleeping', 'eyes closing, curling into ball, gentle breathing rise and fall, ZZZ floating'),
  def('playing', 'Playing', 'bouncing with toy ball, tossing ball up, catching it, bouncing happily'),
  def('bathing', 'Bathing', 'sitting in tub, splashing water, scrubbing with brush, shaking off water drops'),
  def('crying', 'Crying', 'eyes welling up, tears streaming down, body trembling, wiping eyes with paw'),
  def('angry', 'Angry', 'furrowing brow, face turning red, stomping feet, steam from ears'),
  def('scared', 'Scared', 'eyes widening, body shrinking down, trembling, hiding face behind paws'),
  def('celebrating', 'Celebrating', 'jumping with arms raised, confetti, spinning around, fist pump victory'),
  def('waving', 'Waving', 'arm raising up, hand waving side to side, friendly smile, arm lowering'),
  def('thinking', 'Thinking', 'hand on chin, thought bubble appearing, eyes looking up, tapping chin'),
  def('healing', 'Healing', 'soft green glow appearing, sparkles swirling around body, glow fading'),
  def('jumping', 'Jumping', 'crouching down, springing upward, reaching peak, landing back down'),
  def('sitting', 'Sitting', 'lowering body, settling onto ground, legs tucking in, relaxed gentle sway'),
  def('love', 'Love', 'eyes turning to hearts, pink hearts floating up, hugging self, blushing'),
  def('dizzy', 'Dizzy', 'swaying side to side, stars circling around head, eyes spinning, stumbling'),
];

export type AnimationAction = (typeof ANIMATION_DEFINITIONS)[number]['action'];
