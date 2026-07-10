export const normalizeRole = (role?: string | null): string => {
  if (!role) return '';

  const trimmed = String(role).trim();
  if (!trimmed) return '';

  const upper = trimmed.toUpperCase();
  return upper.startsWith('ROLE_') ? upper : `ROLE_${upper}`;
};

export const normalizeRoles = (roles?: Array<string | null | undefined> | null): string[] => {
  if (!roles) return [];

  return Array.from(new Set(roles.map(normalizeRole).filter(Boolean)));
};

export const hasAnyRole = (userRoles?: Array<string | null | undefined> | null, allowedRoles?: Array<string | null | undefined> | null): boolean => {
  const normalizedUserRoles = normalizeRoles(userRoles);
  const normalizedAllowedRoles = normalizeRoles(allowedRoles);

  return normalizedAllowedRoles.some((role) => normalizedUserRoles.includes(role));
};

export const getRoleLabel = (role?: string | null): string => {
  if (!role) return 'STAFF';
  return normalizeRole(role).replace(/^ROLE_/, '');
};
