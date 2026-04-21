import React, { useState, useEffect, useRef } from 'react';
import { Z } from '../../config/zBands';

interface InteractionFeedbackProps {
  /** Text to display. null = hidden. */
  text: string | null;
  /** Pet X in native coords. */
  petX: number;
  /** Ground Y in native coords. */
  groundY: number;
  /** Viewport scale. */
  scale: number;
  /** Interaction quality for color coding. */
  quality?: 'success' | 'neutral' | 'fail';
}

/**
 * Floating text bubble that appears near the pet during interactions.
 *
 * Shows reaction text like "Mmm... that's nice~" with a fade-in/out
 * animation. Color-coded by interaction quality.
 */
export const InteractionFeedback: React.FC<InteractionFeedbackProps> = ({
  text, petX, groundY, scale, quality = 'neutral',
}) => {
  const [displayText, setDisplayText] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (text) {
      setDisplayText(text);
      setVisible(true);

      // Auto-hide after 2.5 seconds
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setVisible(false);
      }, 2500);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text]);

  // Clear display text after fade-out completes
  useEffect(() => {
    if (!visible && displayText) {
      const timer = setTimeout(() => setDisplayText(null), 400);
      return () => clearTimeout(timer);
    }
  }, [visible, displayText]);

  if (!displayText) return null;

  const centerX = petX * scale;
  const bottomY = groundY * scale;

  const textColor = quality === 'success' ? 'rgba(100,255,150,0.95)'
    : quality === 'fail' ? 'rgba(255,160,100,0.95)'
    : 'rgba(255,255,255,0.9)';

  return (
    <div
      className="fixed pointer-events-none"
      style={{
        zIndex: Z.INTERACTION_TEXT,
        left: centerX,
        bottom: bottomY + 80 * scale,
        transform: 'translateX(-50%)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        className="relative px-3 py-1.5 rounded-lg whitespace-nowrap"
        style={{
          background: 'rgba(10,8,25,0.85)',
          border: '1px solid rgba(150,130,255,0.25)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
          maxWidth: 200,
        }}
      >
        <span
          className="text-xs font-bold italic"
          style={{
            color: textColor,
            textShadow: `0 0 8px ${textColor}40`,
          }}
        >
          {displayText}
        </span>

        {/* Speech tail */}
        <div
          className="absolute left-1/2 -translate-x-1/2 -bottom-1.5"
          style={{
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid rgba(10,8,25,0.85)',
          }}
        />
      </div>
    </div>
  );
};
