import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, DollarSign, Edit2, Check, X } from 'lucide-react';
import { useFinance, Expense } from '@/context/FinanceContext';

const EXPENSE_CATEGORIES = ['Logement', 'Nourriture', 'Transport', 'Loisirs', 'Abonnements', 'Santé', 'Éducation', 'Autre'];

export default function BudgetPage() {
  const { expenses, addExpense, updateExpense, removeExpense } = useFinance();
  const [newExpense, setNewExpense] = useState({ name: '', amount: '', category: EXPENSE_CATEGORIES[0] });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Expense>>({});

  const handleAdd = () => {
    if (!newExpense.name || !newExpense.amount) return;
    addExpense({
      name: newExpense.name,
      amount: parseFloat(newExpense.amount),
      category: newExpense.category,
    });
    setNewExpense({ name: '', amount: '', category: EXPENSE_CATEGORIES[0] });
  };

  const startEditing = (expense: Expense) => {
    setEditingId(expense.id);
    setEditForm(expense);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEditing = () => {
    if (editingId && editForm.name && editForm.amount) {
      updateExpense(editingId, {
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">Budget Mensuel</h1>
        <p className="text-white/60">Gérez vos dépenses récurrentes.</p>
      </div>

      <Card className="shadow-xl bg-white/5 backdrop-blur-md border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <DollarSign className="h-5 w-5 text-blue-400" />
            Détail du Budget
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Add Expense Form */}
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
              <h4 className="text-sm font-medium text-white/80">Ajouter une dépense</h4>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                <div className="md:col-span-5">
                  <Input 
                    placeholder="Nom (ex: Loyer)" 
                    value={newExpense.name}
                    onChange={(e) => setNewExpense({...newExpense, name: e.target.value})}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-400 focus:ring-blue-400/20"
                  />
                </div>
                <div className="md:col-span-3">
                  <Input 
                    type="number" 
                    placeholder="Montant" 
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-400 focus:ring-blue-400/20"
                  />
                </div>
                <div className="md:col-span-3">
                  <select 
                    className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 text-white [&>option]:bg-slate-900"
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                  >
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <Button onClick={handleAdd} size="icon" className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Expense List */}
            <div className="rounded-xl border border-white/10 overflow-hidden bg-white/5">
              {expenses.length === 0 ? (
                <div className="p-8 text-center text-white/40">
                  Aucune dépense ajoutée.
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                      {editingId === expense.id ? (
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
                            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
                            <span className="font-medium text-white">{expense.name}</span>
                            <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded-full w-fit mt-1 border border-white/5">
                              {expense.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-mono font-medium text-white">
                              {formatCurrency(expense.amount)}
                            </span>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-white/40 hover:text-blue-400 hover:bg-blue-400/10" 
                                onClick={() => startEditing(expense)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-white/40 hover:text-red-400 hover:bg-red-400/10" 
                                onClick={() => removeExpense(expense.id)}
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
