import type React from 'react';

interface EnergyAuraProps {
  energy: number;
  maxEnergy: number;
  glowColor: string;
  children: React.ReactNode;
}

export const EnergyAura: React.FC<EnergyAuraProps> = ({ energy, maxEnergy, glowColor, children }) => {
  const ratio = maxEnergy > 0 ? energy / maxEnergy : 0;
  const isMaxed = energy >= maxEnergy;
  const isDepleted = energy <= 0;

  // Visual mapping:
  // 0 energy: dimmed (opacity 0.7, brightness 0.8)
  // low (1-33%): faint glow (2px box-shadow at 20% opacity)
  // mid (34-66%): visible glow (4px at 40%)
  // high (67-99%): strong glow (6px at 60%), subtle breathing
  // max: pulsing aura (6-10px rhythmic), scale breathing (1.0-1.03)

  let glowSize = 0;
  let glowOpacity = 0;
  let animClass = '';
  const style: React.CSSProperties = {};

  if (isDepleted) {
    style.opacity = 0.7;
    style.filter = 'brightness(0.8)';
  } else if (ratio <= 0.33) {
    glowSize = 2;
    glowOpacity = 0.2;
  } else if (ratio <= 0.66) {
    glowSize = 4;
    glowOpacity = 0.4;
  } else if (!isMaxed) {
    glowSize = 6;
    glowOpacity = 0.6;
    animClass = 'momentum-energy-breathe';
  } else {
    glowSize = 8;
    glowOpacity = 0.7;
    animClass = 'momentum-energy-pulse';
  }

  if (!isDepleted && glowSize > 0) {
    style.boxShadow = `0 0 ${glowSize}px ${glowColor.replace(/[\d.]+\)$/, `${glowOpacity})`)}`;
    style.borderRadius = '50%';
  }

  return (
    <div className={`relative inline-flex ${animClass}`} style={style}>
      {children}
    </div>
  );
};
