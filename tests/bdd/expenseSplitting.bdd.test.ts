/**
 * BDD: Expense Splitting Behaviors
 * Covers user-facing scenarios for the three split methods and the notes/edit features.
 */
import { describe, it, expect } from 'vitest';
import { CalculationEngine } from '../../src/services/calculationEngine';
import { ValidationService } from '../../src/services/validationService';
import type { Member, MemberShare } from '../../src/types';

const member = (id: string, name: string, weight = 1): Member => ({
  id, displayName: name, fairnessWeight: weight,
  groupId: 'g1', userId: null, isGuest: false, joinedAt: ''
});

// ---------------------------------------------------------------------------
describe('Feature: Equal Split', () => {
  describe('Scenario: Three friends split a dinner bill evenly', () => {
    it('Given $90 and 3 members, when split equally, each member owes $30', () => {
      const members = [member('a', 'Alice'), member('b', 'Bob'), member('c', 'Charlie')];
      const shares = CalculationEngine.calculateShares(90, members, 'equal');
      shares.forEach(s => expect(s.amount).toBe(30));
    });
  });

  describe('Scenario: Bill cannot be divided into even cents', () => {
    it('Given $10 and 3 members, total of shares still equals $10 exactly', () => {
      const members = [member('a', 'A'), member('b', 'B'), member('c', 'C')];
      const shares = CalculationEngine.calculateShares(10, members, 'equal');
      const total = shares.reduce((s, x) => s + x.amount, 0);
      expect(total).toBe(10);
    });
  });

  describe('Scenario: Single member group', () => {
    it('Given $50 and 1 member, that member owes the full amount', () => {
      const shares = CalculationEngine.calculateShares(50, [member('a', 'Alice')], 'equal');
      expect(shares[0].amount).toBe(50);
    });
  });
});

// ---------------------------------------------------------------------------
describe('Feature: Fairness-Weighted Split', () => {
  describe('Scenario: Two members with different weights', () => {
    it('Given Alice (weight 2) and Bob (weight 1), $90 → Alice pays $60, Bob pays $30', () => {
      const members = [member('alice', 'Alice', 2), member('bob', 'Bob', 1)];
      const shares = CalculationEngine.calculateShares(90, members, 'fairness');
      expect(shares.find(s => s.memberId === 'alice')?.amount).toBe(60);
      expect(shares.find(s => s.memberId === 'bob')?.amount).toBe(30);
    });
  });

  describe('Scenario: All equal weights behave like equal split', () => {
    it('Given all members have weight 1, fairness split equals equal split', () => {
      const members = [member('a', 'A'), member('b', 'B')];
      const fairShares = CalculationEngine.calculateShares(100, members, 'fairness');
      const equalShares = CalculationEngine.calculateShares(100, members, 'equal');
      fairShares.forEach((s, i) => expect(s.amount).toBe(equalShares[i].amount));
    });
  });

  describe('Scenario: Total always preserved', () => {
    it('Given any weights, sum of shares equals the expense amount', () => {
      const members = [member('a', 'A', 3), member('b', 'B', 1), member('c', 'C', 2)];
      const shares = CalculationEngine.calculateShares(77.77, members, 'fairness');
      const total = shares.reduce((s, x) => s + x.amount, 0);
      expect(Math.abs(total - 77.77)).toBeLessThanOrEqual(0.01);
    });
  });
});

// ---------------------------------------------------------------------------
describe('Feature: Custom Percentage Split', () => {
  describe('Scenario: User manually assigns percentages', () => {
    it('Given 70/30 split on $100, shares are $70 and $30', () => {
      const members = [member('alice', 'Alice'), member('bob', 'Bob')];
      const custom: Partial<MemberShare>[] = [
        { memberId: 'alice', percentage: 70 },
        { memberId: 'bob', percentage: 30 },
      ];
      const shares = CalculationEngine.calculateShares(100, members, 'custom', custom);
      expect(shares.find(s => s.memberId === 'alice')?.amount).toBe(70);
      expect(shares.find(s => s.memberId === 'bob')?.amount).toBe(30);
    });
  });

  describe('Scenario: Percentages do not sum to 100', () => {
    it('Validation rejects percentages summing to 80', () => {
      const result = ValidationService.validateCustomPercentages([50, 30]);
      expect(result.valid).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
describe('Feature: Custom Amount Split', () => {
  describe('Scenario: User manually assigns dollar amounts', () => {
    it('Given Alice=$60, Bob=$40 on a $100 expense, shares match', () => {
      const members = [member('alice', 'Alice'), member('bob', 'Bob')];
      const custom: Partial<MemberShare>[] = [
        { memberId: 'alice', amount: 60 },
        { memberId: 'bob', amount: 40 },
      ];
      const shares = CalculationEngine.calculateShares(100, members, 'custom', custom);
      expect(shares.find(s => s.memberId === 'alice')?.amount).toBe(60);
      expect(shares.find(s => s.memberId === 'bob')?.amount).toBe(40);
    });
  });

  describe('Scenario: Amounts do not match the total', () => {
    it('Validation rejects amounts summing to $80 for a $100 expense', () => {
      const result = ValidationService.validateCustomAmounts([40, 40], 100);
      expect(result.valid).toBe(false);
    });
  });

  describe('Scenario: Negative amount entered', () => {
    it('Validation rejects any negative amount', () => {
      const result = ValidationService.validateCustomAmounts([-10, 110], 100);
      expect(result.valid).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
describe('Feature: Expense Validation', () => {
  describe('Scenario: Amount of zero is entered', () => {
    it('Validation rejects zero', () => {
      expect(ValidationService.validateExpenseAmount(0).valid).toBe(false);
    });
  });

  describe('Scenario: Amount is left blank (NaN)', () => {
    it('Validation rejects NaN', () => {
      expect(ValidationService.validateExpenseAmount(NaN).valid).toBe(false);
    });
  });

  describe('Scenario: Extremely large amount', () => {
    it('Validation rejects amounts above $1,000,000', () => {
      expect(ValidationService.validateExpenseAmount(1_500_000).valid).toBe(false);
    });
  });
});
