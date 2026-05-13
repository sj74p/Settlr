import { describe, it, expect } from 'vitest';
import { ValidationService } from '../../src/services/validationService';

describe('ValidationService', () => {
  describe('validateGroupName', () => {
    it('rejects empty string', () => {
      expect(ValidationService.validateGroupName('').valid).toBe(false);
    });

    it('rejects whitespace-only string', () => {
      expect(ValidationService.validateGroupName('   ').valid).toBe(false);
    });

    it('rejects names over 50 characters', () => {
      const long = 'A'.repeat(51);
      const result = ValidationService.validateGroupName(long);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/50/);
    });

    it('accepts a valid group name', () => {
      expect(ValidationService.validateGroupName('Weekend Trip').valid).toBe(true);
    });

    it('accepts exactly 50 characters', () => {
      expect(ValidationService.validateGroupName('A'.repeat(50)).valid).toBe(true);
    });
  });

  describe('validateMemberName', () => {
    it('rejects empty string', () => {
      expect(ValidationService.validateMemberName('').valid).toBe(false);
    });

    it('rejects whitespace-only string', () => {
      expect(ValidationService.validateMemberName('  ').valid).toBe(false);
    });

    it('accepts a valid name', () => {
      expect(ValidationService.validateMemberName('Alice').valid).toBe(true);
    });
  });

  describe('validateExpenseAmount', () => {
    it('rejects NaN', () => {
      expect(ValidationService.validateExpenseAmount(NaN).valid).toBe(false);
    });

    it('rejects zero', () => {
      expect(ValidationService.validateExpenseAmount(0).valid).toBe(false);
    });

    it('rejects negative numbers', () => {
      expect(ValidationService.validateExpenseAmount(-10).valid).toBe(false);
    });

    it('rejects amounts over 1,000,000', () => {
      const result = ValidationService.validateExpenseAmount(1_000_001);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/large/i);
    });

    it('accepts valid positive amounts', () => {
      expect(ValidationService.validateExpenseAmount(99.99).valid).toBe(true);
    });

    it('accepts the maximum allowed amount', () => {
      expect(ValidationService.validateExpenseAmount(1_000_000).valid).toBe(true);
    });
  });

  describe('validateFairnessWeight', () => {
    it('rejects NaN', () => {
      expect(ValidationService.validateFairnessWeight(NaN).valid).toBe(false);
    });

    it('rejects zero', () => {
      expect(ValidationService.validateFairnessWeight(0).valid).toBe(false);
    });

    it('rejects negative values', () => {
      expect(ValidationService.validateFairnessWeight(-1).valid).toBe(false);
    });

    it('accepts positive decimal weights', () => {
      expect(ValidationService.validateFairnessWeight(1.5).valid).toBe(true);
    });
  });

  describe('validateCustomPercentages', () => {
    it('rejects percentages that sum below 100', () => {
      const result = ValidationService.validateCustomPercentages([50, 30]);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/100%/);
    });

    it('rejects percentages that sum above 100', () => {
      expect(ValidationService.validateCustomPercentages([60, 50]).valid).toBe(false);
    });

    it('accepts percentages that sum to exactly 100', () => {
      expect(ValidationService.validateCustomPercentages([40, 30, 30]).valid).toBe(true);
    });

    it('accepts percentages within 0.01 tolerance of 100', () => {
      expect(ValidationService.validateCustomPercentages([33.34, 33.33, 33.33]).valid).toBe(true);
    });
  });

  describe('validateCustomAmounts', () => {
    it('rejects negative individual amounts', () => {
      const result = ValidationService.validateCustomAmounts([-10, 110], 100);
      expect(result.valid).toBe(false);
    });

    it('rejects amounts that do not sum to total', () => {
      const result = ValidationService.validateCustomAmounts([40, 40], 100);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/\$100\.00/);
    });

    it('accepts amounts that sum to total within 0.01', () => {
      expect(ValidationService.validateCustomAmounts([33.34, 33.33, 33.33], 100).valid).toBe(true);
    });

    it('accepts exact sum', () => {
      expect(ValidationService.validateCustomAmounts([60, 40], 100).valid).toBe(true);
    });
  });

  describe('validateSettlement', () => {
    it('rejects NaN amount', () => {
      expect(ValidationService.validateSettlement(NaN, 'a', 'b').valid).toBe(false);
    });

    it('rejects zero amount', () => {
      expect(ValidationService.validateSettlement(0, 'a', 'b').valid).toBe(false);
    });

    it('rejects negative amount', () => {
      expect(ValidationService.validateSettlement(-5, 'a', 'b').valid).toBe(false);
    });

    it('rejects when fromMember equals toMember', () => {
      const result = ValidationService.validateSettlement(50, 'alice', 'alice');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/yourself/i);
    });

    it('accepts valid settlement', () => {
      expect(ValidationService.validateSettlement(50, 'alice', 'bob').valid).toBe(true);
    });
  });
});
