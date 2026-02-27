import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { parseGoogleSheetCSV, ParsedInvestmentData } from '@/lib/googleSheetParser';

// --- Types ---
export type Expense = {
  id: string;
  name: string;
  amount: number;
  category: string;
};

export type Revenue = {
  id: string;
  name: string;
  amount: number;
  category: string;
};

export type Investment = {
  id: string;
  name: string;
  amount: number;
  type: string;
};

export type SalaryChange = {
  id: string;
  amount: number;
  effectiveDate: string;
};

export type SalaryConfig = {
  userFrequencyWeeks: number;
  userFirstPayDate: string; // ISO date string
  userSalaryHistory: SalaryChange[];
  partnerFrequencyWeeks: number;
  partnerFirstPayDate: string; // ISO date string
  partnerSalaryHistory: SalaryChange[];
};

interface FinanceContextType {
  expenses: Expense[];
  revenues: Revenue[];
  investments: Investment[];
  investmentHistory: ParsedInvestmentData['history'];
  sheetUrl: string;
  isSyncing: boolean;
  salaryConfig: SalaryConfig;
  userSchedule: Record<number, string[]>;
  partnerSchedule: Record<number, string[]>;
  selectedMonth: number;
  selectedYear: number;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, expense: Partial<Omit<Expense, 'id'>>) => void;
  removeExpense: (id: string) => void;
  addRevenue: (revenue: Omit<Revenue, 'id'>) => void;
  updateRevenue: (id: string, revenue: Partial<Omit<Revenue, 'id'>>) => void;
  removeRevenue: (id: string) => void;
  updateSalaryConfig: (config: SalaryConfig) => void;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
  setSheetUrl: (url: string) => void;
  handleSyncSheet: () => Promise<void>;
  getSalaryAtDate: (history: SalaryChange[], date: string) => number;
  calculatePaySchedule: (frequencyWeeks: number, firstPayDate: string, year: number) => Record<number, string[]>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};

