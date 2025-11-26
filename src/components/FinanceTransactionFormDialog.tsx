import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";

interface Firm {
  id: number;
  name: string;
}

interface Mandate {
  id: number;
  name: string;
}

interface FinanceTransactionFormDialogProps {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  transaction?: any;
}

export default function FinanceTransactionFormDialog({ open, onClose, transaction }: FinanceTransactionFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [mandates, setMandates] = useState<Mandate[]>([]);
  
  const [formData, setFormData] = useState({
    transaction_type: "",
    category: "",
    amount: "",
    currency: "GBP",
    description: "",
    transaction_date: new Date().toISOString().split('T')[0],
    firm_id: "",
    mandate_id: "",
    payment_status: "Pending",
    payment_method: "",
    invoice_number: "",
    due_date: "",
  });

  useEffect(() => {
    if (open) {
      loadOptions();
      if (transaction) {
        const transactionDate = transaction.transaction_date 
          ? (typeof transaction.transaction_date === 'string' 
            ? transaction.transaction_date.split('T')[0] 
            : new Date(transaction.transaction_date).toISOString().split('T')[0])
          : new Date().toISOString().split('T')[0];
        
        const dueDate = transaction.due_date
          ? (typeof transaction.due_date === 'string'
            ? transaction.due_date.split('T')[0]
            : new Date(transaction.due_date).toISOString().split('T')[0])
          : "";

        setFormData({
          transaction_type: transaction.transaction_type || "",
          category: transaction.category || "",
          amount: transaction.amount?.toString() || "",
          currency: transaction.currency || "GBP",
          description: transaction.description || "",
          transaction_date: transactionDate,
          firm_id: transaction.firm_id?.toString() || "",
          mandate_id: transaction.mandate_id?.toString() || "",
          payment_status: transaction.payment_status || "Pending",
          payment_method: transaction.payment_method || "",
          invoice_number: transaction.invoice_number || "",
          due_date: dueDate,
        });
      } else {
        setFormData({
          transaction_type: "",
          category: "",
          amount: "",
          currency: "GBP",
          description: "",
          transaction_date: new Date().toISOString().split('T')[0],
          firm_id: "",
          mandate_id: "",
          payment_status: "Pending",
          payment_method: "",
          invoice_number: "",
          due_date: "",
        });
      }
    }
  }, [transaction, open]);

  const loadOptions = async () => {
    try {
      const [firmsResult, mandatesResult] = await Promise.all([
        window.api.firm.list(),
        window.api.mandate.list({}),
      ]);

      if (firmsResult.success) {
        setFirms(firmsResult.firms || []);
      }
      if (mandatesResult.success) {
        setMandates(mandatesResult.mandates || []);
      }
    } catch (error) {
      console.error('Failed to load options:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        transaction_type: formData.transaction_type,
        category: formData.category || null,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        description: formData.description || null,
        transaction_date: formData.transaction_date,
        firm_id: formData.firm_id ? parseInt(formData.firm_id) : null,
        mandate_id: formData.mandate_id ? parseInt(formData.mandate_id) : null,
        payment_status: formData.payment_status,
        payment_method: formData.payment_method || null,
        invoice_number: formData.invoice_number || null,
        due_date: formData.due_date || null,
      };

      let result;
      if (transaction) {
        result = await window.api.finance.update(transaction.id, payload);
      } else {
        result = await window.api.finance.create(payload);
      }

      if (result.success) {
        onClose(true);
      } else {
        alert('Failed to save transaction: ' + result.error);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Edit Transaction' : 'New Transaction'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transaction_type">Transaction Type *</Label>
              <Select
                value={formData.transaction_type}
                onValueChange={(value) => setFormData({ ...formData, transaction_type: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Income">Income</SelectItem>
                  <SelectItem value="Expense">Expense</SelectItem>
                  <SelectItem value="Revenue">Revenue</SelectItem>
                  <SelectItem value="Fee">Fee</SelectItem>
                  <SelectItem value="Retainer">Retainer</SelectItem>
                  <SelectItem value="Commission">Commission</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Placement Fee, Travel"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the transaction"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transaction_date">Transaction Date *</Label>
              <Input
                id="transaction_date"
                type="date"
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_status">Payment Status *</Label>
              <Select
                value={formData.payment_status}
                onValueChange={(value) => setFormData({ ...formData, payment_status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firm_id">Related Firm</Label>
              <Select
                value={formData.firm_id}
                onValueChange={(value) => setFormData({ ...formData, firm_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select firm (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No firm</SelectItem>
                  {firms.map(firm => (
                    <SelectItem key={firm.id} value={firm.id.toString()}>
                      {firm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mandate_id">Related Mandate</Label>
              <Select
                value={formData.mandate_id}
                onValueChange={(value) => setFormData({ ...formData, mandate_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mandate (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No mandate</SelectItem>
                  {mandates.length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No mandates available
                    </div>
                  )}
                  {mandates.map(mandate => (
                    <SelectItem key={mandate.id} value={mandate.id.toString()}>
                      {mandate.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoice_number">Invoice Number</Label>
            <Input
              id="invoice_number"
              value={formData.invoice_number}
              onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              placeholder="e.g., INV-2024-001"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose()} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : (transaction ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
