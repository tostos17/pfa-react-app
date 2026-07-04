import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { PlayerRoster } from '../features/players/PlayerRoster';
import { RegisterPlayer } from '../features/players/RegisterPlayer';
import { FinanceLedger } from '../features/finance/FinanceLedger';
import { ParentsDirectory } from '../features/parents/ParentsDirectory';

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
          <Route path="/dashboard/parents" element={<ParentsDirectory />} />
          <Route path="/finance/ledger" element={<FinanceLedger />} />
          
          {/* Catch-all pattern dropping back gracefully to index root */}
          <Route path="*" element={<Navigate to="/players/roster" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};