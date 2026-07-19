import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../config/axios';
import { notify } from '../../config/notifications';
import type { AuthUser } from '../../types/auth';

export const ChangePasswordView: React.FC = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage('The two passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/force-change-password', {
        oldPassword,
        newPassword,
      });

      const userRaw = localStorage.getItem('pfa_user');
      if (userRaw) {
        const user: AuthUser = JSON.parse(userRaw);
        user.requirePasswordChange = false;
        localStorage.setItem('pfa_user', JSON.stringify(user));
      }

      notify.success('Password updated successfully! Welcome to the academy.');
      navigate('/');
    } catch (error: any) {
      if (error.response?.data?.message) {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage('Failed to update password. Please check your temporary password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h2>Secure Your Account</h2>
        <p>This is your first time logging in. Please update your temporary password to continue.</p>

        {errorMessage && <div className="ui-alert">{errorMessage}</div>}

        <form onSubmit={onSubmit} className="auth-form">
          <div className="ui-form-field">
            <label htmlFor="oldPassword">Temporary Password</label>
            <input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Enter temporary password"
              className="ui-input"
              required
            />
          </div>

          <div className="ui-form-field">
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="ui-input"
              required
            />
          </div>

          <div className="ui-form-field">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="ui-input"
              required
            />
          </div>

          <button type="submit" className="ui-button primary block" disabled={loading}>
            {loading ? 'Updating password…' : 'Update Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};
