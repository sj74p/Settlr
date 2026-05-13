import { describe, it, expect } from 'vitest';
import { generateCSVContent } from '../../src/utils/csvExport';
import type { Expense, Member } from '../../src/types';

const member = (id: string, displayName: string): Member => ({
  id, displayName, groupId: 'g1', userId: null,
  fairnessWeight: 1, isGuest: false, joinedAt: ''
});

const expense = (overrides: Partial<Expense> = {}): Expense => ({
  id: 'e1', groupId: 'g1', title: 'Dinner', amount: 90,
  paidBy: 'alice', date: '2024-01-15', category: 'Food',
  splitMethod: 'equal', shares: [], createdAt: '',
  ...overrides
});

describe('generateCSVContent', () => {
  const members = [member('alice', 'Alice'), member('bob', 'Bob')];

  it('includes correct headers as the first row', () => {
    const csv = generateCSVContent([], members);
    const firstRow = csv.split('\n')[0];
    expect(firstRow).toContain('"Date"');
    expect(firstRow).toContain('"Title"');
    expect(firstRow).toContain('"Amount"');
    expect(firstRow).toContain('"Paid By"');
    expect(firstRow).toContain('"Notes"');
  });

  it('generates one data row per expense', () => {
    const expenses = [expense(), expense({ id: 'e2', title: 'Taxi' })];
    const lines = generateCSVContent(expenses, members).split('\n');
    expect(lines).toHaveLength(3); // header + 2 rows
  });

  it('resolves paidBy member id to display name', () => {
    const csv = generateCSVContent([expense({ paidBy: 'alice' })], members);
    expect(csv).toContain('"Alice"');
    expect(csv).not.toContain('"alice"');
  });

  it('falls back to id when member not found', () => {
    const csv = generateCSVContent([expense({ paidBy: 'unknown-id' })], members);
    expect(csv).toContain('"unknown-id"');
  });

  it('formats amount to 2 decimal places', () => {
    const csv = generateCSVContent([expense({ amount: 90 })], members);
    expect(csv).toContain('"90.00"');
  });

  it('includes notes when present', () => {
    const csv = generateCSVContent([expense({ notes: 'Team lunch' })], members);
    expect(csv).toContain('"Team lunch"');
  });

  it('uses empty string for missing notes', () => {
    const csv = generateCSVContent([expense({ notes: undefined })], members);
    const dataRow = csv.split('\n')[1];
    expect(dataRow).toMatch(/""$/); // last column is empty string
  });

  it('escapes double quotes inside field values', () => {
    const csv = generateCSVContent([expense({ title: 'Bob\'s "special" dinner' })], members);
    expect(csv).toContain('Bob\'s ""special"" dinner');
  });

  it('returns only headers for empty expense list', () => {
    const lines = generateCSVContent([], members).split('\n');
    expect(lines).toHaveLength(1);
  });
});
