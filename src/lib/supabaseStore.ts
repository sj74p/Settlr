import { supabase } from './supabaseClient';
import type { DataStore } from './dataStore';
import type { Expense, Member } from '../types';

export const SupabaseStore: DataStore = {
  async fetchGroups() {
    const { data, error } = await supabase
      .from('groups')
      .select('*, group_members(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Map DB schema to our Domain Types
    return data.map(group => ({
      id: group.id,
      name: group.name,
      isArchived: group.is_archived ?? false,
      createdAt: group.created_at,
      createdBy: group.created_by,
      members: group.group_members.map((gm: any) => ({
        id: gm.id,
        groupId: gm.group_id,
        userId: gm.user_id,
        displayName: gm.display_name,
        fairnessWeight: Number(gm.fairness_weight),
        isGuest: gm.is_guest,
        joinedAt: gm.joined_at
      }))
    }));
  },

  async createGroup(name: string, members: Partial<Member>[]) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // 1. Create Group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert([{ name, created_by: user.id }])
      .select()
      .single();

    if (groupError) throw groupError;

    // 2. Add Members (Creator is usually handled by DB trigger or app logic, 
    // but here we'll add all provided members)
    const memberInserts = members.map(m => ({
      group_id: group.id,
      user_id: m.userId || null,
      display_name: m.displayName,
      fairness_weight: m.fairnessWeight || 1.0,
      is_guest: m.isGuest || false
    }));

    const { data: memberData, error: memberError } = await supabase
      .from('group_members')
      .insert(memberInserts)
      .select();

    if (memberError) throw memberError;

    return {
      ...group,
      members: memberData.map((gm: any) => ({
        id: gm.id,
        groupId: gm.group_id,
        userId: gm.user_id,
        displayName: gm.display_name,
        fairnessWeight: Number(gm.fairness_weight),
        isGuest: gm.is_guest,
        joinedAt: gm.joined_at
      }))
    };
  },

  async deleteGroup(id: string) {
    const { error } = await supabase.from('groups').delete().eq('id', id);
    if (error) throw error;
  },

  async archiveGroup(id: string) {
    const { error } = await supabase.from('groups').update({ is_archived: true }).eq('id', id);
    if (error) throw error;
  },

  async fetchGroupSummaries(groupIds: string[]) {
    if (groupIds.length === 0) return {};
    const { data, error } = await supabase
      .from('expenses')
      .select('group_id, amount')
      .in('group_id', groupIds);
    if (error) throw error;
    const summaries: Record<string, { totalSpent: number; expenseCount: number }> = {};
    (data ?? []).forEach(e => {
      if (!summaries[e.group_id]) summaries[e.group_id] = { totalSpent: 0, expenseCount: 0 };
      summaries[e.group_id].totalSpent += Number(e.amount);
      summaries[e.group_id].expenseCount += 1;
    });
    return summaries;
  },

  async fetchExpenses(groupId: string) {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, expense_shares(*)')
      .eq('group_id', groupId)
      .order('date', { ascending: false });

    if (error) throw error;

    return data.map(exp => ({
      id: exp.id,
      groupId: exp.group_id,
      title: exp.title,
      amount: Number(exp.amount),
      paidBy: exp.paid_by,
      date: exp.date,
      category: exp.category,
      splitMethod: exp.split_method,
      notes: exp.notes ?? undefined,
      createdAt: exp.created_at,
      shares: exp.expense_shares.map((s: any) => ({
        memberId: s.member_id,
        amount: Number(s.amount),
        weight: s.weight ? Number(s.weight) : undefined,
        percentage: s.percentage ? Number(s.percentage) : undefined
      }))
    }));
  },

  async createExpense(expense) {
    // 1. Insert Expense
    const { data: exp, error: expError } = await supabase
      .from('expenses')
      .insert([{
        group_id: expense.groupId,
        title: expense.title,
        amount: expense.amount,
        paid_by: expense.paidBy,
        date: expense.date,
        category: expense.category,
        split_method: expense.splitMethod,
        notes: expense.notes ?? null
      }])
      .select()
      .single();

    if (expError) throw expError;

    // 2. Insert Shares
    const shareInserts = expense.shares.map(s => ({
      expense_id: exp.id,
      member_id: s.memberId,
      amount: s.amount,
      weight: s.weight,
      percentage: s.percentage
    }));

    const { error: shareError } = await supabase
      .from('expense_shares')
      .insert(shareInserts);

    if (shareError) throw shareError;

    return { ...expense, id: exp.id, createdAt: exp.created_at };
  },

  async deleteExpense(id: string) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
  },

  async fetchSettlements(groupId: string) {
    const { data, error } = await supabase
      .from('settlements')
      .select('*')
      .eq('group_id', groupId)
      .order('date', { ascending: false });

    if (error) throw error;

    return data.map(s => ({
      id: s.id,
      groupId: s.group_id,
      fromMember: s.from_member,
      toMember: s.to_member,
      amount: Number(s.amount),
      date: s.date,
      note: s.note,
      createdAt: s.created_at
    }));
  },

  async createSettlement(s) {
    const { data, error } = await supabase
      .from('settlements')
      .insert([{
        group_id: s.groupId,
        from_member: s.fromMember,
        to_member: s.toMember,
        amount: s.amount,
        date: s.date,
        note: s.note
      }])
      .select()
      .single();

    if (error) throw error;

    return { ...s, id: data.id, createdAt: data.created_at };
  },

  async deleteSettlement(id: string) {
    const { error } = await supabase.from('settlements').delete().eq('id', id);
    if (error) throw error;
  },

  async addMember(groupId: string, member: Partial<Member>) {
    const { data, error } = await supabase
      .from('group_members')
      .insert([{
        group_id: groupId,
        user_id: member.userId || null,
        display_name: member.displayName,
        fairness_weight: member.fairnessWeight || 1.0,
        is_guest: member.isGuest || false
      }])
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      groupId: data.group_id,
      userId: data.user_id,
      displayName: data.display_name,
      fairnessWeight: Number(data.fairness_weight),
      isGuest: data.is_guest,
      joinedAt: data.joined_at
    };
  },

  async updateMember(id: string, member: Partial<Member>) {
    const { data, error } = await supabase
      .from('group_members')
      .update({
        display_name: member.displayName,
        fairness_weight: member.fairnessWeight,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      groupId: data.group_id,
      userId: data.user_id,
      displayName: data.display_name,
      fairnessWeight: Number(data.fairness_weight),
      isGuest: data.is_guest,
      joinedAt: data.joined_at
    };
  },

  async updateExpense(id: string, expense: Omit<Expense, 'id' | 'createdAt'>) {
    const { data, error } = await supabase
      .from('expenses')
      .update({
        title: expense.title,
        amount: expense.amount,
        paid_by: expense.paidBy,
        date: expense.date,
        category: expense.category,
        split_method: expense.splitMethod,
        notes: expense.notes ?? null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Replace shares atomically
    const { error: delError } = await supabase.from('expense_shares').delete().eq('expense_id', id);
    if (delError) throw delError;

    const { error: shareError } = await supabase.from('expense_shares').insert(
      expense.shares.map(s => ({
        expense_id: id,
        member_id: s.memberId,
        amount: s.amount,
        weight: s.weight ?? null,
        percentage: s.percentage ?? null,
      }))
    );
    if (shareError) throw shareError;

    return { ...expense, id, createdAt: data.created_at };
  }
};
