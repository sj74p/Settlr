import React, { useState } from 'react';
import { X, Plus, Trash2, Users, Scale, Loader2, Mail, CheckCircle } from 'lucide-react';
import { useSettlrStore } from '../../stores/useSettlrStore';
import { ValidationService } from '../../services/validationService';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MemberDraft {
  displayName: string;
  fairnessWeight: number;
  email: string;
  userId: string | null;
  accountFound: boolean | null; // null = not searched
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose }) => {
  const { createGroup, lookupUserByEmail, isSaving } = useSettlrStore();
  const [name, setName] = useState('');
  const [members, setMembers] = useState<MemberDraft[]>([
    { displayName: '', fairnessWeight: 1, email: '', userId: null, accountFound: null }
  ]);
  const [errors, setErrors] = useState<string[]>([]);

  if (!isOpen) return null;

  const addMember = () => {
    setMembers([...members, { displayName: '', fairnessWeight: 1, email: '', userId: null, accountFound: null }]);
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, field: 'displayName' | 'fairnessWeight', value: string | number) => {
    const newMembers = [...members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setMembers(newMembers);
  };

  const handleEmailChange = (index: number, value: string) => {
    const newMembers = [...members];
    newMembers[index] = { ...newMembers[index], email: value, userId: null, accountFound: null };
    setMembers(newMembers);
  };

  const handleEmailBlur = async (index: number) => {
    const email = members[index].email.trim();
    if (!email) return;
    const result = await lookupUserByEmail(email);
    const newMembers = [...members];
    if (result) {
      newMembers[index] = {
        ...newMembers[index],
        userId: result.userId,
        accountFound: true,
        displayName: newMembers[index].displayName || result.displayName,
      };
    } else {
      newMembers[index] = { ...newMembers[index], userId: null, accountFound: false };
    }
    setMembers(newMembers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];

    // Validation
    const nameVal = ValidationService.validateGroupName(name);
    if (!nameVal.valid) newErrors.push(...nameVal.errors);

    const validMembers = members.filter(m => m.displayName.trim() !== '');
    if (validMembers.length < 2) {
      newErrors.push('At least 2 members are required.');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await createGroup(name, validMembers.map(m => ({
        displayName: m.displayName,
        fairnessWeight: m.fairnessWeight,
        userId: m.userId,
        isGuest: !m.userId,
      })));
      onClose();
      setName('');
      setMembers([{ displayName: '', fairnessWeight: 1, email: '', userId: null, accountFound: null }]);
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : String(err)]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-scale-in">
        <div className="p-6 md:p-8 flex justify-between items-center border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-2xl font-bold">Create New Group</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Set up your squad and fairness weights</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8 max-h-[70vh] overflow-y-auto">
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

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Group Name</label>
            <input
              type="text"
              required
              className="input-field text-lg py-4"
              placeholder="e.g. Ski Trip 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center ml-1">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Initial Members</label>
              <button 
                type="button" 
                onClick={addMember}
                className="text-primary-600 dark:text-primary-400 text-sm font-bold flex items-center gap-1 hover:underline"
              >
                <Plus className="w-4 h-4" /> Add Member
              </button>
            </div>

            <div className="space-y-4">
              {members.map((member, index) => (
                <div key={index} className="space-y-2 animate-slide-up">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        className="input-field pl-10"
                        placeholder="Name"
                        value={member.displayName}
                        onChange={(e) => updateMember(index, 'displayName', e.target.value)}
                      />
                    </div>
                    <div className="relative w-32">
                      <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        className="input-field pl-10"
                        placeholder="Weight"
                        value={member.fairnessWeight}
                        onChange={(e) => updateMember(index, 'fairnessWeight', parseFloat(e.target.value))}
                      />
                    </div>
                    {members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMember(index)}
                        className="p-3 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-1">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="email"
                        className="input-field pl-9 py-2 text-sm"
                        placeholder="Email to link account (optional)"
                        value={member.email}
                        onChange={(e) => handleEmailChange(index, e.target.value)}
                        onBlur={() => handleEmailBlur(index)}
                      />
                    </div>
                    {member.accountFound === true && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                        <CheckCircle className="w-3.5 h-3.5" /> Linked
                      </span>
                    )}
                    {member.accountFound === false && member.email && (
                      <span className="text-xs text-slate-400 whitespace-nowrap">Guest</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 italic ml-1">
              * Fairness weights allow some members to pay more or less by default (e.g. 1.5 vs 1.0).
            </p>
          </div>
        </form>

        <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-900/50 flex gap-4">
          <button onClick={onClose} className="btn-secondary flex-1 py-4">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="btn-primary flex-1 py-4 flex justify-center items-center gap-2"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};
