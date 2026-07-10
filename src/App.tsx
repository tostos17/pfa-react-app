import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ForcePasswordGuard } from './components/ForcePasswordGuard';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoginView } from './features/auth/LoginView';
import { ChangePasswordView } from './features/auth/ChangePasswordView';
import { LandingPage } from './features/home/LandingPage';
import { RegisterPlayer } from './features/players/RegisterPlayer';
import { PlayerProfileView } from './features/players/PlayerProfileView';
import { UpdatePlayerProfile } from './features/players/UpdatePlayerProfile';
import { ParentsDirectory } from './features/parents/ParentsDirectory';
import { ParentChildrenRoster } from './features/parents/ParentChildrenRoster';
import { AcademicCalendar } from './features/calendar/AcademicCalendar';
import { PlayerRoster } from './features/players/PlayerRoster';
import { FinanceLedger } from './features/finance/FinanceLedger'; // ◄ 1. Import your ledger component here
import { InvoicesPage } from './features/finance/InvoicesPage';
import { InformationHubAdmin } from './features/admin/InformationHubAdmin';
import { MatchManagement } from './features/match/MatchManagement';

const UnauthorizedView = () => (
  <div style={{ padding: 50, textAlign: 'center' }}>
    <h2>403 - Access Denied</h2>
  </div>
);

const router = createBrowserRouter([
  // Public Access Routes
  {
    path: '/login',
    element: <LoginView />,
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedView />,
  },

  // Gatekeeping Route: Forced Password Reset
  {
    element: <ForcePasswordGuard />,
    children: [
      { path: '/change-password', element: <ChangePasswordView /> }
    ]
  },

  // Protected Core Layout Dashboard Routes
  {
    element: <ProtectedRoute />, // Validates active login session globally
    children: [
      {
        // Landing Page Route (accessible to authenticated users)
        path: '/',
        element: <LandingPage />,
      },
      {
        element: <ProtectedRoute allowedRoles={['ROLE_ADMIN', 'ROLE_COACH', 'ROLE_DIRECTOR']} />,
        children: [
          {
            element: <DashboardLayout />, // Renders your clean side navbar shell
            children: [
              {
                path: '/dashboard',
                element: <Navigate to="/players/view" replace />, // Redirects base view straight to the roster
              },
              {
                path: '/players/register',
                element: <RegisterPlayer />,
              },
              {
                path: '/players/view',
                element: <PlayerRoster />,
              },
              {
                path: '/players/profile/:playerId',
                element: <PlayerProfileView />,
              },
              {
                path: '/players/profile/edit/:playerId',
                element: <UpdatePlayerProfile />,
              },
              {
                path: '/dashboard/parents',
                element: <ParentsDirectory />,
              },
              {
                path: '/dashboard/parents/register',
                element: <ParentsDirectory openCreateOnLoad />,
              },
              {
                path: '/parents/my-roster/:username',
                element: <ParentChildrenRoster />,
              },
              {
                path: '/settings/calendar',
                element: <AcademicCalendar />,
              },
              {
                path: '/finance/ledger', 
                element: <FinanceLedger />,
              },
              {
                path: '/finance/invoices', 
                element: <InvoicesPage />,
              },
              {
                path: '/matches/dashboard', 
                element: <MatchManagement />, 
              },
              {
                path: '/info/news', 
                element: <InformationHubAdmin />,
              },
            ],
          },
        ],
      },
      // Fallback route inside authentication window
      { path: '*', element: <Navigate to="/" replace /> }
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;