import { SupabaseStore } from './supabaseStore';
import { CalculationEngine } from '../services/calculationEngine';

/**
 * Seeding Service: Populates the Supabase DB with realistic test data.
 * This should be called after a user is authenticated.
 */
export const seedMockData = async () => {
  try {
    console.log('Seeding mock data...');

    // 1. Create "Roommates" Group
    const group1 = await SupabaseStore.createGroup('Roommates', [
      { displayName: 'Alice', fairnessWeight: 1.0, isGuest: true },
      { displayName: 'Bob', fairnessWeight: 1.0, isGuest: true },
      { displayName: 'Charlie', fairnessWeight: 2.0, isGuest: true },
    ]);

    const alice = group1.members.find(m => m.displayName === 'Alice')!;
    const bob = group1.members.find(m => m.displayName === 'Bob')!;

    // 2. Add Expenses for Roommates
    // - Groceries ($120, Paid by Alice, Equal)
    const exp1Shares = CalculationEngine.calculateShares(120, group1.members, 'equal');
    await SupabaseStore.createExpense({
      groupId: group1.id,
      title: 'Groceries',
      amount: 120,
      paidBy: alice.id,
      date: '2024-03-15', // March
      category: 'Food',
      splitMethod: 'equal',
      shares: exp1Shares
    });

    // - Internet ($60, Paid by Bob, Fairness)
    const exp2Shares = CalculationEngine.calculateShares(60, group1.members, 'fairness');
    await SupabaseStore.createExpense({
      groupId: group1.id,
      title: 'Internet Bill',
      amount: 60,
      paidBy: bob.id,
      date: '2024-04-10', // April
      category: 'Utilities',
      splitMethod: 'fairness',
      shares: exp2Shares
    });

    // 3. Create "Weekend Trip" Group
    const group2 = await SupabaseStore.createGroup('Weekend Trip', [
      { displayName: 'Dana', fairnessWeight: 1.0, isGuest: true },
      { displayName: 'Eve', fairnessWeight: 0.5, isGuest: true },
      { displayName: 'Frank', fairnessWeight: 1.0, isGuest: true },
    ]);

    const dana = group2.members.find(m => m.displayName === 'Dana')!;

    // - Airbnb ($400, Paid by Dana, Fairness)
    const exp3Shares = CalculationEngine.calculateShares(400, group2.members, 'fairness');
    await SupabaseStore.createExpense({
      groupId: group2.id,
      title: 'Airbnb',
      amount: 400,
      paidBy: dana.id,
      date: '2024-05-01', // May
      category: 'Travel',
      splitMethod: 'fairness',
      shares: exp3Shares
    });

    console.log('Seeding complete!');
  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  }
};
