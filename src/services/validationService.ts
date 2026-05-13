/**
 * ValidationService: Centralized business rules for Settlr
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const ValidationService = {
  validateGroupName(name: string): ValidationResult {
    const errors: string[] = [];
    if (!name || name.trim().length === 0) {
      errors.push('Group name is required.');
    } else if (name.length > 50) {
      errors.push('Group name must be 50 characters or less.');
    }
    return { valid: errors.length === 0, errors };
  },

  validateMemberName(name: string): ValidationResult {
    const errors: string[] = [];
    if (!name || name.trim().length === 0) {
      errors.push('Member name is required.');
    }
    return { valid: errors.length === 0, errors };
  },

  validateExpenseAmount(amount: number): ValidationResult {
    const errors: string[] = [];
    if (isNaN(amount) || amount <= 0) {
      errors.push('Amount must be a positive number.');
    } else if (amount > 1000000) {
      errors.push('Amount seems too large. Please check again.');
    }
    return { valid: errors.length === 0, errors };
  },

  validateFairnessWeight(weight: number): ValidationResult {
    const errors: string[] = [];
    if (isNaN(weight) || weight <= 0) {
      errors.push('Weight must be a positive number.');
    }
    return { valid: errors.length === 0, errors };
  },

  validateCustomPercentages(percentages: number[]): ValidationResult {
    const errors: string[] = [];
    const sum = percentages.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 0.01) {
      errors.push(`Percentages must sum to 100% (currently ${sum.toFixed(1)}%).`);
    }
    return { valid: errors.length === 0, errors };
  },

  validateCustomAmounts(amounts: number[], total: number): ValidationResult {
    const errors: string[] = [];
    if (amounts.some(a => a < 0)) {
      errors.push('All amounts must be non-negative.');
    }
    const sum = amounts.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - total) > 0.01) {
      errors.push(`Amounts must sum to $${total.toFixed(2)} (currently $${sum.toFixed(2)}).`);
    }
    return { valid: errors.length === 0, errors };
  },

  validateSettlement(amount: number, fromMember: string, toMember: string): ValidationResult {
    const errors: string[] = [];
    if (isNaN(amount) || amount <= 0) {
      errors.push('Settlement amount must be positive.');
    }
    if (fromMember === toMember) {
      errors.push('Cannot settle up with yourself.');
    }
    return { valid: errors.length === 0, errors };
  }
};
