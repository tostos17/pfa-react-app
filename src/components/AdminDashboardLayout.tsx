import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboardLayout.scss';

export const AdminDashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="admin-dashboard-shell">
      <aside className={`admin-sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="admin-brand">{collapsed ? 'PFA' : 'PRO FOOTBALL'}</div>
        <nav className="admin-nav">
          <button onClick={() => navigate('/dashboard')}>Players Roster</button>
          <button onClick={() => navigate('/matches/dashboard')}>Match Fixtures</button>
          <button onClick={() => navigate('/attendance')}>Attendance</button>
          <button onClick={() => navigate('/finance/ledger')}>Finances</button>
          <button onClick={() => navigate('/settings')}>Settings</button>
        </nav>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <button onClick={() => setCollapsed(!collapsed)}>{collapsed ? '▶' : '◀'}</button>
          <div className="admin-user">
            <div>Academy Administrator</div>
            <button onClick={() => {
              localStorage.removeItem('pfa_token');
              localStorage.removeItem('pfa_user');
              navigate('/login');
            }}>
              Logout
            </button>
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
};
