import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarMenu } from './SidebarMenu';
import { TopNavbar } from './TopNavbar';
import { BrandLogo } from './BrandLogo';
import './DashboardLayout.scss';

export const DashboardLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="main-layout-shell">
      <aside className={`sidebar-container${collapsed ? ' collapsed' : ''}`}>
        <div className="brand-logo-zone">
          <BrandLogo collapsed={collapsed} variant="monogram" />
        </div>
        <SidebarMenu />
      </aside>

      <div className="content-shell">
        <TopNavbar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
        <main className="viewport-content-panel">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
