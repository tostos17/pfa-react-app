import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { menuConfiguration } from '../../config/menuConfig';
import type { MenuItem } from '../../config/menuConfig';
import type { AuthUser } from '../../types/auth';
import { normalizeRoles, hasAnyRole } from '../../utils/authRoles';
import './DashboardLayout.scss';

interface SidebarMenuProps {
  onSelect?: () => void;
}

const hasAccess = (roles: string[], userRoles: string[]) => hasAnyRole(userRoles, roles);

const filterMenuItems = (items: MenuItem[], userRoles: string[]): MenuItem[] => {
  return items.reduce<MenuItem[]>((filtered, item) => {
    const allowedChildren = item.children ? filterMenuItems(item.children, userRoles) : [];
    if ((item.path && hasAccess(item.roles, userRoles)) || allowedChildren.length > 0) {
      filtered.push({ ...item, children: allowedChildren });
    }
    return filtered;
  }, []);
};

const renderMenuItems = (items: MenuItem[], navigate: ReturnType<typeof useNavigate>, currentPath: string, onSelect?: () => void, level = 0) => {
  return items.map((item) => {
    const active = item.path === currentPath;
    return (
      <div key={item.key} className={`sidebar-group depth-${level}`}>
        {item.path ? (
          <button
            type="button"
            className={`sidebar-link${active ? ' active' : ''}`}
            onClick={() => {
              navigate(item.path!);
              onSelect?.();
            }}
          >
            {item.label}
          </button>
        ) : (
          <div className="sidebar-section-title">{item.label}</div>
        )}
        {item.children && item.children.length > 0 && (
          <div className="sidebar-group-items">
            {renderMenuItems(item.children, navigate, currentPath, onSelect, level + 1)}
          </div>
        )}
      </div>
    );
  });
};

export const SidebarMenu: React.FC<SidebarMenuProps> = ({ onSelect }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const userRaw = localStorage.getItem('pfa_user');
  const user: AuthUser | null = userRaw ? JSON.parse(userRaw) : null;
  const userRoles = normalizeRoles(user?.roles);
  const authorizedItems = filterMenuItems(menuConfiguration, userRoles);

  return (
    <nav className="sidebar-menu" aria-label="Application navigation">
      {renderMenuItems(authorizedItems, navigate, location.pathname, onSelect)}
    </nav>
  );
};
