import React, { useState, useEffect, useMemo } from 'react';
import { X, DollarSign, Tag, Users, Loader2, Info, FileText } from 'lucide-react';
import { useSettlrStore } from '../../stores/useSettlrStore';
import { CalculationEngine } from '../../services/calculationEngine';
import { ValidationService } from '../../services/validationService';
import type { SplitMethod, MemberShare, Expense, ExpenseCategory } from '../../types/index';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  editingExpense?: Expense | null;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose, groupId, editingExpense }) => {
  const { groups, addExpense, updateExpense, isSaving } = useSettlrStore();
  const group = groups.find(g => g.id === groupId);
  const isEditing = !!editingExpense;

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [paidBy, setPaidBy] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Other');
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [customPercentages, setCustomPercentages] = useState<Record<string, number>>({});
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});
  const [customMode, setCustomMode] = useState<'percentage' | 'amount'>('percentage');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const categories: ExpenseCategory[] = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Shopping', 'Travel', 'Health', 'Other'];

  // Pre-fill from editing expense when modal opens in edit mode
  useEffect(() => {
    if (isOpen && editingExpense && group) {
      setTitle(editingExpense.title);
      setAmount(String(editingExpense.amount));
      setPaidBy(editingExpense.paidBy);
      setCategory(editingExpense.category);
      setSplitMethod(editingExpense.splitMethod);
      setNotes(editingExpense.notes ?? '');

      if (editingExpense.splitMethod === 'custom') {
        const hasPct = editingExpense.shares.some(s => s.percentage !== undefined);
        if (hasPct) {
          setCustomMode('percentage');
          const pcts: Record<string, number> = {};
          editingExpense.shares.forEach(s => { pcts[s.memberId] = s.percentage ?? 0; });
          setCustomPercentages(pcts);
        } else {
          setCustomMode('amount');
          const amts: Record<string, number> = {};
          editingExpense.shares.forEach(s => { amts[s.memberId] = s.amount; });
          setCustomAmounts(amts);
        }
      }
    }
  }, [isOpen, editingExpense?.id]);

  // Clear stale validation errors each time the modal opens
  useEffect(() => {
    if (isOpen) setErrors([]);
  }, [isOpen]);

  // Re-initialize member-dependent state only when the group or member count changes
  useEffect(() => {
    if (group && group.members.length > 0) {
      setPaidBy(group.members[0].id);
      // Distribute 100% as integers, giving remainder to the first member
      const base = Math.floor(100 / group.members.length);
      const remainder = 100 - base * group.members.length;
      const initialPcts: Record<string, number> = {};
      group.members.forEach((m, i) => {
        initialPcts[m.id] = i < remainder ? base + 1 : base;
      });
      setCustomPercentages(initialPcts);
      // Initialize amounts to 0; they'll be derived from total when the user switches mode
      const initialAmts: Record<string, number> = {};
      group.members.forEach(m => { initialAmts[m.id] = 0; });
      setCustomAmounts(initialAmts);
    }
  }, [group?.id, group?.members.length]);

  // When switching to amount mode, pre-fill from the current equal split if all zeros
  useEffect(() => {
    if (customMode === 'amount' && group) {
      const amtNum = parseFloat(amount);
      if (!isNaN(amtNum) && amtNum > 0 && Object.values(customAmounts).every(a => a === 0)) {
        const base = Number((amtNum / group.members.length).toFixed(2));
        const newAmts: Record<string, number> = {};
        group.members.forEach((m, i) => {
          newAmts[m.id] = i === 0
            ? Number((amtNum - base * (group.members.length - 1)).toFixed(2))
            : base;
        });
        setCustomAmounts(newAmts);
      }
    }
  }, [customMode]);

  const calculatedShares = useMemo(() => {
    if (!group || !amount || isNaN(parseFloat(amount))) return [];
    const amtNum = parseFloat(amount);

    if (splitMethod === 'custom') {
      const customShares: Partial<MemberShare>[] = group.members.map(m =>
        customMode === 'amount'
          ? { memberId: m.id, amount: customAmounts[m.id] ?? 0 }
          : { memberId: m.id, percentage: customPercentages[m.id] ?? 0 }
      );
      return CalculationEngine.calculateShares(amtNum, group.members, splitMethod, customShares);
    }

    return CalculationEngine.calculateShares(amtNum, group.members, splitMethod);
  }, [group, amount, splitMethod, customMode, customPercentages, customAmounts]);

  if (!isOpen || !group) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];

    const amtNum = parseFloat(amount);
    const amtVal = ValidationService.validateExpenseAmount(amtNum);
    if (!amtVal.valid) newErrors.push(...amtVal.errors);

    if (!title.trim()) newErrors.push('Title is required.');

    if (splitMethod === 'custom') {
      if (customMode === 'percentage') {
        const pctsVal = ValidationService.validateCustomPercentages(Object.values(customPercentages));
        if (!pctsVal.valid) newErrors.push(...pctsVal.errors);
      } else {
        const amtsVal = ValidationService.validateCustomAmounts(Object.values(customAmounts), amtNum);
        if (!amtsVal.valid) newErrors.push(...amtsVal.errors);
      }
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    const expenseData = {
      groupId,
      title,
      amount: amtNum,
      paidBy,
      date: isEditing ? editingExpense!.date : new Date().toISOString().split('T')[0],
      category,
      splitMethod,
      shares: calculatedShares,
      notes: notes.trim() || undefined
    };

    try {
      if (isEditing) {
        await updateExpense(editingExpense!.id, expenseData);
      } else {
        await addExpense(expenseData);
      }
      onClose();
      setTitle('');
      setAmount('');
      setNotes('');
    } catch (err: any) {
      setErrors([err.message]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-scale-in">
        <div className="p-6 md:p-8 flex justify-between items-center border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-2xl font-bold">{isEditing ? 'Edit Expense' : 'Add Expense'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          {errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-4 rounded-2xl space-y-1">
              {errors.map((err, i) => (
                <p key={i} className="text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                  <span className="w-1 h-1 bg-red-600 rounded-full" />
                  {err}
                </p>
              ))}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">What was it for?</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  required
                  className="input-field pl-11"
                  placeholder="e.g. Dinner, Rent, Gas"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">How much?</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="number"
                  step="0.01"
                  required
                  className="input-field pl-11 text-lg font-bold"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Category</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select 
                  className="input-field pl-11 appearance-none cursor-pointer"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Notes (optional)</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <textarea
                className="input-field pl-11 resize-none"
                rows={2}
                placeholder="Add a note..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Who paid?</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select 
                  className="input-field pl-11 appearance-none cursor-pointer"
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                >
                  {group.members.map(m => (
                    <option key={m.id} value={m.id}>{m.displayName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Split Method</label>
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl">
                {(['equal', 'fairness', 'custom'] as SplitMethod[]).map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setSplitMethod(method)}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all capitalize ${
                      splitMethod === method 
                        ? 'bg-white dark:bg-slate-800 shadow-sm text-primary-600 dark:text-primary-400' 
                        : 'text-slate-500'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Info className="w-4 h-4 text-primary-500" />
                Split Preview
              </h3>
              {splitMethod === 'custom' && (
                <div className="flex bg-slate-200 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setCustomMode('percentage')}
                    className={`px-3 py-1 rounded-lg transition-all ${customMode === 'percentage' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-600 dark:text-primary-400' : 'text-slate-500'}`}
                  >
                    % Percent
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomMode('amount')}
                    className={`px-3 py-1 rounded-lg transition-all ${customMode === 'amount' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-600 dark:text-primary-400' : 'text-slate-500'}`}
                  >
                    $ Amount
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {group.members.map(member => {
                const share = calculatedShares.find(s => s.memberId === member.id);
                return (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{member.displayName}</span>
                      {splitMethod === 'fairness' && (
                        <span className="text-[10px] text-slate-500">Weight: {member.fairnessWeight}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {splitMethod === 'custom' && customMode === 'percentage' && (
                        <div className="relative w-20">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1 px-2 text-right text-sm w-full pr-5"
                            value={customPercentages[member.id] ?? 0}
                            onChange={(e) => setCustomPercentages({
                              ...customPercentages,
                              [member.id]: parseFloat(e.target.value) || 0
                            })}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">%</span>
                        </div>
                      )}
                      {splitMethod === 'custom' && customMode === 'amount' && (
                        <div className="relative w-24">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1 px-2 pl-5 text-right text-sm w-full"
                            value={customAmounts[member.id] ?? 0}
                            onChange={(e) => setCustomAmounts({
                              ...customAmounts,
                              [member.id]: parseFloat(e.target.value) || 0
                            })}
                          />
                        </div>
                      )}
                      <span className="text-sm font-bold w-16 text-right">
                        ${share?.amount.toFixed(2) ?? '0.00'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Running total for amount mode */}
            {splitMethod === 'custom' && customMode === 'amount' && (
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="text-xs text-slate-500">Total entered</span>
                {(() => {
                  const entered = Object.values(customAmounts).reduce((a, b) => a + b, 0);
                  const target = parseFloat(amount) || 0;
                  const diff = Number((target - entered).toFixed(2));
                  const ok = Math.abs(diff) <= 0.01;
                  return (
                    <span className={`text-sm font-bold ${ok ? 'text-emerald-500' : 'text-rose-500'}`}>
                      ${entered.toFixed(2)} / ${target.toFixed(2)}
                      {!ok && diff !== 0 && (
                        <span className="text-xs font-normal ml-1">
                          ({diff > 0 ? `$${diff.toFixed(2)} remaining` : `$${Math.abs(diff).toFixed(2)} over`})
                        </span>
                      )}
                    </span>
                  );
                })()}
              </div>
            )}
          </div>
        </form>

        <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-900/50 flex gap-4">
          <button onClick={onClose} className="btn-secondary flex-1 py-4">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="btn-primary flex-1 py-4 flex justify-center items-center gap-2"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : isEditing ? 'Save Changes' : 'Save Expense'}
          </button>
        </div>
      </div>
    </div>
  );
};
