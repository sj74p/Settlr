import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { CalculationEngine } from '../src/services/calculationEngine';
import { DebtSimplifier } from '../src/services/debtSimplifier';
import type { Balance, SplitMethod, ExpenseCategory } from '../src/types';

describe('Settlr Properties (fast-check)', () => {

  // joinedAt is cosmetic — use a constant so fc.date() edge cases can't throw
  const membersArb = fc.array(
    fc.record({
      id: fc.uuid(),
      displayName: fc.string(),
      fairnessWeight: fc.double({ min: 0.1, max: 10, noNaN: true }),
      isGuest: fc.constant(true),
      groupId: fc.uuid(),
      userId: fc.constant(null),
      joinedAt: fc.constant('2024-01-01T00:00:00.000Z')
    }),
    { minLength: 1, maxLength: 20 }
  ).map(members =>
    // Ensure unique IDs to avoid map collisions in tests
    members.map((m, idx) => ({ ...m, id: `member-${idx}` }))
  );

  it('Property: Sum of shares should always equal the total amount', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 1000000, noNaN: true }).map(d => Number(d.toFixed(2))),
        membersArb,
        fc.constantFrom('equal', 'fairness'),
        (amount, members, method) => {
          const shares = CalculationEngine.calculateShares(amount, members, method as SplitMethod);
          const sum = shares.reduce((s, share) => s + share.amount, 0);
          expect(Math.abs(sum - amount)).toBeLessThanOrEqual(0.01);
        }
      )
    );
  });

  it('Property: Group net balance should always be zero', () => {
    fc.assert(
      fc.property(
        membersArb,
        fc.array(
          fc.record({
            amount: fc.double({ min: 0.01, max: 1000, noNaN: true }).map(d => Number(d.toFixed(2))),
            paidByIdx: fc.integer({ min: 0, max: 19 })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (members, rawExpenses) => {
          const expenses = rawExpenses.map((re, idx) => {
            const paidBy = members[re.paidByIdx % members.length].id;
            const shares = CalculationEngine.calculateShares(re.amount, members, 'equal');
            return {
              id: `e${idx}`, groupId: 'g1', title: 'Test', amount: re.amount,
              paidBy, date: '', category: 'Other' as ExpenseCategory,
              splitMethod: 'equal' as SplitMethod, shares, createdAt: ''
            };
          });

          const balances = CalculationEngine.calculateBalances(members, expenses, []);
          const totalNetBalance = balances.reduce((sum, b) => sum + b.netBalance, 0);
          expect(Math.abs(totalNetBalance)).toBeLessThanOrEqual(0.01);
        }
      )
    );
  });

  it('Property: Debt simplification must preserve net balances', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            displayName: fc.string(),
            netBalance: fc.double({ min: -1000, max: 1000, noNaN: true }).map(d => Number(d.toFixed(2)))
          }),
          { minLength: 2, maxLength: 10 }
        ).map(items => items.map((item, idx) => ({ ...item, memberId: `member-${idx}` }))),
        (rawBalances) => {
          // Deep-copy so mutations don't leak across fast-check runs
          const balances: Balance[] = rawBalances.map(b => ({ ...b }));

          // Adjust last balance to make the group sum exactly zero
          const sum = balances.slice(0, -1).reduce((s, b) => s + b.netBalance, 0);
          balances[balances.length - 1].netBalance = Number((-sum).toFixed(2));

          // Snapshot BEFORE simplify — simplify mutates creditor objects in-place
          const original: Record<string, number> = Object.fromEntries(
            balances.map(b => [b.memberId, b.netBalance])
          );

          const transactions = DebtSimplifier.simplify(balances);

          // Reconstruct balances from transactions alone (starting from zero):
          //   from = debtor → pays out → reconstructed as negative (−= amount)
          //   to   = creditor → receives → reconstructed as positive (+= amount)
          // The result must match the original balance for each member.
          const reconstructed: Record<string, number> = Object.fromEntries(
            Object.keys(original).map(id => [id, 0])
          );
          transactions.forEach(t => {
            reconstructed[t.from] -= t.amount;
            reconstructed[t.to]   += t.amount;
          });

          Object.keys(original).forEach(id => {
            expect(Math.abs(reconstructed[id] - original[id])).toBeLessThanOrEqual(0.01);
          });
        }
      )
    );
  });
});
