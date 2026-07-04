import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import type { AuthUser } from '../types/auth';

export const ForcePasswordGuard: React.FC = () => {
  const token = localStorage.getItem('pfa_token');
  const userRaw = localStorage.getItem('pfa_user');

  if (!token || !userRaw) return <Navigate to="/login" replace />;
  
  const user: AuthUser = JSON.parse(userRaw);
  
  return user.requirePasswordChange ? <Outlet /> : <Navigate to="/dashboard" replace />;
};