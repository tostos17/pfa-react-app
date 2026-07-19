import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { PlayerRoster } from '../features/players/PlayerRoster';
import { RegisterPlayer } from '../features/players/RegisterPlayer';
import { FinanceLedger } from '../features/finance/FinanceLedger';
import { ParentsDirectory } from '../features/parents/ParentsDirectory';
import { ParentChildrenRoster } from '../features/parents/ParentChildrenRoster';
import { InvoicesPage } from '../features/finance/InvoicesPage';
import { InformationHubAdmin } from '../features/admin/InformationHubAdmin';
import { MatchManagement } from '../features/match/MatchManagement';

export const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Base Protected App Shell Structure */}
        <Route path="/" element={<MainLayout />}>
          {/* Index fallback redirection down to active academy grid */}
          <Route index element={<Navigate to="/players/roster" replace />} />
          
          {/* Player Lifecycle Management Modules */}
          <Route path="players/roster" element={<PlayerRoster />} />
          <Route path="players/register" element={<RegisterPlayer />} />
          <Route path="dashboard/parents" element={<ParentsDirectory />} />
          <Route path="dashboard/parents/register" element={<ParentsDirectory openCreateOnLoad />} />
          <Route path="dashboard/parents/:id" element={<ParentChildrenRoster />} />
          <Route path="parents/my-roster/:username" element={<ParentChildrenRoster />} />
          <Route path="/finance/ledger" element={<FinanceLedger />} />
          <Route path="/finance/invoices" element={<InvoicesPage />} />
          <Route path="/info/news" element={<InformationHubAdmin />} />
          <Route path="/matches/dashboard" element={<MatchManagement />} />
          
          {/* Catch-all pattern dropping back gracefully to index root */}
          <Route path="*" element={<Navigate to="/players/roster" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};