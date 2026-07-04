import React, { useState } from 'react';
import { Form, Input, Button, Alert, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../config/axios';
import type { LoginResponse } from '../../types/auth';
import './LoginView.scss';

export const LoginView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        username: values.username,
        password: values.password,
      });

      const { token, ...user } = response.data;
      localStorage.setItem('pfa_token', token);
      localStorage.setItem('pfa_user', JSON.stringify(user));

      message.success('Authorized Successfully.');

      if (user.requirePasswordChange) {
        navigate('/change-password');
        return;
      }

      const roles = user.roles || [];
      if (roles.includes('ROLE_PLAYER')) navigate('/player-portal');
      else if (roles.includes('ROLE_PARENT')) navigate('/parent-portal');
      else if (roles.includes('ROLE_ADMIN') || roles.includes('ROLE_DIRECTOR') || roles.includes('ROLE_COACH')) {
        navigate('/dashboard');
      } else {
        navigate('/unauthorized');
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Invalid credentials verified.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="brand-panel">
        <div className="logo-text">PRO FOOTBALL ACADEMY</div>
        <div className="brand-manifesto">
          <h1>Develop the Athlete.<br />Refine the <span>Professional.</span></h1>
          <p>The core intelligence hub governing athletic profiles, performance metrics, and financial reporting modules.</p>
        </div>
        <div className="brand-footer">© 2026 PFA Management. Systems Operational.</div>
      </div>

      <div className="form-panel">
        <div className="login-card">
          <div className="card-header">
            <h2>Portal Sign In</h2>
            <p>Enter your system authorization details below.</p>
          </div>

          {errorMessage && (
            <Alert message={errorMessage} type="error" showIcon style={{ marginBottom: 20, borderRadius: 6 }} />
          )}

          <Form name="login_form" onFinish={onFinish} layout="vertical" size="large">
            <Form.Item name="username" rules={[{ required: true, message: 'Username parameter required.' }]}>
              <Input prefix={<UserOutlined />} placeholder="Username" style={{ borderRadius: 6 }} />
            </Form.Item>

            <Form.Item name="password" rules={[{ required: true, message: 'Password parameter required.' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Password" style={{ borderRadius: 6 }} />
            </Form.Item>

            <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={loading} block className="submit-btn">
                Authenticate Session
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};