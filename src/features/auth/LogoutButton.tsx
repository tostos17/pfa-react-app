import React from 'react';
import { Button, Modal, message } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

interface LogoutButtonProps {
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  danger?: boolean;
  className?: string;
  showText?: boolean;
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({
  type = 'text',
  danger = true,
  className,
  showText = true,
}) => {
  const navigate = useNavigate();

  const performLogout = () => {
    // 1. Clear stored authentication tokens and session data
    localStorage.removeItem('pfa_token');
    localStorage.removeItem('pfa_user');

    message.info('Session terminated successfully.');

    // 2. Redirect user back to portal login
    navigate('/login', { replace: true });
  };

  const handleLogoutClick = () => {
    Modal.confirm({
      title: 'Confirm Logout',
      content: 'Are you sure you want to log out of the portal?',
      okText: 'Logout',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        performLogout();
      },
    });
  };

  return (
    <Button
      type={type}
      danger={danger}
      icon={<LogoutOutlined />}
      onClick={handleLogoutClick}
      className={className}
    >
      {showText && 'Logout'}
    </Button>
  );
};