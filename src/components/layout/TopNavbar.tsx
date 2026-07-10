import React, { useState } from 'react';
import { Avatar, Dropdown, Tag, Button, Drawer } from 'antd';
import type { MenuProps } from 'antd';
import { LogoutOutlined, UserOutlined, MenuOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { LogoutButton } from '../../features/auth/LogoutButton';
import { SidebarMenu } from './SidebarMenu';

interface AuthUser {
  username: string;
  fullName?: string;
  roles: string[];
}

interface TopNavbarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ collapsed, onToggleCollapse }) => {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

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
        {/* MOBILE ONLY: Opens Slide-Out Drawer */}
        <Button
          type="text"
          icon={<MenuOutlined style={{ fontSize: '20px' }} />}
          onClick={() => setDrawerOpen(true)}
          className="mobile-hamburger-btn"
        />

        {/* DESKTOP ONLY: Collapses / Expands Sidebar */}
        {onToggleCollapse && (
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined style={{ fontSize: '18px' }} /> : <MenuFoldOutlined style={{ fontSize: '18px' }} />}
            onClick={onToggleCollapse}
            className="desktop-toggle-btn"
          />
        )}

        <span className="environment-badge">ADMINISTRATIVE CONSOLE</span>
      </div>

      <div className="navbar-right">
        <div className="user-profile-trigger">
          <div className="profile-details">
            <span className="user-name">{user?.fullName || user?.username || 'Admin'}</span>
            <Tag color="#00b074" className="role-tag">{displayRole}</Tag>
          </div>
          <div className="header-actions">
            <LogoutButton />
          </div>
          <Dropdown menu={{ items: dropdownItems }} trigger={['click']} placement="bottomRight">
            <Avatar
              icon={<UserOutlined />}
              style={{ background: '#1e2229', cursor: 'pointer' }}
            />
          </Dropdown>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <Drawer
        title="Pioneers Football Academy"
        placement="left"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        width={260}
        styles={{
          body: { padding: 0, background: '#001529' },
          header: { background: '#001529', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.08)' }
        }}
      >
        <SidebarMenu onSelect={() => setDrawerOpen(false)} />
      </Drawer>
    </header>
  );
};