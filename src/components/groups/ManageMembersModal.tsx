import React, { useState } from 'react';
import { X, Mail, UserPlus, Trash2, Scale, Loader2, CheckCircle, UserX, Shield } from 'lucide-react';
import { useSettlrStore } from '../../stores/useSettlrStore';
import type { Member } from '../../types';

interface ManageMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
}

type LookupState = 'idle' | 'loading' | 'found' | 'not-found';

export const ManageMembersModal: React.FC<ManageMembersModalProps> = ({ isOpen, onClose, groupId }) => {
  const { groups, expenses, settlements, addMember, removeMember, lookupUserByEmail, isSaving } = useSettlrStore();
  const group = groups.find(g => g.id === groupId);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [weight, setWeight] = useState(1);
  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const [foundUserId, setFoundUserId] = useState<string | null>(null);

  if (!isOpen || !group) return null;

  const memberHasActivity = (member: Member) =>
    expenses.some(e => e.paidBy === member.id || e.shares.some(s => s.memberId === member.id)) ||
    settlements.some(s => s.fromMember === member.id || s.toMember === member.id);

  const handleEmailSearch = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setLookupState('loading');
    const result = await lookupUserByEmail(trimmed);
    if (result) {
      setFoundUserId(result.userId);
      if (!name) setName(result.displayName);
      setLookupState('found');
    } else {
      setFoundUserId(null);
      setLookupState('not-found');
    }
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    setLookupState('idle');
    setFoundUserId(null);
  };

  const handleAdd = async () => {
    const displayName = name.trim();
    if (!displayName) return;
    await addMember(groupId, {
      displayName,
      fairnessWeight: weight,
      userId: foundUserId,
      isGuest: !foundUserId,
    });
    setEmail('');
    setName('');
    setWeight(1);
    setLookupState('idle');
    setFoundUserId(null);
  };

  const handleRemove = async (member: Member) => {
    if (memberHasActivity(member)) {
      window.alert(`Cannot remove ${member.displayName} — they have existing expenses or settlements. Delete those first.`);
      return;
    }
    if (window.confirm(`Remove ${member.displayName} from "${group.name}"?`)) {
      await removeMember(groupId, member.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-6 flex justify-between items-center border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold">Manage Members</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{group.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Current Members */}
          <div className="space-y-2">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Current Members ({group.members.length})</p>
            <div className="space-y-2">
              {group.members.map(member => {
                const hasActivity = memberHasActivity(member);
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                        {member.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{member.displayName}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          member.isGuest
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        }`}>
                          {member.isGuest ? 'GUEST' : (
                            <span className="flex items-center gap-1"><Shield className="w-2.5 h-2.5" /> ACCOUNT</span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400">weight {member.fairnessWeight}×</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(member)}
                      title={hasActivity ? 'Has expenses — delete expenses first' : 'Remove member'}
                      className={`p-2 rounded-xl transition-colors ${
                        hasActivity
                          ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                          : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20'
                      }`}
                    >
                      {hasActivity ? <UserX className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Member */}
          <div className="space-y-3 border-t border-slate-100 dark:border-slate-700 pt-6">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Add Member
            </p>

            {/* Email lookup */}
            <div className="space-y-1">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    className="input-field pl-10 text-sm"
                    placeholder="Search by email (optional)"
                    value={email}
                    onChange={e => handleEmailChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleEmailSearch()}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleEmailSearch}
                  disabled={!email.trim() || lookupState === 'loading'}
                  className="btn-secondary px-4 text-sm shrink-0"
                >
                  {lookupState === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </button>
              </div>

              {lookupState === 'found' && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 ml-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Account found — name pre-filled below
                </p>
              )}
              {lookupState === 'not-found' && email && (
                <p className="text-xs text-slate-400 ml-1">No Settlr account found — will be added as a guest</p>
              )}
            </div>

            {/* Name + Weight */}
            <div className="flex gap-2">
              <input
                type="text"
                className="input-field text-sm flex-1"
                placeholder="Display name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <div className="relative w-28">
                <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  className="input-field pl-9 text-sm"
                  placeholder="Weight"
                  value={weight}
                  onChange={e => setWeight(parseFloat(e.target.value) || 1)}
                />
              </div>
            </div>

            <button
              onClick={handleAdd}
              disabled={!name.trim() || isSaving}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {lookupState === 'found' ? 'Add Linked Account' : 'Add as Guest'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
