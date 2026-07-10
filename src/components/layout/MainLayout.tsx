import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import './MainLayout.scss';

export const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const activePath = location.pathname;

  return (
    <div className="main-layout-shell">
      <aside className="sidebar-container">
        <div className="brand-logo-zone">
          <div className="logo-text">PFA</div>
        </div>
        <nav className="sidebar-menu">
          <button className={activePath === '/dashboard' ? 'sidebar-link active' : 'sidebar-link'} onClick={() => navigate('/dashboard')}>
            Overview Metrics
          </button>
          <button className={activePath === '/players/roster' ? 'sidebar-link active' : 'sidebar-link'} onClick={() => navigate('/players/roster')}>
            Academy Roster
          </button>
          <button className={activePath === '/players/register' ? 'sidebar-link active' : 'sidebar-link'} onClick={() => navigate('/players/register')}>
            Register Athlete
          </button>
          <button className={activePath === '/matches/dashboard' ? 'sidebar-link active' : 'sidebar-link'} onClick={() => navigate('/matches/dashboard')}>
            Match Fixtures
          </button>
        </nav>
      </aside>
      <main className="content-shell">
        <header className="header-navbar">
          <div className="header-title">Academy Control Panel</div>
        </header>
        <section className="content-area">
          <Outlet />
        </section>
      </main>
    </div>
  );
};
