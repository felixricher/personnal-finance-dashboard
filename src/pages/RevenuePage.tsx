import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, DollarSign, Edit2, Check, X, TrendingUp, Users, Calendar, Banknote, History } from 'lucide-react';
import { useFinance, Revenue, SalaryChange } from '@/context/FinanceContext';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const REVENUE_CATEGORIES = ['Dividendes', 'Intérêts', 'Bonus', 'Cadeaux', 'Autre'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export default function RevenuePage() {
  const { revenues, addRevenue, updateRevenue, removeRevenue, salaryConfig, updateSalaryConfig, selectedMonth, setSelectedMonth, selectedYear, setSelectedYear, userSchedule, partnerSchedule, getSalaryAtDate } = useFinance();
  const [newRevenue, setNewRevenue] = useState({ name: '', amount: '', category: REVENUE_CATEGORIES[0] });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Revenue>>({});

  // Local state for salary inputs
  const [salaryInputs, setSalaryInputs] = useState(salaryConfig);

  useEffect(() => {
    setSalaryInputs(salaryConfig);
  }, [salaryConfig]);

  const handleConfigChange = (field: keyof typeof salaryConfig, value: any) => {
    const newConfig = { ...salaryInputs, [field]: value };
    setSalaryInputs(newConfig);
    updateSalaryConfig(newConfig);
  };

  const handleSalaryHistoryChange = (person: 'user' | 'partner', history: SalaryChange[]) => {
    const field = person === 'user' ? 'userSalaryHistory' : 'partnerSalaryHistory';
    handleConfigChange(field, history);
  };

  const addSalaryChange = (person: 'user' | 'partner', amount: number, date: string) => {
    const history = person === 'user' ? [...salaryInputs.userSalaryHistory] : [...salaryInputs.partnerSalaryHistory];
    history.push({ id: crypto.randomUUID(), amount, effectiveDate: date });
    handleSalaryHistoryChange(person, history);
  };

  const removeSalaryChange = (person: 'user' | 'partner', id: string) => {
    const history = person === 'user' ? [...salaryInputs.userSalaryHistory] : [...salaryInputs.partnerSalaryHistory];
    // Prevent removing the last entry
    if (history.length <= 1) return;
    const newHistory = history.filter(h => h.id !== id);
    handleSalaryHistoryChange(person, newHistory);
  };

  const handleAdd = () => {
    if (!newRevenue.name || !newRevenue.amount) return;
    addRevenue({
      name: newRevenue.name,
      amount: parseFloat(newRevenue.amount),
      category: newRevenue.category,
    });
    setNewRevenue({ name: '', amount: '', category: REVENUE_CATEGORIES[0] });
  };

  const startEditing = (revenue: Revenue) => {
    setEditingId(revenue.id);
    setEditForm(revenue);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEditing = () => {
    if (editingId && editForm.name && editForm.amount) {
      updateRevenue(editingId, {
        name: editForm.name,
        amount: typeof editForm.amount === 'string' ? parseFloat(editForm.amount) : editForm.amount,
        category: editForm.category,
      });
      setEditingId(null);
      setEditForm({});
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' });
  };

  // Calculate Monthly Totals using History
  const calculateMonthlyTotal = (schedule: Record<number, string[]>, history: SalaryChange[], monthIndex: number) => {
    const payDates = schedule[monthIndex] || [];
    return payDates.reduce((sum, date) => sum + getSalaryAtDate(history, date), 0);
  };

  const currentUserMonthlyTotal = calculateMonthlyTotal(userSchedule, salaryInputs.userSalaryHistory, selectedMonth);
  const currentPartnerMonthlyTotal = calculateMonthlyTotal(partnerSchedule, salaryInputs.partnerSalaryHistory, selectedMonth);
  const totalMonthlySalary = currentUserMonthlyTotal + currentPartnerMonthlyTotal;

  // Annual Totals Calculation
  const calculateAnnualTotal = (schedule: Record<number, string[]>, history: SalaryChange[]) => {
    return Object.values(schedule).flat().reduce((sum, date) => sum + getSalaryAtDate(history, date), 0);
  };

  const annualUserSalary = calculateAnnualTotal(userSchedule, salaryInputs.userSalaryHistory);
  const annualPartnerSalary = calculateAnnualTotal(partnerSchedule, salaryInputs.partnerSalaryHistory);
  const annualOtherRevenues = revenues.reduce((sum, item) => sum + item.amount, 0) * 12;
  const totalAnnualRevenue = annualUserSalary + annualPartnerSalary + annualOtherRevenues;
  const averageMonthlyRevenue = totalAnnualRevenue / 12;

  const updateSalaryChange = (person: 'user' | 'partner', id: string, amount: number, date: string) => {
    const history = person === 'user' ? [...salaryInputs.userSalaryHistory] : [...salaryInputs.partnerSalaryHistory];
    const index = history.findIndex(h => h.id === id);
    if (index !== -1) {
      history[index] = { ...history[index], amount, effectiveDate: date };
      handleSalaryHistoryChange(person, history);
    }
  };

  // Calculate available years from history
  const getAvailableYears = () => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    years.add(currentYear);

    [...salaryInputs.userSalaryHistory, ...salaryInputs.partnerSalaryHistory].forEach(entry => {
      const year = new Date(entry.effectiveDate).getFullYear();
      years.add(year);
    });

    // Also consider first pay dates
    if (salaryInputs.userFirstPayDate) years.add(new Date(salaryInputs.userFirstPayDate).getFullYear());
    if (salaryInputs.partnerFirstPayDate) years.add(new Date(salaryInputs.partnerFirstPayDate).getFullYear());

    return Array.from(years).sort((a, b) => a - b);
  };

  const availableYears = getAvailableYears();

  // Helper component for Salary History Dialog
  const SalaryHistoryDialog = ({ person, history, onAdd, onUpdate, onRemove }: { person: 'user' | 'partner', history: SalaryChange[], onAdd: (amount: number, date: string) => void, onUpdate: (id: string, amount: number, date: string) => void, onRemove: (id: string) => void }) => {
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editAmount, setEditAmount] = useState('');
    const [editDate, setEditDate] = useState('');

    const sortedHistory = [...history].sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());

    const startEditing = (entry: SalaryChange) => {
      setEditingId(entry.id);
      setEditAmount(entry.amount.toString());
      setEditDate(entry.effectiveDate);
    };

    const saveEdit = () => {
      if (editingId && editAmount && editDate) {
        onUpdate(editingId, parseFloat(editAmount), editDate);
        setEditingId(null);
        setEditAmount('');
        setEditDate('');
      }
    };

    const cancelEdit = () => {
      setEditingId(null);
      setEditAmount('');
      setEditDate('');
    };

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full mt-2 border-white/10 bg-white/5 hover:bg-white/10 text-white">
            <History className="h-3 w-3 mr-2" />
            Gérer l'historique / Augmentations
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Historique des Salaires</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs text-white/50 mb-1 block">Nouveau Montant</label>
                <Input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="0.00"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-white/50 mb-1 block">Date d'effet</label>
                <Input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <Button 
                onClick={() => {
                  if (amount && date) {
                    onAdd(parseFloat(amount), date);
                    setAmount('');
                    setDate('');
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {sortedHistory.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/10">
                  {editingId === entry.id ? (
                    <div className="flex gap-2 w-full items-center">
                      <Input 
                        type="number" 
                        value={editAmount} 
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="flex-1 bg-white/5 border-white/10 text-white h-8 text-sm"
                      />
                      <Input 
                        type="date" 
                        value={editDate} 
                        onChange={(e) => setEditDate(e.target.value)}
                        className="flex-1 bg-white/5 border-white/10 text-white h-8 text-sm"
                      />
                      <Button size="icon" variant="ghost" onClick={saveEdit} className="h-8 w-8 text-emerald-400 hover:bg-emerald-400/10">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-8 w-8 text-red-400 hover:bg-red-400/10">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="font-mono font-medium">{formatCurrency(entry.amount)}</div>
                        <div className="text-xs text-white/50">Depuis le {entry.effectiveDate}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => startEditing(entry)} className="h-6 w-6 text-blue-400 hover:bg-blue-400/10">
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        {history.length > 1 && (
                          <Button variant="ghost" size="icon" onClick={() => onRemove(entry.id)} className="h-6 w-6 text-red-400 hover:bg-red-400/10">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">Revenus</h1>
          <p className="text-white/60">Gérez vos sources de revenus.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/10">
            <Calendar className="h-4 w-4 text-white/50 ml-2" />
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-transparent border-none text-white text-sm focus:ring-0 cursor-pointer [&>option]:bg-slate-900"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/10">
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-transparent border-none text-white text-sm focus:ring-0 cursor-pointer [&>option]:bg-slate-900"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Annual Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white/5 backdrop-blur-md border-white/10 text-white shadow-xl border-l-4 border-l-blue-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">Total Annuel ({selectedYear})</CardTitle>
            <TrendingUp className="h-4 w-4 text-white/50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(totalAnnualRevenue)}</div>
            <p className="text-xs text-white/50">Salaires + Autres revenus</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 backdrop-blur-md border-white/10 text-white shadow-xl border-l-4 border-l-purple-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">Moyenne Mensuelle</CardTitle>
            <Banknote className="h-4 w-4 text-white/50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(averageMonthlyRevenue)}</div>
            <p className="text-xs text-white/50">Basé sur le total annuel</p>
          </CardContent>
        </Card>
      </div>

      {/* Salary Configuration Section */}
      <Card className="shadow-xl bg-white/5 backdrop-blur-md border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5 text-blue-400" />
            Configuration des Salaires (Automatique)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* User Salary Config */}
            <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
              <h3 className="font-medium text-white/80 border-b border-white/10 pb-2">Mon Salaire</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Montant par paie (net)</label>
                  <div className="text-xl font-bold text-white mb-2">
                    {formatCurrency(getSalaryAtDate(salaryInputs.userSalaryHistory, new Date().toISOString().split('T')[0]))}
                  </div>
                  <SalaryHistoryDialog 
                    person="user" 
                    history={salaryInputs.userSalaryHistory} 
                    onAdd={(amount, date) => addSalaryChange('user', amount, date)}
                    onUpdate={(id, amount, date) => updateSalaryChange('user', id, amount, date)}
                    onRemove={(id) => removeSalaryChange('user', id)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Fréquence (semaines)</label>
                    <Input 
                      type="number" 
                      min="1"
                      value={salaryInputs.userFrequencyWeeks || ''}
                      onChange={(e) => handleConfigChange('userFrequencyWeeks', parseInt(e.target.value) || 1)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-400"
                    />
                    <p className="text-[10px] text-white/40 mt-1">1 = Hebdo, 2 = Aux 2 sem.</p>
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Première paie</label>
                    <Input 
                      type="date" 
                      value={salaryInputs.userFirstPayDate}
                      onChange={(e) => handleConfigChange('userFirstPayDate', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Partner Salary Config */}
            <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
              <h3 className="font-medium text-white/80 border-b border-white/10 pb-2">Salaire Conjoint(e)</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Montant par paie (net)</label>
                  <div className="text-xl font-bold text-white mb-2">
                    {formatCurrency(getSalaryAtDate(salaryInputs.partnerSalaryHistory, new Date().toISOString().split('T')[0]))}
                  </div>
                  <SalaryHistoryDialog 
                    person="partner" 
                    history={salaryInputs.partnerSalaryHistory} 
                    onAdd={(amount, date) => addSalaryChange('partner', amount, date)}
                    onUpdate={(id, amount, date) => updateSalaryChange('partner', id, amount, date)}
                    onRemove={(id) => removeSalaryChange('partner', id)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Fréquence (semaines)</label>
                    <Input 
                      type="number" 
                      min="1"
                      value={salaryInputs.partnerFrequencyWeeks || ''}
                      onChange={(e) => handleConfigChange('partnerFrequencyWeeks', parseInt(e.target.value) || 1)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-400"
                    />
                    <p className="text-[10px] text-white/40 mt-1">1 = Hebdo, 2 = Aux 2 sem.</p>
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Première paie</label>
                    <Input 
                      type="date" 
                      value={salaryInputs.partnerFirstPayDate}
                      onChange={(e) => handleConfigChange('partnerFirstPayDate', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Calendrier des Paies ({selectedYear})</h3>
            <div className="rounded-xl border border-white/10 overflow-hidden overflow-x-auto">
              <table className="w-full text-sm text-left text-white/80">
                <thead className="bg-white/5 text-white/60 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 font-medium">Mois</th>
                    <th className="px-4 py-3 font-medium text-blue-300">Mes Paies</th>
                    <th className="px-4 py-3 font-medium text-purple-300">Paies Conjoint(e)</th>
                    <th className="px-4 py-3 font-medium text-right">Total Mensuel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {MONTHS.map((month, index) => {
                    const userPays = userSchedule[index]?.length || 0;
                    const partnerPays = partnerSchedule[index]?.length || 0;
                    
                    const userMonthly = calculateMonthlyTotal(userSchedule, salaryInputs.userSalaryHistory, index);
                    const partnerMonthly = calculateMonthlyTotal(partnerSchedule, salaryInputs.partnerSalaryHistory, index);
                    const monthlyTotal = userMonthly + partnerMonthly;
                    
                    const isSelected = selectedMonth === index;

                    return (
                      <tr key={month} className={cn("hover:bg-white/5 transition-colors", isSelected && "bg-white/10")}>
                        <td className="px-4 py-3 font-medium">
                          {month} {isSelected && <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Actuel</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-black/20 border border-white/10 rounded px-3 py-1 text-blue-300 font-mono">
                            {userPays}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-black/20 border border-white/10 rounded px-3 py-1 text-purple-300 font-mono">
                            {partnerPays}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400">
                          {formatCurrency(monthlyTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xl bg-white/5 backdrop-blur-md border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Banknote className="h-5 w-5 text-emerald-400" />
            Autres Revenus (Ponctuels ou Variables)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Add Revenue Form */}
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
              <h4 className="text-sm font-medium text-white/80">Ajouter un autre revenu</h4>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                <div className="md:col-span-5">
                  <Input 
                    placeholder="Nom (ex: Salaire)" 
                    value={newRevenue.name}
                    onChange={(e) => setNewRevenue({...newRevenue, name: e.target.value})}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-emerald-400 focus:ring-emerald-400/20"
                  />
                </div>
                <div className="md:col-span-3">
                  <Input 
                    type="number" 
                    placeholder="Montant" 
                    value={newRevenue.amount}
                    onChange={(e) => setNewRevenue({...newRevenue, amount: e.target.value})}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-emerald-400 focus:ring-emerald-400/20"
                  />
                </div>
                <div className="md:col-span-3">
                  <select 
                    className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 text-white [&>option]:bg-slate-900"
                    value={newRevenue.category}
                    onChange={(e) => setNewRevenue({...newRevenue, category: e.target.value})}
                  >
                    {REVENUE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <Button onClick={handleAdd} size="icon" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Revenue List */}
            <div className="rounded-xl border border-white/10 overflow-hidden bg-white/5">
              {revenues.length === 0 ? (
                <div className="p-8 text-center text-white/40">
                  Aucun revenu ajouté.
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {revenues.map((revenue) => (
                    <div key={revenue.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                      {editingId === revenue.id ? (
                        <div className="flex flex-col md:flex-row gap-2 w-full items-center">
                          <Input 
                            value={editForm.name} 
                            onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                            className="flex-1 bg-white/5 border-white/10 text-white"
                          />
                          <Input 
                            type="number"
                            value={editForm.amount} 
                            onChange={(e) => setEditForm({...editForm, amount: parseFloat(e.target.value)})}
                            className="w-24 bg-white/5 border-white/10 text-white"
                          />
                          <select 
                            className="flex h-10 w-32 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white [&>option]:bg-slate-900"
                            value={editForm.category}
                            onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                          >
                            {REVENUE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10" onClick={saveEditing}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={cancelEditing}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col">
                            <span className="font-medium text-white">{revenue.name}</span>
                            <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded-full w-fit mt-1 border border-white/5">
                              {revenue.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-mono font-medium text-white">
                              {formatCurrency(revenue.amount)}
                            </span>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-white/40 hover:text-blue-400 hover:bg-blue-400/10" 
                                onClick={() => startEditing(revenue)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-white/40 hover:text-red-400 hover:bg-red-400/10" 
                                onClick={() => removeRevenue(revenue.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
