import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandLogoMonogram } from './BrandLogoMonogram';
import { BrandLogoWordmark } from './BrandLogoWordmark';
import './BrandLogo.scss';

type LogoVariant = 'monogram' | 'wordmark' | 'emoji';

interface BrandLogoProps {
  collapsed?: boolean;
  variant?: LogoVariant;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ collapsed, variant = 'monogram' }) => {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/');
  };

  if (variant === 'monogram') {
    return <BrandLogoMonogram collapsed={collapsed} />;
  }

  if (variant === 'wordmark') {
    return <BrandLogoWordmark collapsed={collapsed} />;
  }

  // Default emoji version
  return (
    <div className="brand-logo" onClick={handleLogoClick} title="Go to Home">
      <div className="logo-icon">⚽</div>
      <span className="logo-text">{collapsed ? 'PFA' : 'PIONEERS FOOTBALL ACADEMY'}</span>
    </div>
  );
};
