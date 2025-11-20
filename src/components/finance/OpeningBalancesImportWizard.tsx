import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, ArrowRight, Check, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OpeningBalancesImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (data: any) => void;
}

type Step = 'upload' | 'preview' | 'complete';

export function OpeningBalancesImportWizard({ open, onOpenChange, onComplete }: OpeningBalancesImportWizardProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [accountData, setAccountData] = useState<any[]>([]);
  const { toast } = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleNext = () => {
    if (step === 'upload' && file) {
      // TODO: Parse Excel/CSV file from accountant
      const mockAccountData = [
        { accountCode: '1000', accountName: 'Bank Account', balance: 185000 },
        { accountCode: '1100', accountName: 'Accounts Receivable', balance: 96000 },
        { accountCode: '2000', accountName: 'VAT Control Account', balance: -78500 },
        { accountCode: '2100', accountName: "Director's Loan Account", balance: -3400 },
        { accountCode: '3000', accountName: 'Share Capital', balance: -10000 },
        { accountCode: '4000', accountName: 'Placement Fee Income', balance: -450000 },
        { accountCode: '5000', accountName: 'Operating Expenses', balance: 58250 },
      ];
      setAccountData(mockAccountData);
      setStep('preview');
    } else if (step === 'preview') {
      // TODO: Save opening balances to DB
      toast({
        title: "Import Complete",
        description: `Opening balances for ${accountData.length} accounts imported successfully.`,
      });
      onComplete?.(accountData);
      onOpenChange(false);
      resetWizard();
    }
  };

  const handleBack = () => {
    if (step === 'preview') setStep('upload');
  };

  const resetWizard = () => {
    setStep('upload');
    setFile(null);
    setAccountData([]);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetWizard(); }}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Opening Balances</DialogTitle>
          <DialogDescription>
            Import annual opening balances and chart of accounts from your accountant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex items-center justify-between text-sm">
            <div className={step === 'upload' ? 'font-medium text-primary' : 'text-muted-foreground'}>
              1. Upload File
            </div>
            <div className={step === 'preview' ? 'font-medium text-primary' : 'text-muted-foreground'}>
              2. Preview & Import
            </div>
          </div>

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="max-w-xs mx-auto"
                />
                {file && (
                  <p className="text-sm text-foreground mt-2">
                    Selected: {file.name}
                  </p>
                )}
              </div>
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <h4 className="text-sm font-medium">Expected Format:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Account Code (e.g., 1000, 2100)</li>
                  <li>Account Name (e.g., Bank Account, VAT Control)</li>
                  <li>Opening Balance (numeric)</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                Upload the annual pack from your accountant containing opening balances and chart of accounts.
              </p>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Review {accountData.length} accounts before importing:
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountData.map((account, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">{account.accountCode}</TableCell>
                      <TableCell>{account.accountName}</TableCell>
                      <TableCell className="text-right font-medium">
                        £{Math.abs(account.balance).toLocaleString()}
                        {account.balance < 0 && ' CR'}
                      </TableCell>
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
                  Import Balances
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
