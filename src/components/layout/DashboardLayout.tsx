import React, { useState } from 'react';
import { Layout, theme } from 'antd';
import { Outlet } from 'react-router-dom';
import { SidebarMenu } from './SidebarMenu'; // ◄ Imported role-filtered menu component
import { TopNavbar } from './TopNavbar';    // ◄ Standardized header setup
import './MainLayout.scss';

const { Sider, Content } = Layout;

export const DashboardLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken(); 

  return (
    <Layout className="main-layout-shell"> 
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed} 
        breakpoint="lg" 
        collapsedWidth="0" 
        onBreakpoint={(broken) => setCollapsed(broken)} 
        width={260} 
        className="sidebar-container" 
      >
        <div className="brand-logo-zone"> 
          <h2 className="logo-text">{collapsed ? 'PFA' : 'PIONEERS FOOTBALL ACADEMY'}</h2> 
        </div>
        {/* FIXED: Replaced hardcoded menu item blocks with security-vetted component */}
        <SidebarMenu /> 
      </Sider>
      
      <Layout>
        {/* Standardized header rendering across layouts */}
        <TopNavbar />
        
        <Content
          style={{
            margin: '16px 12px', 
            minHeight: 280, 
            background: colorBgContainer, 
            borderRadius: borderRadiusLG, 
          }}
          className="viewport-content-panel" 
        >
          <Outlet /> 
        </Content>
      </Layout>
    </Layout>
  );
};