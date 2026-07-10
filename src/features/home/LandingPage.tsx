import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import './LandingPage.scss';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: 'Player Management',
      description: 'Manage athlete profiles, rosters, and registrations',
      path: '/players/view',
    },
    {
      title: 'Match Tracking',
      description: 'Track matches, tournaments, and performance metrics',
      path: '/matches/dashboard',
    },
    {
      title: 'Calendar & Events',
      description: 'Manage academic calendar and training schedules',
      path: '/settings/calendar',
    },
    {
      title: 'Finance Management',
      description: 'Track invoices, ledgers, and financial reports',
      path: '/finance/ledger',
    },
  ];

  return (
    <div className="landing-page">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">PIONEERS FOOTBALL ACADEMY</h1>
          <p className="hero-subtitle">Develop the Athlete. Refine the Professional.</p>
          <p className="hero-description">
            Comprehensive management platform for athlete development, training, and professional growth.
          </p>
          <div className="hero-buttons">
            <Button variant="primary" size="large" onClick={() => navigate('/dashboard')}>
              Go to Dashboard →
            </Button>
          </div>
        </div>
      </section>

      <section className="features-section">
        <h2 className="section-title">Platform Features</h2>
        <div className="features-grid">
          {features.map((feature) => (
            <div key={feature.title} className="feature-card" onClick={() => navigate(feature.path)}>
              <div className="feature-icon">⚽</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
              <Button variant="text" className="feature-link">
                Explore →
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">150+</div>
            <div className="stat-label">Active Athletes</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">50+</div>
            <div className="stat-label">Staff Members</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">200+</div>
            <div className="stat-label">Matches Tracked</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">5+</div>
            <div className="stat-label">Years of Excellence</div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Ready to Get Started?</h2>
        <p>Access the full management dashboard and streamline your academy operations.</p>
        <Button variant="primary" size="large" onClick={() => navigate('/dashboard')}>
          Enter Dashboard →
        </Button>
      </section>

      <footer className="landing-footer">
        <p>© 2026 Pioneers Football Academy. All rights reserved.</p>
      </footer>
    </div>
  );
};
