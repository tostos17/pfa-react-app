// src/config/menuConfig.ts

export interface MenuItem {
  key: string;
  label: string;
  path?: string;
  roles: string[]; // Access control list
  children?: MenuItem[];
}

export const menuConfiguration: MenuItem[] = [
  {
    key: 'player-management',
    label: 'Player Management',
    roles: ['ROLE_ADMIN', 'ROLE_COACH'],
    children: [
      { key: '/players/register', label: 'Register Player', path: '/players/register', roles: ['ROLE_ADMIN'] },
      { key: '/players/view', label: 'View Players', path: '/players/view', roles: ['ROLE_ADMIN', 'ROLE_COACH'] },
      { key: '/players/assessments', label: 'Record Assessment Scores', path: '/players/assessments', roles: ['ROLE_COACH', 'ROLE_ADMIN'] },
      {
        key: 'disciplinary',
        label: 'Disciplinary Measures',
        roles: ['ROLE_ADMIN'],
        children: [
          { key: '/players/disciplinary/suspend', label: 'Suspend Player', path: '/players/disciplinary/suspend', roles: ['ROLE_ADMIN'] },
          { key: '/players/disciplinary/unsuspend', label: 'Un-suspend Player', path: '/players/disciplinary/unsuspend', roles: ['ROLE_ADMIN'] }
        ]
      }
    ]
  },
  {
    key: 'parent-management',
    label: 'Parent Management',
    roles: ['ROLE_ADMIN'],
    children: [
      { key: '/parents/register', label: 'Register Parent', path: '/parents/register', roles: ['ROLE_ADMIN'] },
      { key: '/parents/view', label: 'View Parents', path: '/parents/view', roles: ['ROLE_ADMIN'] }
    ]
  },
  {
    key: 'match-management',
    label: 'Match Center',
    roles: ['ROLE_ADMIN'],
    children: [
      { key: '/matches/dashboard', label: 'Manage Matches', path: '/matches/dashboard', roles: ['ROLE_ADMIN', 'ROLE_COACH', 'ROLE_DIRECTOR'] }
    ]
  },
  {
    key: 'finance-management',
    label: 'Finance Management',
    roles: ['ROLE_ADMIN', 'ROLE_DIRECTOR'],
    children: [
      { key: '/finance/ledger', label: 'Accounts Ledger', path: '/finance/ledger', roles: ['ROLE_ADMIN', 'ROLE_DIRECTOR'] },
      { key: '/finances/payments', label: 'Record Payments', path: '/finances/payments', roles: ['ROLE_ADMIN'] },
      { key: '/finances/expenses', label: 'Record Expenses', path: '/finances/expenses', roles: ['ROLE_ADMIN', 'ROLE_DIRECTOR'] },
      { key: '/finances/transactions', label: 'View All Transactions', path: '/finances/transactions', roles: ['ROLE_ADMIN', 'ROLE_DIRECTOR'] },
      { key: 'finance-invoices', label: 'Invoices', path: '/finance/invoices', roles: ['ROLE_ADMIN', 'ROLE_FINANCE'],
    }
    ]
  },
  {
    key: 'information-management',
    label: 'Information Management',
    roles: ['ROLE_ADMIN', 'ROLE_DIRECTOR'],
    children: [
      { key: '/info/news', label: 'News', path: '/info/news', roles: ['ROLE_ADMIN', 'ROLE_DIRECTOR'] }
    ]
  },
  {
    key: 'system-settings',
    label: 'System Configurations',
    roles: ['ROLE_ADMIN'],
    children: [
      { key: '/settings/calendar', label: 'Academic Calendar', path: '/settings/calendar', roles: ['ROLE_ADMIN'] }
    ]
  }
    
];