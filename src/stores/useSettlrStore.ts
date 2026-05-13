import { create } from 'zustand';
import type { AppState, Expense, Settlement, Member, User, Session } from '../types/index';
import { SupabaseStore } from '../lib/supabaseStore';
import { supabase } from '../lib/supabaseClient';
import { logger } from '../services/loggerService';
import { toast } from 'react-hot-toast';

// Tracks IDs of optimistically-added items so silent realtime reloads don't discard them
const optimisticExpenseIds = new Set<string>();
const optimisticSettlementIds = new Set<string>();

interface SettlrActions {
  // Auth
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;

  // Groups
  loadGroups: () => Promise<void>;
  setActiveGroup: (groupId: string | null) => void;
  createGroup: (name: string, members: Partial<Member>[]) => Promise<void>;
  archiveGroup: (groupId: string) => Promise<void>;
  toggleShowArchived: () => void;

  // Expenses
  loadExpenses: (groupId: string, silent?: boolean) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  updateExpense: (expenseId: string, expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;

  // Settlements
  loadSettlements: (groupId: string, silent?: boolean) => Promise<void>;
  addSettlement: (settlement: Omit<Settlement, 'id' | 'createdAt'>) => Promise<void>;
  deleteSettlement: (settlementId: string) => Promise<void>;

  // Real-time
  subscribeToGroup: (groupId: string) => () => void;
}

export const useSettlrStore = create<AppState & SettlrActions>((set, get) => ({
  // Initial State
  user: null,
  session: null,
  groups: [],
  activeGroupId: null,
  expenses: [],
  settlements: [],
  groupSummaries: {},
  isLoading: false,
  isSaving: false,
  showArchivedGroups: false,
  error: null,

  // Auth Actions
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),

  // Group Actions
  loadGroups: async () => {
    logger.startTrace();
    logger.info('Fetching all groups');
    set({ isLoading: true, error: null });
    try {
      const groups = await SupabaseStore.fetchGroups();
      const groupSummaries = await SupabaseStore.fetchGroupSummaries(groups.map(g => g.id));
      set({ groups, groupSummaries, isLoading: false });
      logger.info('Successfully loaded groups', { count: groups.length });
    } catch (error: any) {
      logger.error('Failed to load groups', error);
      set({ error: error.message, isLoading: false });
    } finally {
      logger.endTrace();
    }
  },

  setActiveGroup: (groupId) => set({ activeGroupId: groupId }),

  archiveGroup: async (groupId) => {
    const originalGroups = get().groups;
    set(state => ({
      isSaving: true,
      groups: state.groups.map(g => g.id === groupId ? { ...g, isArchived: true } : g)
    }));
    try {
      await SupabaseStore.archiveGroup(groupId);
      toast.success('Group archived');
    } catch (error: any) {
      logger.error('Failed to archive group', error);
      toast.error('Failed to archive group');
      set({ groups: originalGroups });
    } finally {
      set({ isSaving: false });
    }
  },

  toggleShowArchived: () => set(state => ({ showArchivedGroups: !state.showArchivedGroups })),

  createGroup: async (name, members) => {
    set({ isSaving: true, error: null });
    try {
      const newGroup = await SupabaseStore.createGroup(name, members);
      set((state) => ({
        groups: [newGroup, ...state.groups],
      }));
      toast.success('Group created!');
    } catch (error: any) {
      toast.error('Failed to create group');
      set({ error: error.message });
    } finally {
      set({ isSaving: false });
    }
  },

  // Expense Actions
  loadExpenses: async (groupId, silent = false) => {
    if (!silent) {
      logger.startTrace();
      logger.info('Fetching expenses for group', { groupId });
      set({ isLoading: true, error: null });
    }
    try {
      const serverExpenses = await SupabaseStore.fetchExpenses(groupId);
      set((state) => {
        // Preserve any optimistic items not yet confirmed by the server
        const optimistic = state.expenses.filter(e => optimisticExpenseIds.has(e.id));
        return { expenses: [...optimistic, ...serverExpenses], isLoading: false };
      });
      if (!silent) logger.info('Successfully loaded expenses', { count: serverExpenses.length });
    } catch (error: any) {
      if (!silent) logger.error('Failed to load expenses', error);
      set({ error: error.message, isLoading: false });
    } finally {
      if (!silent) logger.endTrace();
    }
  },

  addExpense: async (expense) => {
    logger.startTrace();
    logger.info('Adding new expense', { title: expense.title, amount: expense.amount });

    const tempId = crypto.randomUUID();
    const optimisticExpense: Expense = {
      ...expense,
      id: tempId,
      createdAt: new Date().toISOString()
    };

    // 1. Register optimistic ID before touching state so realtime reloads preserve it
    optimisticExpenseIds.add(tempId);
    set((state) => ({
      isSaving: true,
      expenses: [optimisticExpense, ...state.expenses]
    }));

    try {
      const newExpense = await SupabaseStore.createExpense(expense);
      logger.info('Expense saved successfully to Supabase');
      toast.success('Expense saved!');
      optimisticExpenseIds.delete(tempId);
      // 2. Replace temp with real data
      set((state) => ({
        expenses: state.expenses.map(e => e.id === tempId ? newExpense : e)
      }));
    } catch (error: any) {
      logger.error('Error saving expense', error);
      toast.error('Failed to sync expense');
      optimisticExpenseIds.delete(tempId);
      // 3. Rollback
      set((state) => ({
        expenses: state.expenses.filter(e => e.id !== tempId),
        error: `Failed to save expense: ${error.message}`
      }));
    } finally {
      set({ isSaving: false });
      logger.endTrace();
    }
  },

  updateExpense: async (expenseId, expense) => {
    logger.startTrace();
    logger.info('Updating expense', { expenseId });
    const originalExpenses = get().expenses;
    const original = originalExpenses.find(e => e.id === expenseId);
    if (!original) return;

    set(state => ({
      isSaving: true,
      expenses: state.expenses.map(e => e.id === expenseId ? { ...original, ...expense, id: expenseId } : e)
    }));

    try {
      const updated = await SupabaseStore.updateExpense(expenseId, expense);
      set(state => ({
        expenses: state.expenses.map(e => e.id === expenseId ? updated : e)
      }));
      toast.success('Expense updated!');
    } catch (error: any) {
      logger.error('Error updating expense', error);
      toast.error('Failed to update expense');
      set({ expenses: originalExpenses });
    } finally {
      set({ isSaving: false });
      logger.endTrace();
    }
  },

  deleteExpense: async (expenseId) => {
    logger.startTrace();
    logger.info('Deleting expense', { expenseId });
    
    // Save original for rollback
    const originalExpenses = get().expenses;

    // 1. Optimistic Update
    set((state) => ({
      expenses: state.expenses.filter(e => e.id !== expenseId)
    }));

    try {
      await SupabaseStore.deleteExpense(expenseId);
      logger.info('Expense deleted successfully');
      toast.success('Expense removed');
    } catch (error: any) {
      logger.error('Error deleting expense', error);
      toast.error('Failed to delete expense');
      // 2. Rollback
      set({ expenses: originalExpenses });
    } finally {
      logger.endTrace();
    }
  },

  // Settlement Actions
  loadSettlements: async (groupId, silent = false) => {
    if (!silent) {
      logger.startTrace();
      logger.info('Fetching settlements for group', { groupId });
      set({ isLoading: true, error: null });
    }
    try {
      const serverSettlements = await SupabaseStore.fetchSettlements(groupId);
      set((state) => {
        const optimistic = state.settlements.filter(s => optimisticSettlementIds.has(s.id));
        return { settlements: [...optimistic, ...serverSettlements], isLoading: false };
      });
      if (!silent) logger.info('Successfully loaded settlements', { count: serverSettlements.length });
    } catch (error: any) {
      if (!silent) logger.error('Failed to load settlements', error);
      set({ error: error.message, isLoading: false });
    } finally {
      if (!silent) logger.endTrace();
    }
  },

  addSettlement: async (settlement) => {
    logger.startTrace();
    logger.info('Recording settlement', { amount: settlement.amount });

    const tempId = crypto.randomUUID();
    const optimisticSettlement: Settlement = {
      ...settlement,
      id: tempId,
      createdAt: new Date().toISOString()
    };

    optimisticSettlementIds.add(tempId);
    set((state) => ({
      isSaving: true,
      settlements: [optimisticSettlement, ...state.settlements]
    }));

    try {
      const newSettlement = await SupabaseStore.createSettlement(settlement);
      logger.info('Settlement saved successfully');
      toast.success('Settlement recorded!');
      optimisticSettlementIds.delete(tempId);
      set((state) => ({
        settlements: state.settlements.map(s => s.id === tempId ? newSettlement : s)
      }));
    } catch (error: any) {
      logger.error('Error saving settlement', error);
      toast.error('Failed to sync settlement');
      optimisticSettlementIds.delete(tempId);
      set((state) => ({
        settlements: state.settlements.filter(s => s.id !== tempId),
        error: `Failed to save settlement: ${error.message}`
      }));
    } finally {
      set({ isSaving: false });
      logger.endTrace();
    }
  },

  deleteSettlement: async (settlementId) => {
    logger.startTrace();
    logger.info('Deleting settlement', { settlementId });
    
    // Save original for rollback
    const originalSettlements = get().settlements;

    // 1. Optimistic Update
    set((state) => ({
      settlements: state.settlements.filter(s => s.id !== settlementId)
    }));

    try {
      await SupabaseStore.deleteSettlement(settlementId);
      logger.info('Settlement deleted successfully');
      toast.success('Settlement removed');
    } catch (error: any) {
      logger.error('Error deleting settlement', error);
      toast.error('Failed to delete settlement');
      // 2. Rollback
      set({ settlements: originalSettlements });
    } finally {
      logger.endTrace();
    }
  },

  subscribeToGroup: (groupId) => {
    // 1. Subscribe to Expenses
    const expenseSub = supabase
      .channel(`expenses:${groupId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'expenses', 
        filter: `group_id=eq.${groupId}` 
      }, () => {
        get().loadExpenses(groupId, true);
      })
      .subscribe();

    // 2. Subscribe to Settlements
    const settlementSub = supabase
      .channel(`settlements:${groupId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'settlements',
        filter: `group_id=eq.${groupId}`
      }, () => {
        get().loadSettlements(groupId, true);
      })
      .subscribe();

    // Return cleanup function
    return () => {
      expenseSub.unsubscribe();
      settlementSub.unsubscribe();
    };
  }
}));
