import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, Upload, Download, Receipt, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Sample expense data
const sampleExpenses = [
  { 
    id: 1, 
    date: "2025-11-15", 
    description: "Office Rent - November", 
    category: "Rent", 
    amount: 2500, 
    vat: 500, 
    total: 3000, 
    status: "approved",
    receipt: true
  },
  { 
    id: 2, 
    date: "2025-11-12", 
    description: "Software Subscriptions", 
    category: "IT & Software", 
    amount: 850, 
    vat: 170, 
    total: 1020, 
    status: "approved",
    receipt: true
  },
  { 
    id: 3, 
    date: "2025-11-10", 
    description: "Marketing Materials", 
    category: "Marketing", 
    amount: 450, 
    vat: 90, 
    total: 540, 
    status: "pending",
    receipt: false
  },
  { 
    id: 4, 
    date: "2025-11-08", 
    description: "Client Entertainment", 
    category: "Entertainment", 
    amount: 320, 
    vat: 0, 
    total: 320, 
    status: "approved",
    receipt: true
  },
  { 
    id: 5, 
    date: "2025-11-05", 
    description: "Office Supplies", 
    category: "Supplies", 
    amount: 180, 
    vat: 36, 
    total: 216, 
    status: "approved",
    receipt: true
  },
];

const expenseCategories = [
  "Rent",
  "IT & Software",
  "Marketing",
  "Travel",
  "Entertainment",
  "Supplies",
  "Professional Fees",
  "Insurance",
  "Utilities",
  "Other"
];

export default function ManageExpenses() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState(sampleExpenses);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: "",
    category: "",
    amount: "",
    vatRate: "20",
  });

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         expense.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || expense.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleSubmit = () => {
    const amount = parseFloat(formData.amount);
    const vatRate = parseFloat(formData.vatRate);
    const vat = (amount * vatRate) / 100;
    const total = amount + vat;

    const newExpense = {
      id: expenses.length + 1,
      date: formData.date,
      description: formData.description,
      category: formData.category,
      amount,
      vat,
      total,
      status: "pending" as const,
      receipt: false,
    };

    if (editingExpense) {
      setExpenses(expenses.map(exp => exp.id === editingExpense.id ? { ...newExpense, id: editingExpense.id } : exp));
      toast({
        title: "Expense updated",
        description: "The expense has been updated successfully.",
      });
    } else {
      setExpenses([newExpense, ...expenses]);
      toast({
        title: "Expense added",
        description: "The expense has been added successfully.",
      });
    }

    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: "",
      category: "",
      amount: "",
      vatRate: "20",
    });
    setEditingExpense(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (expense: any) => {
    setEditingExpense(expense);
    setFormData({
      date: expense.date,
      description: expense.description,
      category: expense.category,
      amount: expense.amount.toString(),
      vatRate: ((expense.vat / expense.amount) * 100).toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setExpenses(expenses.filter(exp => exp.id !== id));
    toast({
      title: "Expense deleted",
      description: "The expense has been removed.",
    });
  };

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.total, 0);
  const totalVAT = filteredExpenses.reduce((sum, exp) => sum + exp.vat, 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/finance/business')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Manage Business Expenses</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track and categorize business expenses
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import Receipt
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingExpense(null);
                setFormData({
                  date: new Date().toISOString().split('T')[0],
                  description: "",
                  category: "",
                  amount: "",
                  vatRate: "20",
                });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingExpense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter expense description..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount">Amount (ex VAT)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="vatRate">VAT Rate (%)</Label>
                    <Select value={formData.vatRate} onValueChange={(value) => setFormData({ ...formData, vatRate: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="5">5%</SelectItem>
                        <SelectItem value="20">20%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!formData.description || !formData.category || !formData.amount}>
                  {editingExpense ? "Update" : "Add"} Expense
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{filteredExpenses.length} expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reclaimable VAT
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{totalVAT.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">From expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {expenses.filter(e => e.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Requires review</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {expenseCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">VAT</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {expense.receipt && <Receipt className="h-3 w-3 text-muted-foreground" />}
                      {expense.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{expense.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right">£{expense.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-right">£{expense.vat.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium">£{expense.total.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={expense.status === 'approved' ? 'default' : 'secondary'}>
                      {expense.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
