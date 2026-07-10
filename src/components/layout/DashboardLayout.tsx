import React, { useState } from 'react';
import { Layout, theme } from 'antd';
import { Outlet } from 'react-router-dom';
import { SidebarMenu } from './SidebarMenu';
import { TopNavbar } from './TopNavbar';
import { BrandLogo } from './BrandLogo';
import './DashboardLayout.scss';

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
        className="sidebar-container desktop-sider" 
      >
        <div className="brand-logo-zone"> 
          <BrandLogo collapsed={collapsed} variant="monogram" /> 
        </div>
        <SidebarMenu /> 
      </Sider>
      
      <Layout>
        <TopNavbar 
          collapsed={collapsed} 
          onToggleCollapse={() => setCollapsed(!collapsed)} 
        />
        
        <Content
          style={{
            margin: '16px 12px', 
            minHeight: 280, 
            background: colorBgContainer, 
            borderRadius: borderRadiusLG, 
            overflowY: 'auto'
          }}
          className="viewport-content-panel" 
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};