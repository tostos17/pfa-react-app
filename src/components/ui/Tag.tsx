import React from 'react';
import './ui.scss';

interface TagProps {
  color?: 'default' | 'green' | 'red' | 'blue' | 'orange' | 'purple';
  className?: string;
  children: React.ReactNode;
}

const colorMap: Record<string, string> = {
  default: 'rgba(107, 114, 128, 0.12)',
  green: 'rgba(16, 185, 129, 0.12)',
  red: 'rgba(239, 68, 68, 0.12)',
  blue: 'rgba(59, 130, 246, 0.12)',
  orange: 'rgba(249, 115, 22, 0.12)',
  purple: 'rgba(168, 85, 247, 0.12)',
};

const textMap: Record<string, string> = {
  default: '#4b5563',
  green: '#047857',
  red: '#b91c1c',
  blue: '#1d4ed8',
  orange: '#c2410c',
  purple: '#7c3aed',
};

export const Tag: React.FC<TagProps> = ({ color = 'default', className = '', children }) => {
  return (
    <span className={`ui-tag ${className}`} style={{ background: colorMap[color], color: textMap[color] }}>
      {children}
    </span>
  );
};
