import React from 'react';
import { Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { TeamOutlined, UserOutlined, WalletOutlined } from '@ant-design/icons';
import { menuConfiguration } from '../../config/menuConfig';
import type { MenuItem } from '../../config/menuConfig';
import type { AuthUser } from '../../types/auth';

// Simple mapping to give main parent modules an athletic icon indicator
const iconMap: Record<string, React.ReactNode> = {
  'player-management': <TeamOutlined />,
  'parent-management': <UserOutlined />,
  'finance-management': <WalletOutlined />,
};

export const SidebarMenu: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve user data to evaluate authorization flags
  const userRaw = localStorage.getItem('pfa_user');
  const user: AuthUser | null = userRaw ? JSON.parse(userRaw) : null;
  const userRoles = user?.roles || [];

  // Recursive function to filter menu structures cleanly
  const filterMenuItems = (items: MenuItem[]): any[] => {
    return items
      .filter((item) => item.roles.some((role) => userRoles.includes(role)))
      .map((item) => {
        return {
          // Fallback to item.path if key is not the route path string
          key: item.path || item.key,
          label: item.label,
          icon: iconMap[item.key] || undefined,
          children: item.children ? filterMenuItems(item.children) : undefined,
        };
      });
  };;

  const authorizedItems = filterMenuItems(menuConfiguration);

  return (
    <Menu
      mode="inline"
      theme="dark"
      selectedKeys={[location.pathname]}
      onClick={({ key }) => {
        // Fallback safeguard: routing check
        if (key && (key.startsWith('/') || key.includes('/'))) {
          navigate(key);
        }
      }}
      style={{ height: '100%', borderRight: 0, background: 'transparent' }}
      items={authorizedItems}
    />
  );
};