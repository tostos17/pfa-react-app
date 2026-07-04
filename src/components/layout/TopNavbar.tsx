import React from 'react';
import { Avatar, Dropdown, Tag } from 'antd';
import type { MenuProps } from 'antd';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

interface AuthUser {
  username: string;
  fullName?: string;
  roles: string[];
}

export const TopNavbar: React.FC = () => {
  const navigate = useNavigate();
  const userRaw = localStorage.getItem('pfa_user');
  const user: AuthUser | null = userRaw ? JSON.parse(userRaw) : null;

  const displayRole = user?.roles?.[0]?.replace('ROLE_', '') || 'STAFF';

  const handleLogout = () => {
    localStorage.removeItem('pfa_token');
    localStorage.removeItem('pfa_user');
    navigate('/login');
  };

  const dropdownItems: MenuProps['items'] = [
    {
      key: 'logout',
      label: 'Sign Out Session',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <header className="top-navbar">
      <div className="navbar-left">
        <span className="environment-badge">ACADEMY CONSOLE</span>
      </div>

      <div className="navbar-right">
        <div className="user-profile-trigger">
          <div className="profile-details">
            <span className="user-name">{user?.fullName || user?.username || 'Admin'}</span>
            <Tag color="#00b074" className="role-tag">{displayRole}</Tag>
          </div>
          <Dropdown menu={{ items: dropdownItems }} trigger={['click']} placement="bottomRight">
            <Avatar 
              icon={<UserOutlined />} 
              style={{ background: '#1e2229', cursor: 'pointer' }}
            />
          </Dropdown>
        </div>
      </div>
    </header>
  );
};