import React from 'react';
import type { PropPlacement } from '../../config/roomConfig';
import { Z } from '../../config/zBands';

const LAYER_CONFIG = {
  background: { opacity: 0.45, zOffset: 0 },
  midground:  { opacity: 0.70, zOffset: 5 },
  foreground: { opacity: 0.90, zOffset: 10 },
} as const;

interface ScenePropsProps {
  props: PropPlacement[];
}

/**
 * Renders room decoration assets at predefined positions in the scene.
 * Props are layered by depth: background (faded walls) → midground (furniture) → foreground (floor items).
 */
export const SceneProps: React.FC<ScenePropsProps> = ({ props }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: Z.LEGACY_PROPS }}>
      {props.map((prop) => {
        const layer = prop.layer ?? 'midground';
        const { opacity, zOffset } = LAYER_CONFIG[layer];
        return (
          <img
            key={prop.assetId}
            src={prop.path}
            alt={prop.assetId}
            className="absolute drop-shadow-lg"
            style={{
              left: prop.x,
              top: prop.y,
              width: `${prop.scale * 64}px`,
              height: `${prop.scale * 64}px`,
              imageRendering: 'pixelated' as const,
              transform: 'translate(-50%, -50%)',
              opacity,
              zIndex: zOffset,
            }}
          />
        );
      })}
    </div>
  );
};
