import React, { useEffect, useMemo } from 'react';
import { ChevronLeft, Plus, DollarSign, ArrowRight, Calendar, Tag, Trash2, Info, Utensils, Plane, Zap, Film, HeartPulse, ShoppingBag, CreditCard, Car, Pencil, Copy, Search, Download } from 'lucide-react';
import { useSettlrStore } from '../../stores/useSettlrStore';
import { CalculationEngine } from '../../services/calculationEngine';
import { DebtSimplifier } from '../../services/debtSimplifier';
import { AddExpenseModal } from '../expenses/AddExpenseModal';
import { SettleUpModal } from './SettleUpModal';
import { ExplanationModal } from '../expenses/ExplanationModal';
import { exportExpensesToCSV } from '../../utils/csvExport';
import type { Expense, ExpenseCategory } from '../../types/index';

interface GroupDetailProps {
  groupId: string;
  onBack: () => void;
}

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'food': return <Utensils className="w-6 h-6" />;
    case 'travel': return <Plane className="w-6 h-6" />;
    case 'transport': return <Car className="w-6 h-6" />;
    case 'utilities': return <Zap className="w-6 h-6" />;
    case 'entertainment': return <Film className="w-6 h-6" />;
    case 'health': return <HeartPulse className="w-6 h-6" />;
    case 'shopping': return <ShoppingBag className="w-6 h-6" />;
    default: return <Tag className="w-6 h-6" />;
  }
};

