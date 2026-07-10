import React, { useState, useEffect } from 'react';
import { LogoutButton } from '../../features/auth/LogoutButton';
import { SidebarMenu } from './SidebarMenu';
import { getRoleLabel } from '../../utils/authRoles';
import './DashboardLayout.scss';

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 992 : false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 992);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const userRaw = localStorage.getItem('pfa_user');
  const user: AuthUser | null = userRaw ? JSON.parse(userRaw) : null;
  const displayRole = getRoleLabel(user?.roles?.[0]);

  return (
    <header className="top-navbar">
      <div className="navbar-left">
        {isMobileView ? (
          <button type="button" className="mobile-hamburger-btn" onClick={() => setDrawerOpen(true)} aria-label="Open navigation menu">
            ☰
          </button>
        ) : (
          onToggleCollapse && (
            <button type="button" className="desktop-toggle-btn" onClick={onToggleCollapse} aria-label="Toggle sidebar">
              {collapsed ? '▶' : '◀'}
            </button>
          )
        )}
        <span className="environment-badge">ADMINISTRATIVE CONSOLE</span>
      </div>

      <div className="navbar-right">
        <div className="user-profile-trigger">
          <div className="profile-details">
            <span className="user-name">{user?.fullName || user?.username || 'Admin'}</span>
            <span className="role-tag">{displayRole}</span>
          </div>
          <LogoutButton type="text" showText={false} />
        </div>
      </div>

      {drawerOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="mobile-drawer-panel" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-header">
              <div>PIONEERS FOOTBALL ACADEMY</div>
              <button type="button" className="drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close navigation drawer">
                ✕
              </button>
            </div>
            <SidebarMenu onSelect={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </header>
  );
};
