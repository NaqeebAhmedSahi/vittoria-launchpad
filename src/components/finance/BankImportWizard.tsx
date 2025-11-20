import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, ArrowRight, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BankImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: 'business' | 'personal';
  onComplete?: (transactions: any[]) => void;
}

type Step = 'upload' | 'mapping' | 'preview' | 'complete';

export function BankImportWizard({ open, onOpenChange, entity, onComplete }: BankImportWizardProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [columnMapping, setColumnMapping] = useState({
    date: '',
    description: '',
    amount: '',
    reference: '',
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const { toast } = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleNext = () => {
    if (step === 'upload' && file) {
      // TODO: Parse CSV and extract column headers
      setStep('mapping');
    } else if (step === 'mapping') {
      // TODO: Map columns and parse transactions
      const mockTransactions = [
        {
          date: '2025-11-15',
          description: 'Payment received',
          amount: 5000,
          reference: 'REF001',
          category: 'Income',
          reimbursable: false,
        },
        {
          date: '2025-11-12',
          description: 'Office supplies',
          amount: -250,
          reference: 'REF002',
          category: 'Expenses',
          reimbursable: entity === 'personal',
        },
      ];
      setTransactions(mockTransactions);
      setStep('preview');
    } else if (step === 'preview') {
      // TODO: Save transactions
      toast({
        title: "Import Complete",
        description: `${transactions.length} transactions imported successfully.`,
      });
      onComplete?.(transactions);
      onOpenChange(false);
      resetWizard();
    }
  };

  const handleBack = () => {
    if (step === 'mapping') setStep('upload');
    else if (step === 'preview') setStep('mapping');
  };

  const resetWizard = () => {
    setStep('upload');
    setFile(null);
    setColumnMapping({ date: '', description: '', amount: '', reference: '' });
    setTransactions([]);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetWizard(); }}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Bank Transactions</DialogTitle>
          <DialogDescription>
            Upload a CSV file from your bank and map the columns to import transactions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex items-center justify-between text-sm">
            <div className={step === 'upload' ? 'font-medium text-primary' : 'text-muted-foreground'}>
              1. Upload
            </div>
            <div className={step === 'mapping' ? 'font-medium text-primary' : 'text-muted-foreground'}>
              2. Map Columns
            </div>
            <div className={step === 'preview' ? 'font-medium text-primary' : 'text-muted-foreground'}>
              3. Preview
            </div>
          </div>

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="max-w-xs mx-auto"
                />
                {file && (
                  <p className="text-sm text-foreground mt-2">
                    Selected: {file.name}
                  </p>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Upload a CSV file exported from your bank. Make sure it contains transaction date, description, and amount columns.
              </p>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Map your CSV columns to the transaction fields:
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date Column</Label>
                  <Select value={columnMapping.date} onValueChange={(v) => setColumnMapping({...columnMapping, date: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="col_a">Column A - Date</SelectItem>
                      <SelectItem value="col_b">Column B - Transaction Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Description Column</Label>
                  <Select value={columnMapping.description} onValueChange={(v) => setColumnMapping({...columnMapping, description: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="col_c">Column C - Description</SelectItem>
                      <SelectItem value="col_d">Column D - Details</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Amount Column</Label>
                  <Select value={columnMapping.amount} onValueChange={(v) => setColumnMapping({...columnMapping, amount: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="col_e">Column E - Amount</SelectItem>
                      <SelectItem value="col_f">Column F - Value</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Reference Column (optional)</Label>
                  <Select value={columnMapping.reference} onValueChange={(v) => setColumnMapping({...columnMapping, reference: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="col_g">Column G - Reference</SelectItem>
                      <SelectItem value="col_h">Column H - Transaction ID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Review {transactions.length} transactions before importing:
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Category</TableHead>
                    {entity === 'personal' && <TableHead>Reimbursable</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{txn.date}</TableCell>
                      <TableCell>{txn.description}</TableCell>
                      <TableCell className="text-right">
                        £{Math.abs(txn.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Select defaultValue={txn.category}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Income">Income</SelectItem>
                            <SelectItem value="Expenses">Expenses</SelectItem>
                            <SelectItem value="Transfer">Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {entity === 'personal' && (
                        <TableCell>
                          <Checkbox defaultChecked={txn.reimbursable} />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 'upload'}
            >
              Back
            </Button>
            <Button onClick={handleNext} disabled={step === 'upload' && !file}>
              {step === 'preview' ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Import Transactions
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