export const GroupDetail: React.FC<GroupDetailProps> = ({ groupId, onBack }) => {
  const { groups, expenses, settlements, loadExpenses, loadSettlements, subscribeToGroup, deleteExpense, addExpense, deleteSettlement, isLoading } = useSettlrStore();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState<Expense | null>(null);
  const [isSettleModalOpen, setIsSettleModalOpen] = React.useState(false);
  const [explainingExpense, setExplainingExpense] = React.useState<Expense | null>(null);
  const [activeTab, setActiveTab] = React.useState<'expenses' | 'settlements'>('expenses');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('');
  
  const group = groups.find(g => g.id === groupId);

  useEffect(() => {
    loadExpenses(groupId);
    loadSettlements(groupId);
    
    // Start Real-time sync
    const unsubscribe = subscribeToGroup(groupId);
    return () => unsubscribe();
  }, [groupId, loadExpenses, loadSettlements, subscribeToGroup]);

  // Derived Data
  const balances = useMemo(() => {
    if (!group) return [];
    return CalculationEngine.calculateBalances(group.members, expenses, settlements);
  }, [group, expenses, settlements]);

  const simplifiedDebts = useMemo(() => {
    return DebtSimplifier.simplify(balances);
  }, [balances]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchesSearch = !searchQuery || exp.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !categoryFilter || exp.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchQuery, categoryFilter]);

  const handleDuplicate = async (exp: Expense) => {
    const { id: _id, createdAt: _createdAt, ...rest } = exp;
    await addExpense({ ...rest, date: new Date().toISOString().split('T')[0] });
  };

  if (!group) return null;

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Navigation & Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-extrabold">{group.name}</h1>
          <p className="text-slate-500 dark:text-slate-400">{group.members.length} members in this squad</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Balances & Debts */}
        <div className="lg:col-span-1 space-y-8">
          {/* Summary Card */}
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Net Balances
            </h3>
            <div className="space-y-3">
              {balances.map(b => (
                <div key={b.memberId} className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">{b.displayName}</span>
                  <span className={`font-bold ${b.netBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {b.netBalance >= 0 ? '+' : ''}${Math.abs(b.netBalance).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Simplified Debts Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-800 dark:to-slate-950 rounded-[2rem] p-6 text-white shadow-xl">
            <h3 className="font-bold mb-6 flex items-center gap-2">
              <Info className="w-5 h-5 text-primary-400" />
              Suggested Settlements
            </h3>
            {simplifiedDebts.length === 0 ? (
              <p className="text-slate-400 text-sm italic">All settled up! No transactions needed.</p>
            ) : (
              <div className="space-y-4">
                {simplifiedDebts.map((debt, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/10">
                    <span className="font-medium text-sm truncate flex-1 text-rose-300">
                      {group.members.find(m => m.id === debt.from)?.displayName ?? 'Unknown'}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                    <span className="font-medium text-sm truncate flex-1 text-emerald-300">
                      {group.members.find(m => m.id === debt.to)?.displayName ?? 'Unknown'}
                    </span>
                    <span className="font-bold text-sm bg-white/10 px-2 py-1 rounded-lg">
                      ${debt.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Expenses & Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl">
              <button
                onClick={() => setActiveTab('expenses')}
                className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
                  activeTab === 'expenses' ? 'bg-white dark:bg-slate-800 shadow-sm' : 'text-slate-500'
                }`}
              >
                Expenses
              </button>
              <button
                onClick={() => setActiveTab('settlements')}
                className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
                  activeTab === 'settlements' ? 'bg-white dark:bg-slate-800 shadow-sm' : 'text-slate-500'
                }`}
              >
                Settlements
              </button>
            </div>
            <div className="flex gap-2">
              {activeTab === 'expenses' && expenses.length > 0 && (
                <button
                  onClick={() => exportExpensesToCSV(expenses, group.members, group.name)}
                  className="btn-secondary py-2 px-4 flex items-center gap-2 text-sm"
                  title="Export to CSV"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsSettleModalOpen(true)}
                className="btn-secondary py-2 px-4 flex items-center gap-2 text-sm"
              >
                <DollarSign className="w-4 h-4" /> Settle Up
              </button>
              <button
                onClick={() => { setEditingExpense(null); setIsExpenseModalOpen(true); }}
                className="btn-primary py-2 px-4 flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" /> Add Expense
              </button>
            </div>
          </div>

          {activeTab === 'expenses' && expenses.length > 0 && (
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search expenses..."
                  className="input-field pl-9 py-2 text-sm"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="input-field py-2 text-sm w-40"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {(['Food', 'Transport', 'Entertainment', 'Utilities', 'Shopping', 'Travel', 'Health', 'Other'] as ExpenseCategory[]).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : activeTab === 'expenses' ? (
            expenses.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-700">
                <Tag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No expenses yet. Start splitting!</p>
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-700">
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No expenses match your search.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredExpenses.map(exp => (
                  <div
                    key={exp.id}
                    className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0">
                      <div className="text-slate-400">
                        {getCategoryIcon(exp.category)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-lg">{exp.title}</h4>
                      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(exp.date).toLocaleDateString()}
                        </span>
                        <span>Paid by <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {group.members.find(m => m.id === exp.paidBy)?.displayName ?? 'Unknown'}
                        </span></span>
                        {exp.notes && <span className="truncate max-w-[120px]" title={exp.notes}>"{exp.notes}"</span>}
                      </div>
                    </div>
                    <div className="text-right mr-2 flex flex-col items-end">
                      <div className="text-xl font-black text-slate-900 dark:text-white">${exp.amount.toFixed(2)}</div>
                      <button
                        onClick={() => setExplainingExpense(exp)}
                        className="text-[10px] font-bold text-primary-500 uppercase tracking-wider hover:underline flex items-center gap-1"
                      >
                        {exp.splitMethod} <Info className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => { setEditingExpense(exp); setIsExpenseModalOpen(true); }}
                        className="p-2 text-slate-300 hover:text-primary-500 transition-colors"
                        title="Edit expense"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(exp)}
                        className="p-2 text-slate-300 hover:text-secondary-500 transition-colors"
                        title="Duplicate expense"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (window.confirm('Delete this expense?')) deleteExpense(exp.id); }}
                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                        title="Delete expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            settlements.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-700">
                <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No settlements yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {settlements.map(s => (
                  <div 
                    key={s.id}
                    className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                      <CreditCard className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-lg flex items-center gap-2">
                        {group.members.find(m => m.id === s.fromMember)?.displayName ?? 'Unknown'}
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                        {group.members.find(m => m.id === s.toMember)?.displayName ?? 'Unknown'}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(s.date).toLocaleDateString()}
                        </span>
                        {s.note && <span>"{s.note}"</span>}
                      </div>
                    </div>
                    <div className="text-right mr-2">
                      <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">${s.amount.toFixed(2)}</div>
                    </div>
                    <button 
                      onClick={() => {
                        if (window.confirm('Delete this settlement?')) {
                          deleteSettlement(s.id);
                        }
                      }}
                      className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => { setIsExpenseModalOpen(false); setEditingExpense(null); }}
        groupId={groupId}
        editingExpense={editingExpense}
      />

      <SettleUpModal
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        groupId={groupId}
        suggestions={simplifiedDebts}
      />

      {explainingExpense && (
        <ExplanationModal 
          isOpen={!!explainingExpense}
          onClose={() => setExplainingExpense(null)}
          expense={explainingExpense}
          members={group.members}
        />
      )}
    </div>
  );
};
