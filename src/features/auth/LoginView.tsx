import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../config/axios';
import type { LoginResponse } from '../../types/auth';
import { notify } from '../../config/notifications';
import { normalizeRoles } from '../../utils/authRoles';
import './LoginView.scss';

export const LoginView: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        username,
        password,
      });

      const { token, ...user } = response.data;
      const normalizedUser = {
        ...user,
        roles: normalizeRoles(user.roles),
      };
      localStorage.setItem('pfa_token', token);
      localStorage.setItem('pfa_user', JSON.stringify(normalizedUser));
      notify.success('Authorized successfully.');

      if (normalizedUser.requirePasswordChange) {
        navigate('/change-password');
        return;
      }

      const roles = normalizedUser.roles || [];
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
          <h1>
            Develop the Athlete.<br />
            Refine the <span>Professional.</span>
          </h1>
          <p>
            The core intelligence hub governing athletic profiles, performance metrics,
            and financial reporting modules.
          </p>
        </div>
        <div className="brand-footer">© 2026 PFA Management. Systems Operational.</div>
      </div>

      <div className="form-panel">
        <div className="login-card">
          <div className="card-header">
            <h2>Portal Sign In</h2>
            <p>Enter your system authorization details below.</p>
          </div>

          {errorMessage && <div className="ui-alert">{errorMessage}</div>}

          <form onSubmit={onSubmit} className="login-form">
            <div className="ui-form-field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                autoComplete="username"
                className="ui-input"
                required
              />
            </div>

            <div className="ui-form-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                className="ui-input"
                required
              />
            </div>

            <button type="submit" className="ui-button primary block" disabled={loading}>
              {loading ? 'Authenticating…' : 'Authenticate Session'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
