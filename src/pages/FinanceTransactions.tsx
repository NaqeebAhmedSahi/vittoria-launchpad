import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign, TrendingUp, TrendingDown, Search, SquarePen, Trash2, X, ArrowRightLeft, Info } from 'lucide-react';
import FinanceTransactionFormDialog from '@/components/FinanceTransactionFormDialog';

interface FinanceTransaction {
  id: number;
  transaction_type: string;
  category?: string | null;
  amount: number;
  currency: string;
  description?: string | null;
  transaction_date: string;
  firm_name?: string;
  mandate_name?: string;
  candidate_name?: string;
  payment_status: string;
  invoice_number?: string | null;
  payment_method?: string | null;
  payment_date?: string | null;
  tax_amount?: number | null;
  notes?: string | null;
  creator_name?: string;
}

export default function FinanceTransactions() {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [displayCurrency, setDisplayCurrency] = useState<string>('GBP');
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | undefined>(undefined);
  const [selectedTransaction, setSelectedTransaction] = useState<FinanceTransaction | null>(null);
  const [showExchangeRates, setShowExchangeRates] = useState(false);

  // Exchange rates (relative to GBP as base)
  const exchangeRates: { [key: string]: number } = {
    'GBP': 1.0,
    'USD': 1.27,
    'EUR': 1.17,
    'CHF': 1.12,
    'JPY': 189.5,
    'AUD': 1.93,
    'CAD': 1.71,
    'INR': 105.8,
    'AED': 4.66,
    'SGD': 1.70,
  };

  useEffect(() => {
    loadTransactions();
  }, [selectedType, selectedStatus]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (selectedType !== 'all') filters.transaction_type = selectedType;
      if (selectedStatus !== 'all') filters.payment_status = selectedStatus;

      const result = await window.api.finance.list(filters);
      if (result.success && result.transactions) {
        setTransactions(result.transactions);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      const result = await window.api.finance.delete(id);
      if (result.success) {
        loadTransactions();
      } else {
        alert('Failed to delete transaction: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert('Failed to delete transaction');
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency || 'GBP'
    }).format(amount);
  };

  // Convert amount from original currency to display currency
  const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string = displayCurrency): number => {
    if (fromCurrency === toCurrency) return amount;
    
    // Convert to GBP first (base currency)
    const amountInGBP = amount / (exchangeRates[fromCurrency] || 1);
    // Then convert to target currency
    const convertedAmount = amountInGBP * (exchangeRates[toCurrency] || 1);
    
    return convertedAmount;
  };

  // Format with conversion
  const formatWithConversion = (amount: number, originalCurrency: string) => {
    const convertedAmount = convertCurrency(amount, originalCurrency, displayCurrency);
    return formatCurrency(convertedAmount, displayCurrency);
  };

  // Get currency symbol
  const getCurrencySymbol = (currency: string): string => {
    const symbols: { [key: string]: string } = {
      'GBP': '£',
      'USD': '$',
      'EUR': '€',
      'CHF': 'CHF',
      'JPY': '¥',
      'AUD': 'A$',
      'CAD': 'C$',
      'INR': '₹',
      'AED': 'د.إ',
      'SGD': 'S$',
    };
    return symbols[currency] || currency;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'overdue':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getTypeIcon = (type: string) => {
    return type.toLowerCase().includes('income') || type.toLowerCase().includes('revenue')
      ? <TrendingUp className="w-4 h-4 text-green-500" />
      : <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const totalIncome = transactions
    .filter(t => t.transaction_type.toLowerCase().includes('income') || t.transaction_type.toLowerCase().includes('revenue'))
    .reduce((sum, t) => sum + convertCurrency(Number(t.amount) || 0, t.currency, displayCurrency), 0);

  const totalExpense = transactions
    .filter(t => !t.transaction_type.toLowerCase().includes('income') && !t.transaction_type.toLowerCase().includes('revenue'))
    .reduce((sum, t) => sum + convertCurrency(Number(t.amount) || 0, t.currency, displayCurrency), 0);

  // Get unique currencies in transactions
  const uniqueCurrencies = [...new Set(transactions.map(t => t.currency))].sort();

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={selectedTransaction ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Finance Transactions</h1>
              <p className="text-muted-foreground">Track income and expenses</p>
            </div>
            <div className="flex gap-2">
              <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GBP">GBP £</SelectItem>
                  <SelectItem value="USD">USD $</SelectItem>
                  <SelectItem value="EUR">EUR €</SelectItem>
                  <SelectItem value="CHF">CHF</SelectItem>
                  <SelectItem value="JPY">JPY ¥</SelectItem>
                  <SelectItem value="AUD">AUD $</SelectItem>
                  <SelectItem value="CAD">CAD $</SelectItem>
                  <SelectItem value="INR">INR ₹</SelectItem>
                  <SelectItem value="AED">AED</SelectItem>
                  <SelectItem value="SGD">SGD $</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setShowFormDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Transaction
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalIncome, displayCurrency)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">All currencies converted to {displayCurrency}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalExpense, displayCurrency)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">All currencies converted to {displayCurrency}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalIncome - totalExpense, displayCurrency)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">All currencies converted to {displayCurrency}</p>
              </CardContent>
            </Card>
          </div>

          {uniqueCurrencies.length > 1 && (
            <div className="mb-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      <span className="font-medium">{uniqueCurrencies.length} currencies detected:</span>{' '}
                      {uniqueCurrencies.map(curr => getCurrencySymbol(curr)).join(', ')}
                      {' '}• All amounts converted to <span className="font-semibold">{displayCurrency}</span>
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowExchangeRates(!showExchangeRates)}
                    className="text-blue-700 hover:text-blue-900 dark:text-blue-300"
                  >
                    <Info className="w-4 h-4 mr-1" />
                    {showExchangeRates ? 'Hide' : 'Show'} Rates
                  </Button>
                </div>
                
                {showExchangeRates && (
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">Exchange Rates (relative to {displayCurrency}):</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {uniqueCurrencies.filter(curr => curr !== displayCurrency).map(currency => (
                        <div key={currency} className="text-xs bg-white dark:bg-blue-900 p-2 rounded border border-blue-200 dark:border-blue-700">
                          <span className="font-medium">{currency}</span>
                          <span className="text-muted-foreground mx-1">→</span>
                          <span className="font-semibold">{(exchangeRates[displayCurrency] / exchangeRates[currency]).toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Note: Exchange rates are approximate and for reference only. All currencies are converted via GBP as base.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <CardTitle>All Transactions</CardTitle>
                  <CardDescription>View and manage financial transactions</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Income">Income</SelectItem>
                      <SelectItem value="Expense">Expense</SelectItem>
                      <SelectItem value="Revenue">Revenue</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions found. Create your first transaction to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Related To</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Original Amount</TableHead>
                      <TableHead>Amount ({displayCurrency})</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map(transaction => (
                      <TableRow key={transaction.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedTransaction(transaction)}>
                        <TableCell>{new Date(transaction.transaction_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(transaction.transaction_type)}
                            {transaction.transaction_type}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{transaction.description || '—'}</TableCell>
                        <TableCell>{transaction.firm_name || transaction.mandate_name || '—'}</TableCell>
                        <TableCell>{transaction.invoice_number || '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          <div className="flex items-center gap-2">
                            {formatCurrency(transaction.amount, transaction.currency)}
                            {transaction.currency !== displayCurrency && (
                              <Badge variant="outline" className="text-xs">
                                {transaction.currency}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {formatWithConversion(transaction.amount, transaction.currency)}
                            {transaction.currency !== displayCurrency && (
                              <ArrowRightLeft className="w-3 h-3 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(transaction.payment_status)}>
                            {transaction.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditingTransaction(transaction); setShowFormDialog(true); }}>
                            <SquarePen className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleDelete(transaction.id); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detail Panel */}
        {selectedTransaction && (
          <div>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Transaction Details</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setSelectedTransaction(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Transaction Type */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Transaction Type</label>
                  <div className="flex items-center gap-2 mt-1">
                    {getTypeIcon(selectedTransaction.transaction_type)}
                    <p className="font-medium">{selectedTransaction.transaction_type}</p>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Original Amount</label>
                  <p className="text-lg font-semibold mt-1">
                    {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                  </p>
                </div>

                {/* Converted Amount */}
                {selectedTransaction.currency !== displayCurrency && (
                  <div className="bg-muted/30 p-3 rounded-lg border">
                    <label className="text-sm font-medium text-muted-foreground">Converted Amount ({displayCurrency})</label>
                    <p className="text-2xl font-bold mt-1">
                      {formatWithConversion(selectedTransaction.amount, selectedTransaction.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rate: 1 {selectedTransaction.currency} = {(exchangeRates[displayCurrency] / exchangeRates[selectedTransaction.currency]).toFixed(4)} {displayCurrency}
                    </p>
                  </div>
                )}

                {/* Date */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date</label>
                  <p className="mt-1">
                    {new Date(selectedTransaction.transaction_date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                {/* Payment Status */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Payment Status</label>
                  <div className="mt-1">
                    <Badge variant={getStatusColor(selectedTransaction.payment_status)}>
                      {selectedTransaction.payment_status}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                {selectedTransaction.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="mt-1">{selectedTransaction.description}</p>
                  </div>
                )}

                {/* Related Entities - Grouped */}
                {(selectedTransaction.firm_name || selectedTransaction.mandate_name || selectedTransaction.candidate_name) && (
                  <div className="pt-2 border-t">
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Related To</label>
                    
                    {selectedTransaction.firm_name && (
                      <div className="mb-2 pl-2">
                        <label className="text-xs text-muted-foreground">Firm</label>
                        <p className="font-medium">{selectedTransaction.firm_name}</p>
                      </div>
                    )}

                    {selectedTransaction.mandate_name && (
                      <div className="mb-2 pl-2">
                        <label className="text-xs text-muted-foreground">Mandate</label>
                        <p className="font-medium">{selectedTransaction.mandate_name}</p>
                      </div>
                    )}

                    {selectedTransaction.candidate_name && (
                      <div className="pl-2">
                        <label className="text-xs text-muted-foreground">Candidate</label>
                        <p className="font-medium">{selectedTransaction.candidate_name}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Invoice Number */}
                {selectedTransaction.invoice_number && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Invoice Number</label>
                    <p className="mt-1">{selectedTransaction.invoice_number}</p>
                  </div>
                )}

                {/* Payment Method */}
                {selectedTransaction.payment_method && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
                    <p className="mt-1">{selectedTransaction.payment_method}</p>
                  </div>
                )}

                {/* Tax Amount */}
                {selectedTransaction.tax_amount && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tax Amount</label>
                    <p className="mt-1">
                      {formatCurrency(selectedTransaction.tax_amount, selectedTransaction.currency)}
                      {selectedTransaction.currency !== displayCurrency && (
                        <span className="text-muted-foreground text-sm ml-2">
                          (≈ {formatWithConversion(selectedTransaction.tax_amount, selectedTransaction.currency)})
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {selectedTransaction.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Notes</label>
                    <p className="mt-1">{selectedTransaction.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

      </div>

      <FinanceTransactionFormDialog
        open={showFormDialog}
        transaction={editingTransaction}
        onClose={(refresh) => {
          setShowFormDialog(false);
          setEditingTransaction(undefined);
          if (refresh) loadTransactions();
        }}
      />
    </div>
  );
}
