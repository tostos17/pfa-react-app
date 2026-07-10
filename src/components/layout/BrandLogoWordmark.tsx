import React from 'react';
import { useNavigate } from 'react-router-dom';
import './BrandLogoWordmark.scss';

interface BrandLogoWordmarkProps {
  collapsed?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const BrandLogoWordmark: React.FC<BrandLogoWordmarkProps> = ({ collapsed, size = 'medium' }) => {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <div 
      className={`brand-logo-wordmark ${size}`} 
      onClick={handleLogoClick} 
      title="Go to Home"
    >
      <div className="wordmark-icon">⚽</div>
      <div className="wordmark-text">
        {collapsed ? (
          <>
            <div className="wordmark-main-short">PFA</div>
          </>
        ) : (
          <>
            <div className="wordmark-main">PIONEERS</div>
            <div className="wordmark-sub">Football Academy</div>
          </>
        )}
      </div>
    </div>
  );
};
