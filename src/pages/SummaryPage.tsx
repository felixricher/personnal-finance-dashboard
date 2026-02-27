import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, PieChart, LineChart, Calendar, Banknote } from 'lucide-react';
import { useFinance } from '@/context/FinanceContext';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { subMonths, startOfYear } from 'date-fns';

const EXPENSE_CATEGORIES = ['Logement', 'Nourriture', 'Transport', 'Loisirs', 'Abonnements', 'Santé', 'Éducation', 'Autre'];
const COLORS = ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#F472B6', '#FCD34D', '#2DD4BF'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const SummaryCard = ({ title, value, icon: Icon, subtext, className }: { title: string, value: string, icon: any, subtext?: string, className?: string }) => (
  <Card className={cn("bg-white/5 backdrop-blur-md border-white/10 text-white shadow-xl", className)}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-white/70">{title}</CardTitle>
      <Icon className="h-4 w-4 text-white/50" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subtext && <p className="text-xs text-white/50">{subtext}</p>}
    </CardContent>
  </Card>
);

export default function SummaryPage() {
  const { expenses, revenues, investments, investmentHistory, salaryConfig, getSalaryAtDate, calculatePaySchedule } = useFinance();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const totalMonthlyExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  
  // Calculate schedules for CURRENT YEAR
  const userSchedule = calculatePaySchedule(salaryConfig.userFrequencyWeeks, salaryConfig.userFirstPayDate, currentYear);
  const partnerSchedule = calculatePaySchedule(salaryConfig.partnerFrequencyWeeks, salaryConfig.partnerFirstPayDate, currentYear);

  // Calculate total monthly salary based on CURRENT MONTH and HISTORY
  const calculateMonthlySalary = (schedule: Record<number, string[]>, history: any[], monthIndex: number) => {
    const payDates = schedule[monthIndex] || [];
    return payDates.reduce((sum, date) => sum + getSalaryAtDate(history, date), 0);
  };

  const userMonthlySalary = calculateMonthlySalary(userSchedule, salaryConfig.userSalaryHistory, currentMonth);
  const partnerMonthlySalary = calculateMonthlySalary(partnerSchedule, salaryConfig.partnerSalaryHistory, currentMonth);
  const totalMonthlySalary = userMonthlySalary + partnerMonthlySalary;
  
  // Total Revenue = Salaries + Other Revenues
  const totalMonthlyRevenues = totalMonthlySalary + revenues.reduce((sum, item) => sum + item.amount, 0);
  
  const netIncome = totalMonthlyRevenues - totalMonthlyExpenses;
  const totalInvestments = investments.reduce((sum, item) => sum + item.amount, 0);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' });
  };

  // Prepare Expense Chart Data
  const expenseData = EXPENSE_CATEGORIES.map(cat => ({
    name: cat,
    value: expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0)
  })).filter(d => d.value > 0);

  // Prepare Investment Chart Data
  const investmentTypes = Array.from(new Set(investments.map(i => i.type)));
  const investmentData = investmentTypes.map(type => ({
    name: type,
    value: investments.filter(i => i.type === type).reduce((sum, i) => sum + i.amount, 0)
  })).filter(d => d.value > 0);
  const sortedInvestmentData = investmentData.sort((a, b) => b.value - a.value);

  const [selectedType, setSelectedType] = useState('Total');
  const [timeRange, setTimeRange] = useState('All');

  const chartData = investmentHistory.map(h => ({
    date: h.date,
    value: selectedType === 'Total' ? h.total : (h.breakdown[selectedType] || 0)
  }));

  const getFilteredChartData = () => {
    const now = new Date();
    return chartData.filter(item => {
      const itemDate = new Date(item.date);
      switch (timeRange) {
        case '1 mois': return itemDate >= subMonths(now, 1);
        case '3 mois': return itemDate >= subMonths(now, 3);
        case '6 mois': return itemDate >= subMonths(now, 6);
        case '12 mois': return itemDate >= subMonths(now, 12);
        case 'YTD': return itemDate >= startOfYear(now);
        default: return true;
      }
    });
  };

  const filteredData = getFilteredChartData();

  // Calculate Portfolio Evolution Stats based on filtered data
  const startValue = filteredData.length > 0 ? filteredData[0].value : 0;
  const endValue = filteredData.length > 0 ? filteredData[filteredData.length - 1].value : 0;
  const evolutionDiff = endValue - startValue;
  const evolutionPercentage = startValue > 0 ? (evolutionDiff / startValue) * 100 : 0;

  // Get all unique keys from history breakdown to populate filter options dynamically
  const availableTypes = Array.from(new Set(investmentHistory.flatMap(h => Object.keys(h.breakdown))));
  const FILTER_OPTIONS = ['Total', ...availableTypes.sort()];
  const TIME_RANGES = ['YTD', '1 mois', '3 mois', '6 mois', '12 mois', 'All'];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-lg">Récapitulatif</h1>
          <p className="text-white/60">Vue d'ensemble de votre situation financière (Ce mois-ci).</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <SummaryCard 
          title="Revenus Mensuels" 
          value={formatCurrency(totalMonthlyRevenues)} 
          icon={Banknote}
          subtext="Total des entrées"
          className="border-l-4 border-l-emerald-400"
        />
        <SummaryCard 
          title="Dépenses Mensuelles" 
          value={formatCurrency(totalMonthlyExpenses)} 
          icon={DollarSign}
          subtext="Total des charges"
          className="border-l-4 border-l-blue-400"
        />
        <SummaryCard 
          title="Épargne Potentielle" 
          value={formatCurrency(netIncome)} 
          icon={DollarSign}
          subtext="Revenus - Dépenses"
          className={cn("border-l-4", netIncome >= 0 ? "border-l-green-400" : "border-l-red-400")}
        />
        <SummaryCard 
          title="Investissements" 
          value={formatCurrency(totalInvestments)} 
          icon={TrendingUp}
          subtext="Valeur du portefeuille"
          className="border-l-4 border-l-purple-400"
        />
      </div>

      {/* History Chart Section (Only if history exists) */}
      {investmentHistory.length > 0 && (
        <Card className="shadow-xl bg-white/5 backdrop-blur-md border-white/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle className="flex items-center gap-2 text-white">
                <LineChart className="h-5 w-5 text-purple-400" />
                Évolution du Portefeuille
              </CardTitle>
              {filteredData.length > 0 && (
                <div className={cn("text-sm font-mono font-medium ml-7", evolutionDiff >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {evolutionDiff > 0 ? "+" : ""}{formatCurrency(evolutionDiff)} ({evolutionPercentage.toFixed(2)}%)
                </div>
              )}
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-white/5 border border-white/10 text-white text-sm rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-purple-400 [&>option]:bg-slate-900"
            >
              {FILTER_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap justify-end gap-2 mb-4">
              {TIME_RANGES.map(range => (
                <Button
                  key={range}
                  variant={timeRange === range ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                  className={timeRange === range ? "bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-900/20" : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"}
                >
                  {range}
                </Button>
              ))}
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#A78BFA" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="date" 
                    tick={false}
                    tickLine={false}
                    minTickGap={30}
                    stroke="rgba(255,255,255,0.5)"
                  />
                  <YAxis 
                    tick={false}
                    tickLine={false}
                    width={0}
                    stroke="rgba(255,255,255,0.5)"
                    domain={['dataMin', 'dataMax']}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    contentStyle={{ backgroundColor: 'rgba(20, 20, 30, 0.8)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#A78BFA" 
                    strokeWidth={3} 
                    fillOpacity={1}
                    fill="url(#colorValue)"
                    activeDot={{ r: 6, fill: '#A78BFA', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Expense Chart */}
        <Card className="shadow-xl bg-white/5 backdrop-blur-md border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <PieChart className="h-5 w-5 text-blue-400" />
              Répartition des Dépenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenseData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={expenseData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={0}
                      dataKey="value"
                      stroke="none"
                    >
                      {expenseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)} 
                      contentStyle={{ backgroundColor: 'rgba(20, 20, 30, 0.8)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend verticalAlign="bottom" height={36} formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.7)' }}>{value}</span>} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-white/30">
                Aucune donnée de dépense
              </div>
            )}
          </CardContent>
        </Card>

        {/* Investment Chart */}
        <Card className="shadow-xl bg-white/5 backdrop-blur-md border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <PieChart className="h-5 w-5 text-emerald-400" />
              Allocation d'Actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedInvestmentData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={sortedInvestmentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={0}
                      dataKey="value"
                      stroke="none"
                    >
                      {sortedInvestmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)} 
                      contentStyle={{ backgroundColor: 'rgba(20, 20, 30, 0.8)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend verticalAlign="bottom" height={36} formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.7)' }}>{value}</span>} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-white/30">
                Aucune donnée d'investissement
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
