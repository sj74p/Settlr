/**
 * BDD: Debt Settlement Behaviors
 * Covers balance calculation, debt simplification, and settlement recording.
 */
import { describe, it, expect } from 'vitest';
import { CalculationEngine } from '../../src/services/calculationEngine';
import { DebtSimplifier } from '../../src/services/debtSimplifier';
import { ValidationService } from '../../src/services/validationService';
import type { Member, Expense, Settlement } from '../../src/types';

const member = (id: string, name: string): Member => ({
  id, displayName: name, fairnessWeight: 1,
  groupId: 'g1', userId: null, isGuest: false, joinedAt: ''
});

const mkExpense = (id: string, amount: number, paidBy: string, shares: { id: string; amt: number }[]): Expense => ({
  id, groupId: 'g1', title: 'Test', amount, paidBy,
  date: '2024-01-01', category: 'Food', splitMethod: 'equal',
  shares: shares.map(s => ({ memberId: s.id, amount: s.amt })),
  createdAt: ''
});

const mkSettlement = (from: string, to: string, amount: number): Settlement => ({
  id: 's1', groupId: 'g1', fromMember: from, toMember: to,
  amount, date: '2024-01-01', createdAt: ''
});

// ---------------------------------------------------------------------------
describe('Feature: Balance Calculation', () => {
  describe('Scenario: Alice pays for a dinner shared equally with Bob', () => {
    it('Alice has +$45 balance, Bob has -$45 balance', () => {
      const members = [member('alice', 'Alice'), member('bob', 'Bob')];
      const expenses = [mkExpense('e1', 90, 'alice', [{ id: 'alice', amt: 45 }, { id: 'bob', amt: 45 }])];

      const balances = CalculationEngine.calculateBalances(members, expenses, []);
      expect(balances.find(b => b.memberId === 'alice')?.netBalance).toBe(45);
      expect(balances.find(b => b.memberId === 'bob')?.netBalance).toBe(-45);
    });
  });

  describe('Scenario: Group net balance is always zero', () => {
    it('Sum of all balances equals zero regardless of who paid what', () => {
      const members = [member('a', 'A'), member('b', 'B'), member('c', 'C')];
      const expenses = [
        mkExpense('e1', 60, 'a', [{ id: 'a', amt: 20 }, { id: 'b', amt: 20 }, { id: 'c', amt: 20 }]),
        mkExpense('e2', 30, 'b', [{ id: 'a', amt: 10 }, { id: 'b', amt: 10 }, { id: 'c', amt: 10 }]),
      ];
      const balances = CalculationEngine.calculateBalances(members, expenses, []);
      const total = balances.reduce((s, b) => s + b.netBalance, 0);
      expect(Math.abs(total)).toBeLessThanOrEqual(0.01);
    });
  });

  describe('Scenario: Recording a settlement reduces the debt', () => {
    it('After Bob pays Alice $45, both balances become zero', () => {
      const members = [member('alice', 'Alice'), member('bob', 'Bob')];
      const expenses = [mkExpense('e1', 90, 'alice', [{ id: 'alice', amt: 45 }, { id: 'bob', amt: 45 }])];
      const settlements = [mkSettlement('bob', 'alice', 45)];

      const balances = CalculationEngine.calculateBalances(members, expenses, settlements);
      expect(Math.abs(balances.find(b => b.memberId === 'alice')?.netBalance ?? 99)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(balances.find(b => b.memberId === 'bob')?.netBalance ?? 99)).toBeLessThanOrEqual(0.01);
    });
  });

  describe('Scenario: No expenses means zero balances', () => {
    it('All members have $0 balance when there are no expenses', () => {
      const members = [member('a', 'A'), member('b', 'B')];
      const balances = CalculationEngine.calculateBalances(members, [], []);
      balances.forEach(b => expect(b.netBalance).toBe(0));
    });
  });
});

// ---------------------------------------------------------------------------
describe('Feature: Debt Simplification', () => {
  describe('Scenario: All debts already settled', () => {
    it('Simplify returns no transactions when all balances are zero', () => {
      const balances = [
        { memberId: 'a', displayName: 'Alice', netBalance: 0 },
        { memberId: 'b', displayName: 'Bob', netBalance: 0 },
      ];
      expect(DebtSimplifier.simplify(balances)).toHaveLength(0);
    });
  });

  describe('Scenario: Simple two-person debt', () => {
    it('Alice is owed $50 by Bob → one transaction: Bob pays Alice $50', () => {
      const balances = [
        { memberId: 'alice', displayName: 'Alice', netBalance: 50 },
        { memberId: 'bob', displayName: 'Bob', netBalance: -50 },
      ];
      const result = DebtSimplifier.simplify(balances);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ from: 'bob', to: 'alice', amount: 50 });
    });
  });

  describe('Scenario: Multiple expenses, minimised transactions', () => {
    it('Four members with cross-debts are settled in ≤3 transactions', () => {
      const members = [member('a', 'A'), member('b', 'B'), member('c', 'C'), member('d', 'D')];
      const expenses = [
        mkExpense('e1', 100, 'a', [{ id: 'a', amt: 25 }, { id: 'b', amt: 25 }, { id: 'c', amt: 25 }, { id: 'd', amt: 25 }]),
        mkExpense('e2', 80, 'b', [{ id: 'a', amt: 20 }, { id: 'b', amt: 20 }, { id: 'c', amt: 20 }, { id: 'd', amt: 20 }]),
      ];
      const balances = CalculationEngine.calculateBalances(members, expenses, []);
      const transactions = DebtSimplifier.simplify(balances);
      expect(transactions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Scenario: Transactions exactly cancel original balances', () => {
    it('Applying simplified transactions restores all balances to zero', () => {
      const members = [member('a', 'A'), member('b', 'B'), member('c', 'C')];
      const expenses = [
        mkExpense('e1', 90, 'a', [{ id: 'a', amt: 30 }, { id: 'b', amt: 30 }, { id: 'c', amt: 30 }]),
      ];
      const balances = CalculationEngine.calculateBalances(members, expenses, []);

      // Capture values before simplify — the simplifier mutates creditor objects in-place
      const net: Record<string, number> = Object.fromEntries(balances.map(b => [b.memberId, b.netBalance]));

      const transactions = DebtSimplifier.simplify(balances);

      // Paying down debts: debtor balance improves (+), creditor balance decreases (-)
      transactions.forEach(t => { net[t.from] += t.amount; net[t.to] -= t.amount; });

      Object.values(net).forEach(v => expect(Math.abs(v)).toBeLessThanOrEqual(0.01));
    });
  });
});

// ---------------------------------------------------------------------------
describe('Feature: Settlement Validation', () => {
  describe('Scenario: Settlement to yourself', () => {
    it('Validation rejects fromMember === toMember', () => {
      const result = ValidationService.validateSettlement(50, 'alice', 'alice');
      expect(result.valid).toBe(false);
    });
  });

  describe('Scenario: Zero settlement amount', () => {
    it('Validation rejects zero', () => {
      expect(ValidationService.validateSettlement(0, 'alice', 'bob').valid).toBe(false);
    });
  });

  describe('Scenario: Valid settlement', () => {
    it('Validation passes for positive amount between two different members', () => {
      expect(ValidationService.validateSettlement(25.50, 'alice', 'bob').valid).toBe(true);
    });
  });
});
