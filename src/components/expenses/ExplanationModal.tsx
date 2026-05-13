import { X, Info, Scale, Users, Percent } from 'lucide-react';
import type { Expense, Member } from '../../types/index';
import { CalculationEngine } from '../../services/calculationEngine';

interface ExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense;
  members: Member[];
}

export const ExplanationModal: React.FC<ExplanationModalProps> = ({ isOpen, onClose, expense, members }) => {
  if (!isOpen) return null;

  const payer = members.find(m => m.id === expense.paidBy);
  const explanation = CalculationEngine.explainSplit(expense, members);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-scale-in">
        <div className="p-6 flex justify-between items-center border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold flex items-center gap-2">
            <Info className="w-5 h-5 text-primary-500" />
            Split Details
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Expense</div>
            <div className="text-xl font-black">{expense.title}</div>
            <div className="text-lg font-bold text-slate-700 dark:text-slate-300">${expense.amount.toFixed(2)}</div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-600 font-bold text-xs">
                {payer?.displayName[0]}
              </div>
              <div className="text-sm">
                <span className="font-bold">{payer?.displayName}</span> paid the full amount.
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
              "{explanation}"
            </p>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Member Breakdown</div>
            {expense.shares.map(share => {
              const member = members.find(m => m.id === share.memberId);
              return (
                <div key={share.memberId} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 dark:text-slate-400">{member?.displayName}</span>
                  <div className="flex items-center gap-2">
                    {expense.splitMethod === 'fairness' && <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">wt: {share.weight}</span>}
                    {expense.splitMethod === 'custom' && <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{share.percentage}%</span>}
                    <span className="font-bold">${share.amount.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-900/50">
          <button onClick={onClose} className="btn-primary w-full py-3 text-sm">Got it</button>
        </div>
      </div>
    </div>
  );
};
