import type { User, Session } from '@supabase/supabase-js';

export type { User, Session };

/**
 * Domain Types for Settlr
 */

export type FairnessWeight = number; // Positive number, default 1
export type SplitMethod = 'equal' | 'fairness' | 'custom';
export type ExpenseCategory =
  | 'Food'
  | 'Transport'
  | 'Entertainment'
  | 'Utilities'
  | 'Shopping'
  | 'Travel'
  | 'Health'
  | 'Other';

export interface Member {
  id: string; // UUID from group_members table
  groupId: string;
  userId: string | null; // null for Guest members
  displayName: string;
  fairnessWeight: FairnessWeight;
  isGuest: boolean;
  joinedAt: string;
}

export interface MemberShare {
  memberId: string; // Refers to Member.id (group_member UUID)
  amount: number;
  weight?: number; // Per-expense weight override
  percentage?: number; // For custom splits
}

export type Expense = {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  paidBy: string; // Member.id
  date: string;
  category: ExpenseCategory;
  splitMethod: SplitMethod;
  shares: MemberShare[];
  notes?: string;
  createdAt: string;
}

export interface Settlement {
  id: string;
  groupId: string;
  fromMember: string; // Member.id
  toMember: string; // Member.id
  amount: number;
  date: string;
  note?: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  members: Member[];
  isArchived: boolean;
  createdAt: string;
  createdBy: string; // Supabase User ID
}

export interface Balance {
  memberId: string;
  displayName: string;
  netBalance: number; // Positive = creditor, Negative = debtor
}

export interface SimplifiedDebt {
  from: string; // Member ID
  to: string; // Member ID
  amount: number;
}

/**
 * Zustand Store Types
 */
export interface AppState {
  // Auth
  user: User | null;
  session: Session | null;

  // Data
  groups: Group[];
  activeGroupId: string | null;
  expenses: Expense[];
  settlements: Settlement[];
  groupSummaries: Record<string, { totalSpent: number; expenseCount: number }>;

  // UI State
  isLoading: boolean;
  isSaving: boolean;
  showArchivedGroups: boolean;
  error: string | null;
}