export const FinanceProvider = ({ children }: { children: ReactNode }) => {
  // --- State ---
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('expenses');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [revenues, setRevenues] = useState<Revenue[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('revenues');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  const [salaryConfig, setSalaryConfig] = useState<SalaryConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('salaryConfig');
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // Migration: Convert old single amount to history if needed
        const userHistory = parsed.userSalaryHistory || [
          { id: 'init-user', amount: parsed.userAmount || 0, effectiveDate: parsed.userFirstPayDate || new Date().toISOString().split('T')[0] }
        ];
        const partnerHistory = parsed.partnerSalaryHistory || [
          { id: 'init-partner', amount: parsed.partnerAmount || 0, effectiveDate: parsed.partnerFirstPayDate || new Date().toISOString().split('T')[0] }
        ];

        return {
          userFrequencyWeeks: parsed.userFrequencyWeeks || 2,
          userFirstPayDate: parsed.userFirstPayDate || new Date().toISOString().split('T')[0],
          userSalaryHistory: userHistory,
          partnerFrequencyWeeks: parsed.partnerFrequencyWeeks || 2,
          partnerFirstPayDate: parsed.partnerFirstPayDate || new Date().toISOString().split('T')[0],
          partnerSalaryHistory: partnerHistory,
        };
      }
    }
    const today = new Date().toISOString().split('T')[0];
    return { 
      userFrequencyWeeks: 2,
      userFirstPayDate: today,
      userSalaryHistory: [{ id: 'default-user', amount: 0, effectiveDate: today }],
      partnerFrequencyWeeks: 2,
      partnerFirstPayDate: today,
      partnerSalaryHistory: [{ id: 'default-partner', amount: 0, effectiveDate: today }],
    };
  });

  const [investments, setInvestments] = useState<Investment[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('investments');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [investmentHistory, setInvestmentHistory] = useState<ParsedInvestmentData['history']>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('investmentHistory');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [sheetUrl, setSheetUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sheetUrl') || '';
    }
    return '';
  });

  const [isSyncing, setIsSyncing] = useState(false);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('revenues', JSON.stringify(revenues));
  }, [revenues]);

  useEffect(() => {
    localStorage.setItem('salaryConfig', JSON.stringify(salaryConfig));
  }, [salaryConfig]);

  useEffect(() => {
    localStorage.setItem('investments', JSON.stringify(investments));
  }, [investments]);

  useEffect(() => {
    localStorage.setItem('investmentHistory', JSON.stringify(investmentHistory));
  }, [investmentHistory]);

  useEffect(() => {
    localStorage.setItem('sheetUrl', sheetUrl);
  }, [sheetUrl]);

  // --- Handlers ---
  const addExpense = (newExpense: Omit<Expense, 'id'>) => {
    const expense: Expense = {
      id: crypto.randomUUID(),
      ...newExpense,
    };
    setExpenses([...expenses, expense]);
  };

  const updateExpense = (id: string, updatedExpense: Partial<Omit<Expense, 'id'>>) => {
    setExpenses(expenses.map(e => e.id === id ? { ...e, ...updatedExpense } : e));
  };

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const addRevenue = (newRevenue: Omit<Revenue, 'id'>) => {
    const revenue: Revenue = {
      id: crypto.randomUUID(),
      ...newRevenue,
    };
    setRevenues([...revenues, revenue]);
  };

  const updateRevenue = (id: string, updatedRevenue: Partial<Omit<Revenue, 'id'>>) => {
    setRevenues(revenues.map(r => r.id === id ? { ...r, ...updatedRevenue } : r));
  };

  const removeRevenue = (id: string) => {
    setRevenues(revenues.filter(r => r.id !== id));
  };

  const calculatePaySchedule = (frequencyWeeks: number, firstPayDate: string, year: number) => {
    const schedule: Record<number, string[]> = {};
    for (let i = 0; i < 12; i++) schedule[i] = [];

    if (!firstPayDate || frequencyWeeks <= 0) return schedule;

    // Ensure we are working with local time to avoid timezone shifts on date only strings
    const [y, m, d] = firstPayDate.split('-').map(Number);
    let currentDate = new Date(y, m - 1, d, 12, 0, 0);

    // If start date is in future year or same year, rewind to previous year to ensure we find the first pay of the target year
    while (currentDate.getFullYear() >= year) {
      currentDate.setDate(currentDate.getDate() - (frequencyWeeks * 7));
    }

    // Fast forward to the first pay of the target year
    while (currentDate.getFullYear() < year) {
      currentDate.setDate(currentDate.getDate() + (frequencyWeeks * 7));
    }

    // Calculate pays for the requested year
    while (currentDate.getFullYear() === year) {
      const month = currentDate.getMonth();
      schedule[month].push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + (frequencyWeeks * 7));
    }

    return schedule;
  };

  const getSalaryAtDate = (history: SalaryChange[], date: string) => {
    // Sort history by date descending
    const sorted = [...history].sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
    // Find the first entry that is <= date
    const entry = sorted.find(h => h.effectiveDate <= date);
    return entry ? entry.amount : 0;
  };

  // Derived state for schedules
  const userSchedule = React.useMemo(() => 
    calculatePaySchedule(salaryConfig.userFrequencyWeeks, salaryConfig.userFirstPayDate, selectedYear),
    [salaryConfig.userFrequencyWeeks, salaryConfig.userFirstPayDate, selectedYear]
  );

  const partnerSchedule = React.useMemo(() => 
    calculatePaySchedule(salaryConfig.partnerFrequencyWeeks, salaryConfig.partnerFirstPayDate, selectedYear),
    [salaryConfig.partnerFrequencyWeeks, salaryConfig.partnerFirstPayDate, selectedYear]
  );

  const updateSalaryConfig = (config: SalaryConfig) => {
    setSalaryConfig(config);
  };

  const handleSyncSheet = async () => {
    if (!sheetUrl) return;
    setIsSyncing(true);
    try {
      const response = await fetch(sheetUrl);
      if (!response.ok) {
        if (response.status === 404) throw new Error('Fichier non trouvé (404). Vérifiez le lien.');
        if (response.status === 403) throw new Error('Accès refusé (403). La feuille n\'est peut-être pas publique.');
        throw new Error(`Erreur réseau (${response.status})`);
      }
      const csvText = await response.text();
      
      const { investments: newInvestments, history } = parseGoogleSheetCSV(csvText);
      
      setInvestments(newInvestments);
      setInvestmentHistory(history);
      alert('Synchronisation réussie !');
    } catch (error: any) {
      console.error(error);
      alert(`Erreur : ${error.message || 'Impossible de lire le fichier.'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <FinanceContext.Provider value={{
      expenses,
      revenues,
      investments,
      investmentHistory,
      sheetUrl,
      isSyncing,
      addExpense,
      updateExpense,
      removeExpense,
      addRevenue,
      updateRevenue,
      removeRevenue,
      salaryConfig,
      userSchedule,
      partnerSchedule,
      updateSalaryConfig,
      selectedMonth,
      setSelectedMonth,
      selectedYear,
      setSelectedYear,
      setSheetUrl,
      handleSyncSheet,
      getSalaryAtDate,
      calculatePaySchedule
    }}>
      {children}
    </FinanceContext.Provider>
  );
};
