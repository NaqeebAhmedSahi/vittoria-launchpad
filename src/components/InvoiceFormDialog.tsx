import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
}

export function InvoiceFormDialog({ open, onOpenChange, onSubmit }: InvoiceFormDialogProps) {
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    firm: "",
    mandate: "",
    amount: "",
    vat: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ invoiceNumber: "", firm: "", mandate: "", amount: "", vat: "" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Invoice Number *</Label>
            <Input
              id="invoiceNumber"
              value={formData.invoiceNumber}
              onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              required
              placeholder="e.g., BWS0012"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firm">Client Firm *</Label>
              <Input
                id="firm"
                value={formData.firm}
                onChange={(e) => setFormData({ ...formData, firm: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mandate">Linked Mandate *</Label>
              <Input
                id="mandate"
                value={formData.mandate}
                onChange={(e) => setFormData({ ...formData, mandate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (£) *</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vat">VAT (£) *</Label>
              <Input
                id="vat"
                type="number"
                value={formData.vat}
                onChange={(e) => setFormData({ ...formData, vat: e.target.value })}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Invoice</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
