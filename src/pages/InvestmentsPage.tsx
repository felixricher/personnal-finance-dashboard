import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, TrendingUp, Link as LinkIcon, RefreshCw, LineChart } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useFinance } from '@/context/FinanceContext';
import { useState } from 'react';
import { subMonths, startOfYear } from 'date-fns';
import { cn } from '@/lib/utils';

const COLORS = ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#F472B6', '#FCD34D', '#2DD4BF'];

export default function InvestmentsPage() {
  const { investments, investmentHistory, sheetUrl, isSyncing, setSheetUrl, handleSyncSheet, removeExpense } = useFinance();
  const [showSheetInput, setShowSheetInput] = useState(false);
  const [selectedType, setSelectedType] = useState('Total');
  const [timeRange, setTimeRange] = useState('All');

  // Dynamically calculate investment types from data
  const investmentTypes = Array.from(new Set(investments.map(i => i.type)));
  const investmentData = investmentTypes.map(type => ({
    name: type,
    value: investments.filter(i => i.type === type).reduce((sum, i) => sum + i.amount, 0)
  })).filter(d => d.value > 0);

  // Group smaller investment types into "Autre" for cleaner chart if too many
  const sortedInvestmentData = investmentData.sort((a, b) => b.value - a.value);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' });
  };

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
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">Investissements</h1>
          <p className="text-white/60">Suivez l'évolution de votre portefeuille.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowSheetInput(!showSheetInput)} className="bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white backdrop-blur-sm">
          <LinkIcon className="mr-2 h-4 w-4" /> Google Sheet
        </Button>
      </div>

      {showSheetInput && (
        <Card className="bg-white/5 border-white/10 backdrop-blur-md">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <h3 className="font-medium text-blue-400">Connexion Google Sheet</h3>
                <p className="text-sm text-white/60">
                  1. Dans votre Google Sheet, allez dans <strong>Fichier {'>'} Partager {'>'} Publier sur le web</strong>.<br/>
                  2. Choisissez l'onglet contenant vos données et sélectionnez le format <strong>Valeurs séparées par des virgules (.csv)</strong>.<br/>
                  3. Copiez le lien généré et collez-le ci-dessous.
                </p>
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv" 
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-400"
                />
                <Button onClick={handleSyncSheet} disabled={isSyncing || !sheetUrl} className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg">
                  {isSyncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Synchroniser'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      <Card className="shadow-xl bg-white/5 backdrop-blur-md border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            Détail des Investissements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Investment List */}
            <div className="rounded-xl border border-white/10 overflow-hidden bg-white/5">
              {investments.length === 0 ? (
                <div className="p-8 text-center text-white/40">
                  Aucun investissement synchronisé. Connectez votre Google Sheet.
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {investments.filter(i => i.amount > 0).map((investment) => (
                    <div key={investment.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{investment.name}</span>
                        <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded-full w-fit mt-1 border border-white/5">
                          {investment.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono font-medium text-emerald-400">
                          {formatCurrency(investment.amount)}
                        </span>
                      </div>
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
