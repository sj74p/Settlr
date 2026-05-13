import type { Expense, Member } from '../types';

export function generateCSVContent(expenses: Expense[], members: Member[]): string {
  const getMemberName = (id: string) => members.find(m => m.id === id)?.displayName ?? id;
  const headers = ['Date', 'Title', 'Amount', 'Paid By', 'Category', 'Split Method', 'Notes'];
  const rows = expenses.map(exp => [
    exp.date,
    exp.title,
    exp.amount.toFixed(2),
    getMemberName(exp.paidBy),
    exp.category,
    exp.splitMethod,
    exp.notes ?? ''
  ]);
  return [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export function exportExpensesToCSV(expenses: Expense[], members: Member[], groupName: string): void {
  const csv = generateCSVContent(expenses, members);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${groupName.replace(/\s+/g, '_')}_expenses.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
