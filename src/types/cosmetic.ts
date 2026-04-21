export type CosmeticSlot = 'hat' | 'eyewear' | 'collar' | 'aura';

export type CosmeticRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Cosmetic {
  id: string;
  name: string;
  slot: CosmeticSlot;
  rarity: CosmeticRarity;
  /** Emoji glyph OR path to a 32x32 sprite. Read by HeldItem/AccessoryLayer. */
  icon: string;
  /**
   * Pixel offsets (native 128px frame) for placing the cosmetic on the pet.
   * left is measured from the sprite's center; top from the sprite's top.
   */
  offsets: { top: number; left: number; size: number };
  /** How it can be acquired. */
  source: 'gacha' | 'season' | 'shop' | 'event' | 'achievement';
  /** Dust value when shardified (duplicate pulls). */
  shardValue: number;
}

export interface CosmeticInventoryEntry {
  cosmeticId: string;
  count: number;
  firstObtainedAt: string;
}

export interface CosmeticState {
  owned: CosmeticInventoryEntry[];
  /** Per-pet-slot equip: { [petId]: { hat: 'id' | null, ... } } */
  equipped: Record<string, Partial<Record<CosmeticSlot, string | null>>>;
  /** Gacha pity counter — guarantees a rare/epic every N pulls. */
  gachaPullsSinceRare: number;
  gachaPullsSinceEpic: number;
}
