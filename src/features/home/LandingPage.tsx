import React from 'react';
import { Button, Card, Row, Col, Divider } from 'antd';
import {
  TeamOutlined,
  TrophyOutlined,
  CalendarOutlined,
  DollarOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './LandingPage.scss';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <TeamOutlined className="feature-icon" />,
      title: 'Player Management',
      description: 'Manage athlete profiles, rosters, and registrations',
      path: '/players/view',
    },
    {
      icon: <TrophyOutlined className="feature-icon" />,
      title: 'Match Tracking',
      description: 'Track matches, tournaments, and performance metrics',
      path: '/matches/dashboard',
    },
    {
      icon: <CalendarOutlined className="feature-icon" />,
      title: 'Calendar & Events',
      description: 'Manage academic calendar and training schedules',
      path: '/settings/calendar',
    },
    {
      icon: <DollarOutlined className="feature-icon" />,
      title: 'Finance Management',
      description: 'Track invoices, ledgers, and financial reports',
      path: '/finance/ledger',
    },
  ];

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">PIONEERS FOOTBALL ACADEMY</h1>
          <p className="hero-subtitle">Develop the Athlete. Refine the Professional.</p>
          <p className="hero-description">
            Comprehensive management platform for athlete development, training, and professional growth
          </p>
          <div className="hero-buttons">
            <Button
              type="primary"
              size="large"
              onClick={() => navigate('/dashboard')}
              className="cta-button"
            >
              Go to Dashboard <ArrowRightOutlined />
            </Button>
          </div>
        </div>
      </section>

      <Divider />

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">Platform Features</h2>
        <Row gutter={[24, 24]}>
          {features.map((feature, index) => (
            <Col key={index} xs={24} sm={12} lg={6}>
              <Card
                className="feature-card"
                hoverable
                onClick={() => navigate(feature.path)}
              >
                <div className="feature-icon-wrapper">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
                <Button type="link" className="feature-link">
                  Explore <ArrowRightOutlined />
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      <Divider />

      {/* Stats Section */}
      <section className="stats-section">
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} lg={6}>
            <div className="stat-card">
              <div className="stat-number">150+</div>
              <div className="stat-label">Active Athletes</div>
            </div>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <div className="stat-card">
              <div className="stat-number">50+</div>
              <div className="stat-label">Staff Members</div>
            </div>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <div className="stat-card">
              <div className="stat-number">200+</div>
              <div className="stat-label">Matches Tracked</div>
            </div>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <div className="stat-card">
              <div className="stat-number">5+</div>
              <div className="stat-label">Years Excellence</div>
            </div>
          </Col>
        </Row>
      </section>

      <Divider />

      {/* CTA Section */}
      <section className="cta-section">
        <h2>Ready to Get Started?</h2>
        <p>Access the full management dashboard and streamline your academy operations</p>
        <Button
          type="primary"
          size="large"
          onClick={() => navigate('/dashboard')}
          className="cta-button-large"
        >
          Enter Dashboard <ArrowRightOutlined />
        </Button>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>&copy; 2026 Pioneers Football Academy. All rights reserved.</p>
      </footer>
    </div>
  );
};
