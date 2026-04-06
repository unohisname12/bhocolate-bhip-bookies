import React, { useEffect, useState } from 'react';

interface SpotlightMaskProps {
  /** CSS selector of the element to highlight. */
  target: string;
  /** Radius of the spotlight cutout in px. */
  radius?: number;
  /** Click handler on the spotlight area (for "tap" actions). */
  onTargetClick?: () => void;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const SpotlightMask: React.FC<SpotlightMaskProps> = ({
  target,
  radius = 48,
  onTargetClick,
}) => {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    const el = document.querySelector(target);
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setRect({ x: r.x, y: r.y, width: r.width, height: r.height });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [target]);

  if (!rect) return null;

  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const r = Math.max(radius, Math.max(rect.width, rect.height) / 2 + 12);

  return (
    <div className="fixed inset-0 z-[70]" onClick={onTargetClick}>
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <circle cx={cx} cy={cy} r={r} fill="black" />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.85)"
          mask="url(#spotlight-mask)"
        />
        {/* Pulsing ring around spotlight */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(59, 130, 246, 0.5)"
          strokeWidth="3"
          className="animate-pulse"
        />
      </svg>
    </div>
  );
};
