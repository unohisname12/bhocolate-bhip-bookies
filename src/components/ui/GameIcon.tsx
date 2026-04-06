import React from 'react';

interface GameIconProps {
  icon: string;
  size?: string;
  className?: string;
  alt?: string;
}

/**
 * Renders an emoji as text or an image path as a pixel-art <img>.
 * Use everywhere the app displays an icon that might be an emoji OR an asset path.
 */
export const GameIcon: React.FC<GameIconProps> = ({
  icon,
  size = 'w-5 h-5',
  className = '',
  alt = '',
}) => {
  if (icon.startsWith('/')) {
    return (
      <img
        src={icon}
        alt={alt}
        className={`inline-block object-contain ${size} ${className}`}
        style={{ imageRendering: 'pixelated' }}
      />
    );
  }
  return <span className={className}>{icon}</span>;
};
