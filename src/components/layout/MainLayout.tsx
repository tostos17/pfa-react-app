import React, { useState } from 'react';
import { Layout, Menu, Button, theme } from 'antd';
// 1. Import MenuProps from 'antd'
import type { MenuProps } from 'antd'; 
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import './MainLayout.scss';

const { Header, Sider, Content } = Layout;

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // 2. Explicitly type the items array using MenuProps['items']
  const menuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Overview Metrics',
    },
    {
      key: 'player-management-group',
      label: 'Player Operations',
      type: 'group', // ◄ TypeScript now strictly recognizes this as a valid MenuItemGroupType literal
      children: [
        {
          key: '/players/roster',
          icon: <TeamOutlined />,
          label: 'Academy Roster',
        },
        {
          key: '/players/register',
          icon: <UsergroupAddOutlined />,
          label: 'Register Athlete',
        },
      ],
    },
    {
      key: 'fixtures-group',
      label: 'Matches & Training',
      type: 'group',
      children: [
        {
          key: '/fixtures',
          icon: <TrophyOutlined />,
          label: 'Match Fixtures',
        },
      ],
    },
  ];

  return (
    <Layout className="main-layout-shell">
      <Sider trigger={null} collapsible collapsed={collapsed} width={260} className="sidebar-container">
        <div className="brand-logo-zone">
          <h2 className="logo-text">{collapsed ? 'PFA' : 'PRO FOOTBALL'}</h2>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={(item) => navigate(item.key)}
          items={menuItems}
          className="sidebar-menu"
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }} className="header-navbar">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="toggle-collapse-btn"
          />
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflowY: 'auto',
          }}
        >
          {/* 🔀 This Outlet tag injects the child component matching our route mapping */}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};