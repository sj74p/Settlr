import type { Member, Expense, Settlement, MemberShare, SplitMethod, Balance } from '../types';

/**
 * CalculationEngine: Pure mathematical logic for Settlr
 */
export const CalculationEngine = {
  /**
   * Calculate member shares based on the selected split method
   */
  calculateShares(
    amount: number,
    members: Member[],
    splitMethod: SplitMethod,
    customShares: Partial<MemberShare>[] = []
  ): MemberShare[] {
    if (amount <= 0 || members.length === 0) return [];

    switch (splitMethod) {
      case 'equal': {
        const shareAmount = Number((amount / members.length).toFixed(2));
        const shares = members.map(m => ({ memberId: m.id, amount: shareAmount }));
        
        // Adjust for rounding errors
        return this.adjustForRounding(shares, amount);
      }

      case 'fairness': {
        const totalWeight = members.reduce((sum, m) => sum + m.fairnessWeight, 0);
        const shares = members.map(m => ({
          memberId: m.id,
          amount: Number(((m.fairnessWeight / totalWeight) * amount).toFixed(2)),
          weight: m.fairnessWeight
        }));
        
        return this.adjustForRounding(shares, amount);
      }

      case 'custom': {
        // Supports two sub-modes:
        // - percentage mode: customShares has { memberId, percentage }
        // - amount mode:     customShares has { memberId, amount } (no percentage key)
        const shares = members.map(m => {
          const cs = customShares.find(c => c.memberId === m.id);
          if (cs?.percentage !== undefined) {
            return {
              memberId: m.id,
              amount: Number(((cs.percentage / 100) * amount).toFixed(2)),
              percentage: cs.percentage
            };
          }
          const directAmt = cs?.amount ?? 0;
          return { memberId: m.id, amount: Number(directAmt.toFixed(2)) };
        });
        return this.adjustForRounding(shares, amount);
      }

      default:
        return [];
    }
  },

  /**
   * Calculate net balances for all members (Paid - Owed)
   */
  calculateBalances(
    members: Member[],
    expenses: Expense[],
    settlements: Settlement[]
  ): Balance[] {
    const balances: Record<string, number> = {};
    
    // Initialize
    members.forEach(m => {
      balances[m.id] = 0;
    });

    // Add amounts paid by members
    expenses.forEach(exp => {
      if (balances[exp.paidBy] !== undefined) {
        balances[exp.paidBy] += exp.amount;
      }
      
      // Subtract member shares (what they owe)
      exp.shares.forEach(share => {
        if (balances[share.memberId] !== undefined) {
          balances[share.memberId] -= share.amount;
        }
      });
    });

    // Adjust for settlements
    settlements.forEach(s => {
      if (balances[s.fromMember] !== undefined) {
        balances[s.fromMember] += s.amount; // Reduced debt
      }
      if (balances[s.toMember] !== undefined) {
        balances[s.toMember] -= s.amount; // Received payment
      }
    });

    return members.map(m => ({
      memberId: m.id,
      displayName: m.displayName,
      netBalance: Number(balances[m.id].toFixed(2))
    }));
  },

  /**
   * Generate a step-by-step explanation for the UI
   */
  explainSplit(expense: Expense, members: Member[]): string {
    const { amount, splitMethod, shares } = expense;
    
    switch (splitMethod) {
      case 'equal':
        return `Total $${amount.toFixed(2)} split equally among ${members.length} members. Each pays $${shares[0]?.amount.toFixed(2)}.`;
      
      case 'fairness': {
        const totalWeight = members.reduce((sum, m) => sum + m.fairnessWeight, 0);
        return `Split by fairness weights (Total weight: ${totalWeight}). Each member pays based on their share of the total weight.`;
      }
      
      case 'custom':
        return `Split using custom percentages defined for each member.`;
      
      default:
        return '';
    }
  },

  /**
   * Adjust shares to ensure they sum perfectly to the total amount
   * (Handles the "lost penny" problem)
   */
  adjustForRounding(shares: MemberShare[], totalAmount: number): MemberShare[] {
    const currentSum = shares.reduce((sum, s) => sum + s.amount, 0);
    const difference = Number((totalAmount - currentSum).toFixed(2));
    
    if (difference === 0) return shares;

    // Apply the difference to the first member (or largest share)
    const newShares = [...shares];
    if (newShares.length > 0) {
      newShares[0].amount = Number((newShares[0].amount + difference).toFixed(2));
    }
    
    return newShares;
  },

  /**
   * Invariant Check: Sum of shares must equal total
   */
  validateShareSum(shares: MemberShare[], totalAmount: number): boolean {
    const sum = shares.reduce((s, share) => s + share.amount, 0);
    return Math.abs(sum - totalAmount) < 0.01;
  }
};
