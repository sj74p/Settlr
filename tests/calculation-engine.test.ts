import { describe, it, expect } from 'vitest';
import { CalculationEngine } from '../src/services/calculationEngine';
import { Member } from '../src/types';

describe('CalculationEngine', () => {
  const mockMembers: Member[] = [
    { id: '1', displayName: 'Alice', fairnessWeight: 1, isGuest: true, groupId: 'g1', userId: null, joinedAt: '' },
    { id: '2', displayName: 'Bob', fairnessWeight: 1, isGuest: true, groupId: 'g1', userId: null, joinedAt: '' },
    { id: '3', displayName: 'Charlie', fairnessWeight: 2, isGuest: true, groupId: 'g1', userId: null, joinedAt: '' },
  ];

  describe('calculateShares', () => {
    it('should split equally', () => {
      const shares = CalculationEngine.calculateShares(100, mockMembers, 'equal');
      expect(shares).toHaveLength(3);
      // 100 / 3 = 33.333... -> 33.33, 33.33, 33.34 (due to rounding adjustment)
      const total = shares.reduce((sum, s) => sum + s.amount, 0);
      expect(total).toBe(100);
      expect(shares[0].amount).toBe(33.34); // First member gets the remainder in our implementation
    });

    it('should split by fairness weights', () => {
      // Alice (1), Bob (1), Charlie (2) -> Total weight: 4
      // $100 -> Alice (25), Bob (25), Charlie (50)
      const shares = CalculationEngine.calculateShares(100, mockMembers, 'fairness');
      expect(shares.find(s => s.memberId === '1')?.amount).toBe(25);
      expect(shares.find(s => s.memberId === '2')?.amount).toBe(25);
      expect(shares.find(s => s.memberId === '3')?.amount).toBe(50);
    });

    it('should split by custom percentages', () => {
      const customShares = [
        { memberId: '1', percentage: 30 },
        { memberId: '2', percentage: 30 },
        { memberId: '3', percentage: 40 },
      ];
      const shares = CalculationEngine.calculateShares(100, mockMembers, 'custom', customShares);
      expect(shares.find(s => s.memberId === '1')?.amount).toBe(30);
      expect(shares.find(s => s.memberId === '2')?.amount).toBe(30);
      expect(shares.find(s => s.memberId === '3')?.amount).toBe(40);
    });
  });

  describe('calculateBalances', () => {
    it('should calculate net balances correctly', () => {
      const expenses = [
        {
          id: 'e1',
          amount: 100,
          paidBy: '1', // Alice paid 100
          shares: [
            { memberId: '1', amount: 50 },
            { memberId: '2', amount: 50 },
          ],
          groupId: 'g1',
          title: 'Dinner',
          date: '',
          category: 'Food' as any,
          splitMethod: 'equal' as any,
          createdAt: ''
        }
      ];

      const balances = CalculationEngine.calculateBalances(mockMembers.slice(0, 2), expenses, []);
      
      // Alice: Paid 100, Owed 50 -> Balance +50
      // Bob: Paid 0, Owed 50 -> Balance -50
      expect(balances.find(b => b.memberId === '1')?.netBalance).toBe(50);
      expect(balances.find(b => b.memberId === '2')?.netBalance).toBe(-50);
    });
  });

  describe('rounding adjustment', () => {
    it('should handle "lost pennies" in division', () => {
      const members = mockMembers.slice(0, 3);
      const shares = CalculationEngine.calculateShares(0.01, members, 'equal');
      // 0.01 / 3 = 0.0033...
      // Should be 0.01, 0, 0
      const total = shares.reduce((sum, s) => sum + s.amount, 0);
      expect(total).toBe(0.01);
    });
  });
});
