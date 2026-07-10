import React from 'react';
import { useNavigate } from 'react-router-dom';
import { notify } from '../../config/notifications';
import './LogoutButton.scss';

interface LogoutButtonProps {
  type?: 'primary' | 'default' | 'danger' | 'text';
  danger?: boolean;
  className?: string;
  showText?: boolean;
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({
  danger = true,
  className,
  showText = true,
}) => {
  const navigate = useNavigate();

  const performLogout = () => {
    localStorage.removeItem('pfa_token');
    localStorage.removeItem('pfa_user');
    notify.info('Session terminated successfully.');
    navigate('/login', { replace: true });
  };

  const handleLogoutClick = () => {
    const confirmed = window.confirm('Are you sure you want to log out of the portal?');
    if (confirmed) performLogout();
  };

  return (
    <button
      type="button"
      className={`logout-button ${danger ? 'danger' : ''} ${className || ''}`.trim()}
      onClick={handleLogoutClick}
    >
      ⎋ {showText && 'Logout'}
    </button>
  );
};
