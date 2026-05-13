import React, { useState, useEffect } from 'react';
import { X, DollarSign, Loader2, ArrowRight, CheckCircle } from 'lucide-react';
import { useSettlrStore } from '../../stores/useSettlrStore';
import { ValidationService } from '../../services/validationService';
import type { SimplifiedDebt } from '../../types/index';

interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  suggestions?: SimplifiedDebt[];
}

export const SettleUpModal: React.FC<SettleUpModalProps> = ({ isOpen, onClose, groupId, suggestions = [] }) => {
  const { groups, addSettlement, isSaving } = useSettlrStore();
  const group = groups.find(g => g.id === groupId);

  const [amount, setAmount] = useState<string>('');
  const [fromMember, setFromMember] = useState('');
  const [toMember, setToMember] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) setErrors([]);
  }, [isOpen]);

  useEffect(() => {
    if (group && group.members.length >= 2) {
      setFromMember(group.members[0].id);
      setToMember(group.members[1].id);
    }
  }, [group?.id, group?.members.length]);

  if (!isOpen || !group) return null;

  const memberName = (id: string) => group.members.find(m => m.id === id)?.displayName ?? 'Unknown';

  const applySuggestion = (s: SimplifiedDebt) => {
    setFromMember(s.from);
    setToMember(s.to);
    setAmount(s.amount.toFixed(2));
    setErrors([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amtNum = parseFloat(amount);
    const val = ValidationService.validateSettlement(amtNum, fromMember, toMember);
    if (!val.valid) {
      setErrors(val.errors);
      return;
    }

    try {
      await addSettlement({
        groupId,
        fromMember,
        toMember,
        amount: amtNum,
        date: new Date().toISOString().split('T')[0],
        note
      });
      onClose();
      setAmount('');
      setNote('');
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : String(err)]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-scale-in">
        <div className="p-6 md:p-8 flex justify-between items-center border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-2xl font-bold">Record Settlement</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Mark a payment as made</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          {errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-4 rounded-2xl">
              {errors.map((err, i) => (
                <p key={i} className="text-red-600 dark:text-red-400 text-sm">{err}</p>
              ))}
            </div>
          )}

          {/* Suggested settlements */}
          {suggestions.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Suggested — tap to pre-fill
              </p>
              {suggestions.map((s, i) => {
                const isActive = fromMember === s.from && toMember === s.to && amount === s.amount.toFixed(2);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applySuggestion(s)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700'
                    }`}
                  >
                    <span className="font-semibold text-sm text-rose-500 flex-1 truncate">{memberName(s.from)}</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-bold text-sm bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-lg shrink-0">
                      ${s.amount.toFixed(2)}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-semibold text-sm text-emerald-500 flex-1 truncate text-right">{memberName(s.to)}</span>
                    {isActive && <CheckCircle className="w-4 h-4 text-primary-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Manual form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {suggestions.length > 0 ? 'Or enter manually' : 'Payment details'}
            </p>

            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl">
              <div className="flex flex-col items-center flex-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase mb-2">From</span>
                <select
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold p-2 w-full text-center"
                  value={fromMember}
                  onChange={(e) => setFromMember(e.target.value)}
                >
                  {group.members.map(m => (
                    <option key={m.id} value={m.id}>{m.displayName}</option>
                  ))}
                </select>
              </div>

              <ArrowRight className="w-5 h-5 text-slate-400 mt-5 shrink-0" />

              <div className="flex flex-col items-center flex-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase mb-2">To</span>
                <select
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold p-2 w-full text-center"
                  value={toMember}
                  onChange={(e) => setToMember(e.target.value)}
                >
                  {group.members.map(m => (
                    <option key={m.id} value={m.id}>{m.displayName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="input-field pl-11 text-xl font-bold text-emerald-500"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Note (optional)</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Paid via Venmo"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </form>
        </div>

        <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-900/50 flex gap-4">
          <button onClick={onClose} className="btn-secondary flex-1 py-4">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="btn-primary flex-1 py-4 flex justify-center items-center gap-2"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};
