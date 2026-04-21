import React, { useState, useEffect } from 'react';
import { Z } from '../../config/zBands';
import { INTERACTION_DEFS } from '../../config/interactionConfig';
import type { HandMode } from '../../types/interaction';

interface InteractionVFXProps {
  /** Which VFX type to show. */
  type: string | null;
  /** Current hand mode (for TODO label). */
  mode: HandMode;
  /** Pet X in native coords. */
  petX: number;
  /** Ground Y in native coords. */
  groundY: number;
  /** Viewport scale. */
  scale: number;
}

interface Particle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  duration: number;
  delay: number;
}

const VFX_CONFIGS: Record<string, { emojis: string[]; count: number; spread: number; rise: number }> = {
  hearts:   { emojis: ['❤️', '💕', '💗', '✨'],     count: 8,  spread: 60,  rise: -80 },
  bubbles:  { emojis: ['🫧', '💧', '✨', '🧼'],     count: 10, spread: 50,  rise: -90 },
  fluff:    { emojis: ['✨', '💫', '🌟'],            count: 6,  spread: 70,  rise: -40 },
  glow:     { emojis: ['💛', '✨', '🌟'],            count: 5,  spread: 30,  rise: -30 },
  energy:   { emojis: ['⚡', '💥', '🔥', '✨'],     count: 8,  spread: 50,  rise: -60 },
  confetti: { emojis: ['🎉', '⭐', '🌟', '💫', '✨'], count: 12, spread: 80, rise: -70 },
};

/**
 * Particle VFX overlay that plays during pet interactions.
 *
 * Each interaction type spawns different emoji particles.
 * Shows a TODO label for the final animation that should replace these.
 */
export const InteractionVFX: React.FC<InteractionVFXProps> = ({
  type, mode, petX, groundY, scale,
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!type) {
      setVisible(false);
      return;
    }

    const config = VFX_CONFIGS[type] ?? VFX_CONFIGS.hearts;
    const newParticles: Particle[] = Array.from({ length: config.count }).map((_, i) => ({
      id: i,
      emoji: config.emojis[Math.floor(Math.random() * config.emojis.length)],
      x: (Math.random() - 0.5) * config.spread * 2,
      y: config.rise + (Math.random() - 0.5) * Math.abs(config.rise) * 0.5,
      rotation: (Math.random() - 0.5) * 360,
      scale: 0.7 + Math.random() * 0.6,
      duration: 800 + Math.random() * 600,
      delay: Math.random() * 300,
    }));

    setParticles(newParticles);
    setVisible(true);

    // Auto-hide after longest particle finishes
    const maxDuration = Math.max(...newParticles.map(p => p.duration + p.delay));
    const timer = setTimeout(() => setVisible(false), maxDuration + 100);
    return () => clearTimeout(timer);
  }, [type]);

  if (!visible || !type) return null;

  const centerX = petX * scale;
  const bottomY = groundY * scale;
  const placeholderLabel = mode !== 'idle' ? INTERACTION_DEFS[mode]?.placeholderLabel : null;

  return (
    <div
      className="fixed pointer-events-none"
      style={{
        zIndex: Z.INTERACTION_VFX,
        left: centerX,
        bottom: bottomY + 40 * scale,
        transform: 'translateX(-50%)',
      }}
    >
      {/* Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: 0,
            top: 0,
            fontSize: 20 * p.scale,
            animation: `vfx-float ${p.duration}ms ease-out ${p.delay}ms both`,
            '--vfx-x': `${p.x}px`,
            '--vfx-y': `${p.y}px`,
            '--vfx-r': `${p.rotation}deg`,
          } as React.CSSProperties}
        >
          {p.emoji}
        </div>
      ))}

      {/* TODO label */}
      {placeholderLabel && (
        <div
          className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap"
          style={{
            fontSize: 8,
            fontFamily: 'monospace',
            color: 'rgba(255,200,50,0.8)',
            background: 'rgba(0,0,0,0.6)',
            padding: '1px 6px',
            borderRadius: 3,
          }}
        >
          {placeholderLabel}
        </div>
      )}

      {/* Glow effect for comfort interaction */}
      {type === 'glow' && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: 80,
            height: 80,
            background: 'radial-gradient(circle, rgba(255,220,100,0.3) 0%, transparent 70%)',
            animation: 'glow-pulse 2s ease-in-out infinite',
          }}
        />
      )}

    </div>
  );
};
