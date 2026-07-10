import React from 'react';
import { Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { TeamOutlined, UserOutlined, WalletOutlined } from '@ant-design/icons';
import { menuConfiguration } from '../../config/menuConfig';
import type { MenuItem } from '../../config/menuConfig';
import type { AuthUser } from '../../types/auth';

const iconMap: Record<string, React.ReactNode> = {
  'player-management': <TeamOutlined />,
  'parent-management': <UserOutlined />,
  'finance-management': <WalletOutlined />,
};

interface SidebarMenuProps {
  onSelect?: () => void;
}

export const SidebarMenu: React.FC<SidebarMenuProps> = ({ onSelect }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const userRaw = localStorage.getItem('pfa_user');
  const user: AuthUser | null = userRaw ? JSON.parse(userRaw) : null;
  const userRoles = user?.roles || [];

  const filterMenuItems = (items: MenuItem[]): any[] => {
    return items
      .filter((item) => item.roles.some((role) => userRoles.includes(role)))
      .map((item) => {
        return {
          key: item.path || item.key,
          label: item.label,
          icon: iconMap[item.key] || undefined,
          children: item.children ? filterMenuItems(item.children) : undefined,
        };
      });
  };

  const authorizedItems = filterMenuItems(menuConfiguration);

  return (
    <Menu
      mode="inline"
      theme="dark"
      selectedKeys={[location.pathname]}
      onClick={({ key }) => {
        if (key && (key.startsWith('/') || key.includes('/'))) {
          navigate(key);
          if (onSelect) onSelect();
        }
      }}
      style={{ height: '100%', borderRight: 0 }}
      items={authorizedItems}
    />
  );
};