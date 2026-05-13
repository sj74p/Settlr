import { describe, it, expect } from 'vitest';
import { DebtSimplifier } from '../../src/services/debtSimplifier';
import type { Balance } from '../../src/types';

const balance = (memberId: string, displayName: string, netBalance: number): Balance =>
  ({ memberId, displayName, netBalance });

describe('DebtSimplifier', () => {
  describe('simplify', () => {
    it('returns empty array when all balances are zero', () => {
      const balances = [balance('a', 'Alice', 0), balance('b', 'Bob', 0)];
      expect(DebtSimplifier.simplify(balances)).toHaveLength(0);
    });

    it('returns empty array for empty input', () => {
      expect(DebtSimplifier.simplify([])).toHaveLength(0);
    });

    it('creates one transaction for one creditor and one debtor', () => {
      const balances = [balance('a', 'Alice', 50), balance('b', 'Bob', -50)];
      const result = DebtSimplifier.simplify(balances);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ from: 'b', to: 'a', amount: 50 });
    });

    it('minimises transactions across multiple members', () => {
      // 4 members: Alice +30, Bob +20, Charlie -30, Dave -20
      // Optimal: 2 transactions instead of 4
      const balances = [
        balance('a', 'Alice', 30),
        balance('b', 'Bob', 20),
        balance('c', 'Charlie', -30),
        balance('d', 'Dave', -20),
      ];
      const result = DebtSimplifier.simplify(balances);
      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('preserves net balances after applying transactions', () => {
      const balances = [
        balance('a', 'Alice', 100),
        balance('b', 'Bob', -40),
        balance('c', 'Charlie', -60),
      ];
      const transactions = DebtSimplifier.simplify(balances);

      // Apply transactions to check balances are preserved
      const net: Record<string, number> = { a: 0, b: 0, c: 0 };
      transactions.forEach(t => {
        net[t.from] -= t.amount;
        net[t.to] += t.amount;
      });

      expect(Math.abs(net['a'] - 100)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(net['b'] - (-40))).toBeLessThanOrEqual(0.01);
      expect(Math.abs(net['c'] - (-60))).toBeLessThanOrEqual(0.01);
    });

    it('ignores near-zero balances (floating-point noise)', () => {
      // 0.004 is below EPSILON=0.005 and should be treated as zero
      const balances = [balance('a', 'Alice', 0.004), balance('b', 'Bob', -0.004)];
      expect(DebtSimplifier.simplify(balances)).toHaveLength(0);
    });

    it('handles three-way split correctly', () => {
      // Alice paid $90, split equally → Alice +60, Bob -30, Charlie -30
      const balances = [
        balance('alice', 'Alice', 60),
        balance('bob', 'Bob', -30),
        balance('charlie', 'Charlie', -30),
      ];
      const result = DebtSimplifier.simplify(balances);
      const totalSettled = result.reduce((s, t) => s + t.amount, 0);
      expect(Math.abs(totalSettled - 60)).toBeLessThanOrEqual(0.01);
    });

    it('all transaction amounts are positive', () => {
      const balances = [
        balance('a', 'Alice', 75),
        balance('b', 'Bob', -25),
        balance('c', 'Charlie', -50),
      ];
      DebtSimplifier.simplify(balances).forEach(t => {
        expect(t.amount).toBeGreaterThan(0);
      });
    });
  });
});
