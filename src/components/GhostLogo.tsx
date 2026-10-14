import React from 'react';
import ghostLogoImg from '../assets/icono.png';

interface GhostLogoProps {
  className?: string;
  size?: number;
}

export const GhostLogo: React.FC<GhostLogoProps> = ({ className = 'w-10 h-10', size }) => {
  return (
    <img
      src={ghostLogoImg}
      alt="Un Fantasma en el Sistema"
      width={size || 48}
      height={size || 48}
      className={`object-contain aspect-square select-none block max-w-full max-h-full ${className}`}
      style={{
        aspectRatio: '1 / 1',
        objectFit: 'contain',
        imageRendering: 'auto',
      }}
      loading="eager"
      decoding="async"
    />
  );
};
