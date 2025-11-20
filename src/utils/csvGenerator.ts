/**
 * CSV Generator Utilities
 * 
 * Helper functions to convert financial data to CSV format for accountant exports
 */

export function generateCSV(headers: string[], rows: any[][]): string {
  const csvRows = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => {
      // Handle strings with commas or quotes
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(','))
  ];
  
  return csvRows.join('\n');
}

export function downloadCSV(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function formatCurrency(amount: number): string {
  return `£${Math.abs(amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-GB');
}

export function generateTransactionsCSV(transactions: any[]): string {
  const headers = ['Date', 'Description', 'Category', 'Amount', 'Type', 'Reference', 'Reconciled'];
  const rows = transactions.map(txn => [
    txn.date,
    txn.description,
    txn.category,
    txn.amount,
    txn.type,
    txn.reference || '',
    txn.reconciled ? 'Yes' : 'No'
  ]);
  return generateCSV(headers, rows);
}
