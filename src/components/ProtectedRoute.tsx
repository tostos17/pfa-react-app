import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import type { AuthUser } from '../types/auth';
import { hasAnyRole } from '../utils/authRoles';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const token = localStorage.getItem('pfa_token');
  const userRaw = localStorage.getItem('pfa_user');
  
  if (!token || !userRaw) {
    return <Navigate to="/login" replace />;
  }

  const user: AuthUser = JSON.parse(userRaw);

  // 1. Force Password Change Interception
  if (user.requirePasswordChange) {
    return <Navigate to="/change-password" replace />;
  }

  // 2. Role-Based Access Control (RBAC) Guard
  if (allowedRoles && !hasAnyRole(user.roles, allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};