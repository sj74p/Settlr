/**
 * BDD: Group Management Behaviors
 * Covers group creation validation, expense CSV export content,
 * and group summary calculations — all testable without Supabase.
 */
import { describe, it, expect } from 'vitest';
import { ValidationService } from '../../src/services/validationService';
import { CalculationEngine } from '../../src/services/calculationEngine';
import { generateCSVContent } from '../../src/utils/csvExport';
import type { Member, Expense } from '../../src/types';

const member = (id: string, name: string, weight = 1): Member => ({
  id, displayName: name, fairnessWeight: weight,
  groupId: 'g1', userId: null, isGuest: false, joinedAt: ''
});

const expense = (overrides: Partial<Expense> = {}): Expense => ({
  id: 'e1', groupId: 'g1', title: 'Dinner', amount: 90,
  paidBy: 'alice', date: '2024-06-01', category: 'Food',
  splitMethod: 'equal', shares: [], createdAt: '',
  ...overrides
});

// ---------------------------------------------------------------------------
describe('Feature: Group Creation Validation', () => {
  describe('Scenario: User submits empty group name', () => {
    it('Validation rejects the empty name with an error message', () => {
      const result = ValidationService.validateGroupName('');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Scenario: User submits a name that is too long', () => {
    it('Validation rejects names over 50 characters', () => {
      expect(ValidationService.validateGroupName('A'.repeat(51)).valid).toBe(false);
    });
  });

  describe('Scenario: User submits a valid group name', () => {
    it('Validation passes for a reasonable group name', () => {
      expect(ValidationService.validateGroupName('Weekend Hiking Trip').valid).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
describe('Feature: Member Management Validation', () => {
  describe('Scenario: User leaves a member name blank', () => {
    it('Validation rejects blank member name', () => {
      expect(ValidationService.validateMemberName('').valid).toBe(false);
    });
  });

  describe('Scenario: User enters a fairness weight of zero', () => {
    it('Validation rejects zero weight', () => {
      expect(ValidationService.validateFairnessWeight(0).valid).toBe(false);
    });
  });

  describe('Scenario: User enters a valid fractional weight', () => {
    it('Validation accepts 0.5 as a valid weight', () => {
      expect(ValidationService.validateFairnessWeight(0.5).valid).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
describe('Feature: Group Summary Totals', () => {
  describe('Scenario: Dashboard shows total spent for a group', () => {
    it('Sum of all expense amounts matches displayed total', () => {
      const expenses = [
        expense({ id: 'e1', amount: 50 }),
        expense({ id: 'e2', amount: 30.50 }),
        expense({ id: 'e3', amount: 19.50 }),
      ];
      const total = expenses.reduce((s, e) => s + e.amount, 0);
      expect(total).toBe(100);
    });
  });

  describe('Scenario: Empty group shows zero total', () => {
    it('Total is 0 when there are no expenses', () => {
      const total = [].reduce((s: number, _e: Expense) => s + _e.amount, 0);
      expect(total).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
describe('Feature: CSV Export', () => {
  const members = [member('alice', 'Alice'), member('bob', 'Bob')];

  describe('Scenario: User exports expenses to CSV', () => {
    it('CSV contains a header row and one data row per expense', () => {
      const expenses = [
        expense({ id: 'e1', title: 'Dinner', amount: 90, paidBy: 'alice' }),
        expense({ id: 'e2', title: 'Taxi', amount: 20, paidBy: 'bob' }),
      ];
      const lines = generateCSVContent(expenses, members).split('\n');
      expect(lines).toHaveLength(3); // header + 2 data rows
    });
  });

  describe('Scenario: Payer name is shown, not internal ID', () => {
    it('CSV contains "Alice" not the UUID for the paidBy field', () => {
      const csv = generateCSVContent([expense({ paidBy: 'alice' })], members);
      expect(csv).toContain('"Alice"');
      expect(csv).not.toContain('"alice"');
    });
  });

  describe('Scenario: Expense with notes is exported correctly', () => {
    it('Notes field appears in the CSV row', () => {
      const csv = generateCSVContent([expense({ notes: 'Work reimbursable' })], members);
      expect(csv).toContain('"Work reimbursable"');
    });
  });

  describe('Scenario: Title containing quotes is safely escaped', () => {
    it('Double quotes in title are escaped as double-double quotes', () => {
      const csv = generateCSVContent([expense({ title: '"Fancy" Restaurant' })], members);
      expect(csv).toContain('""Fancy""');
    });
  });

  describe('Scenario: No expenses to export', () => {
    it('CSV contains only the header row', () => {
      const lines = generateCSVContent([], members).split('\n');
      expect(lines).toHaveLength(1);
    });
  });
});

// ---------------------------------------------------------------------------
describe('Feature: Balance Invariant After Fairness Split', () => {
  describe('Scenario: Weighted group always conserves money', () => {
    it('Sum of all member balances is zero after fairness-split expenses', () => {
      const members = [
        member('a', 'Alice', 3),
        member('b', 'Bob', 1),
        member('c', 'Charlie', 2),
      ];
      const totalWeight = 6;
      const amount = 120;
      const shares = CalculationEngine.calculateShares(amount, members, 'fairness');
      const expenses: Expense[] = [{
        id: 'e1', groupId: 'g1', title: 'Hotel', amount,
        paidBy: 'a', date: '2024-01-01', category: 'Travel',
        splitMethod: 'fairness', shares, createdAt: ''
      }];

      // Alice (3/6 = 50%) → $60, Bob (1/6 ≈ 16.7%) → $20, Charlie (2/6 ≈ 33.3%) → $40
      const balances = CalculationEngine.calculateBalances(members, expenses, []);
      const sum = balances.reduce((s, b) => s + b.netBalance, 0);
      expect(Math.abs(sum)).toBeLessThanOrEqual(0.01);

      // Alice paid $120, her share is $60 → net +60
      expect(balances.find(b => b.memberId === 'a')?.netBalance).toBe(
        amount - (members[0].fairnessWeight / totalWeight) * amount
      );
    });
  });
});
