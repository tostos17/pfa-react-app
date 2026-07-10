import React from 'react';
import { useNavigate } from 'react-router-dom';
import './BrandLogoMonogram.scss';

interface BrandLogoMonogramProps {
  collapsed?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const BrandLogoMonogram: React.FC<BrandLogoMonogramProps> = ({ collapsed, size = 'medium' }) => {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <div 
      className={`brand-logo-monogram ${size}`} 
      onClick={handleLogoClick} 
      title="Go to Home"
    >
      <div className="monogram-container">
        <div className="monogram-inner">
          <span className="monogram-text">PFA</span>
          <div className="soccer-accent">⚽</div>
        </div>
      </div>
      {!collapsed && <span className="logo-label">PIONEERS</span>}
    </div>
  );
};
