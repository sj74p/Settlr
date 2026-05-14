import type { Group, Expense, Settlement, Member } from '../types';

/**
 * Repository Pattern: Abstract Data Access
 * This allows us to swap Supabase for another store (like LocalStorage)
 * in Phase 2 for offline mode support.
 */
export interface DataStore {
  // Groups
  fetchGroups(): Promise<Group[]>;
  createGroup(name: string, members: Partial<Member>[]): Promise<Group>;
  deleteGroup(id: string): Promise<void>;
  archiveGroup(id: string): Promise<void>;
  fetchGroupSummaries(groupIds: string[]): Promise<Record<string, { totalSpent: number; expenseCount: number }>>;

  // Expenses
  fetchExpenses(groupId: string): Promise<Expense[]>;
  createExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense>;
  updateExpense(id: string, expense: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense>;
  deleteExpense(id: string): Promise<void>;

  // Settlements
  fetchSettlements(groupId: string): Promise<Settlement[]>;
  createSettlement(settlement: Omit<Settlement, 'id' | 'createdAt'>): Promise<Settlement>;
  deleteSettlement(id: string): Promise<void>;

  // Members
  addMember(groupId: string, member: Partial<Member>): Promise<Member>;
  updateMember(id: string, member: Partial<Member>): Promise<Member>;
  removeMember(memberId: string): Promise<void>;
  lookupUserByEmail(email: string): Promise<{ userId: string; displayName: string } | null>;
}
