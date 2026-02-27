/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { FinanceProvider } from '@/context/FinanceContext';
import { Sidebar } from '@/components/Sidebar';
import SummaryPage from '@/pages/SummaryPage';
import BudgetPage from '@/pages/BudgetPage';
import RevenuePage from '@/pages/RevenuePage';
import InvestmentsPage from '@/pages/InvestmentsPage';

export default function App() {
  return (
    <FinanceProvider>
      <Router>
        <div className="flex h-screen overflow-hidden bg-transparent text-white">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
            <div className="max-w-7xl mx-auto">
              <Routes>
                <Route path="/" element={<SummaryPage />} />
                <Route path="/revenues" element={<RevenuePage />} />
                <Route path="/budget" element={<BudgetPage />} />
                <Route path="/investments" element={<InvestmentsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </Router>
    </FinanceProvider>
  );
}
