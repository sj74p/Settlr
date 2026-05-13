import type { Balance, SimplifiedDebt } from '../types';

/**
 * DebtSimplifier: Reduces the number of transactions using a greedy algorithm
 */
const EPSILON = 0.005;

export const DebtSimplifier = {
  /**
   * Simplifies debts between members
   * Logic:
   * 1. Separate members into Creditors (positive balance) and Debtors (negative balance)
   * 2. Sort both lists (largest creditor first, largest debtor first)
   * 3. Match the largest debtor with the largest creditor iteratively
   */
  simplify(balances: Balance[]): SimplifiedDebt[] {
    // 1. Separate and filter out zero balances
    const creditors = balances
      .filter(b => b.netBalance > EPSILON)
      .sort((a, b) => b.netBalance - a.netBalance);

    const debtors = balances
      .filter(b => b.netBalance < -EPSILON)
      .map(d => ({ ...d, netBalance: Math.abs(d.netBalance) }))
      .sort((a, b) => b.netBalance - a.netBalance);

    const transactions: SimplifiedDebt[] = [];

    // 2. Greedy Matching
    let cIdx = 0;
    let dIdx = 0;

    while (cIdx < creditors.length && dIdx < debtors.length) {
      const creditor = creditors[cIdx];
      const debtor = debtors[dIdx];

      // Amount to settle is the minimum of what's owed and what's due
      const amount = Math.min(creditor.netBalance, debtor.netBalance);

      if (amount > 0) {
        transactions.push({
          from: debtor.memberId,
          to: creditor.memberId,
          amount: Number(amount.toFixed(2))
        });
      }

      // Update remaining balances
      creditor.netBalance -= amount;
      debtor.netBalance -= amount;

      // Move to next if fully settled
      if (creditor.netBalance < EPSILON) cIdx++;
      if (debtor.netBalance < EPSILON) dIdx++;
    }

    return transactions;
  }
};
