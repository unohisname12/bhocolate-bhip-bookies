import React from 'react';
import type { CosmeticSlot } from '../../types/cosmetic';
import { findCosmetic } from '../../config/cosmeticConfig';

interface AccessoryLayerProps {
  equipped: Partial<Record<CosmeticSlot, string | null>>;
  scale: number;
  /** Render only the `aura` slot (behind pet). Default false = front slots. */
  behind?: boolean;
}

const FRONT_SLOTS: CosmeticSlot[] = ['collar', 'eyewear', 'hat'];
const BEHIND_SLOTS: CosmeticSlot[] = ['aura'];

/**
 * Renders the pet's equipped cosmetics as separate layered elements over
 * the pet sprite. Offsets in `Cosmetic.offsets` are defined relative to
 * the native 128px pet frame and scale with the pet's current scale.
 *
 * Ordering: aura (behind pet) → collar → eyewear → hat (front layers).
 * Caller mounts two instances: one with behind=true (before pet sprite)
 * and one with behind=false (after), so aura reads as backlight.
 */
export const AccessoryLayer: React.FC<AccessoryLayerProps> = ({ equipped, scale, behind = false }) => {
  const slots = behind ? BEHIND_SLOTS : FRONT_SLOTS;
  const items = slots
    .map((slot) => ({ slot, cosmeticId: equipped[slot] ?? null }))
    .filter((e) => e.cosmeticId)
    .map((e) => ({ slot: e.slot, cosmetic: findCosmetic(e.cosmeticId!) }))
    .filter((e) => e.cosmetic);

  if (items.length === 0) return null;

  return (
    <>
      {items.map(({ slot, cosmetic }) => {
        if (!cosmetic) return null;
        const { top, left, size } = cosmetic.offsets;
        // Offsets are in native pet-frame pixels; the pet frame center is
        // (64, 64). Position the cosmetic centered on (64 + left, top).
        const scaledSize = size * scale;
        const scaledTop = top * scale;
        const scaledLeft = left * scale;
        const isImg = cosmetic.icon.startsWith('/');
        return (
          <div
            key={slot}
            aria-hidden
            className="absolute pointer-events-none"
            data-testid={`accessory-${slot}`}
            style={{
              top: `calc(50% + ${scaledTop}px - ${scaledSize / 2}px)`,
              left: `calc(50% + ${scaledLeft}px - ${scaledSize / 2}px)`,
              width: `${scaledSize}px`,
              height: `${scaledSize}px`,
              fontSize: `${scaledSize * 0.9}px`,
              lineHeight: 1,
              textAlign: 'center',
              filter: behind ? 'blur(2px) brightness(1.4) drop-shadow(0 0 8px currentColor)' : undefined,
              opacity: behind ? 0.85 : 1,
            }}
          >
            {isImg ? (
              <img
                src={cosmetic.icon}
                alt=""
                className="w-full h-full"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <span role="img" aria-label={cosmetic.name}>{cosmetic.icon}</span>
            )}
          </div>
        );
      })}
    </>
  );
};
