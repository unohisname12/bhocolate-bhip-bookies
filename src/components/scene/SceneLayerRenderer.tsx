import React from 'react';
import type { SceneConfig } from '../../config/sceneConfig';
import { Z } from '../../config/zBands';

interface SceneLayerRendererProps {
  scene: SceneConfig;
  scale: number;
}

/**
 * Renders a scene as composited layers — sky gradient, strip layers,
 * props, and ground accents — all positioned in native 400×224 space
 * and scaled to the viewport.
 */
export const SceneLayerRenderer: React.FC<SceneLayerRendererProps> = ({ scene, scale }) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* z-0: Sky / wall gradient background */}
      <div
        className="absolute inset-0"
        style={{ background: scene.skyGradient, zIndex: 0 }}
      />

      {/* Strip layers */}
      {scene.layers.map((layer) => (
        <img
          key={layer.id}
          src={layer.asset}
          alt=""
          className="absolute left-0 w-full"
          style={{
            bottom: layer.y * scale,
            height: 'auto',
            zIndex: layer.z,
            imageRendering: 'pixelated',
            opacity: layer.opacity ?? 1,
          }}
          draggable={false}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ))}

      {/* World object props */}
      {scene.props.map((prop) => (
        <img
          key={prop.id}
          src={prop.asset}
          alt=""
          className="absolute"
          style={{
            left: prop.x * scale,
            bottom: prop.y * scale,
            width: prop.width * (prop.scale ?? 1) * scale,
            height: prop.height * (prop.scale ?? 1) * scale,
            zIndex: prop.z,
            imageRendering: 'pixelated',
          }}
          draggable={false}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ))}

      {/* Ground accents (background only — foreground accents rendered separately) */}
      {scene.accents.filter((a) => !a.foreground).map((accent) => (
        <img
          key={accent.id}
          src={accent.asset}
          alt=""
          className="absolute"
          style={{
            left: accent.x * scale,
            bottom: accent.y * scale,
            width: accent.width * scale,
            height: accent.height * scale,
            zIndex: accent.z,
            imageRendering: 'pixelated',
          }}
          draggable={false}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ))}
    </div>
  );
};

/**
 * Foreground accents — rendered above the pet (Z.ACCENTS_FG) for depth overlap.
 * Grass tufts, flowers, rug edges, etc. that partially cover the pet's feet.
 */
export const SceneForegroundAccents: React.FC<SceneLayerRendererProps> = ({ scene, scale }) => {
  const fgAccents = scene.accents.filter((a) => a.foreground);
  if (fgAccents.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: Z.ACCENTS_FG }}>
      {fgAccents.map((accent) => (
        <img
          key={accent.id}
          src={accent.asset}
          alt=""
          className="absolute"
          style={{
            left: accent.x * scale,
            bottom: accent.y * scale,
            width: accent.width * scale,
            height: accent.height * scale,
            imageRendering: 'pixelated',
          }}
          draggable={false}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ))}
    </div>
  );
};
