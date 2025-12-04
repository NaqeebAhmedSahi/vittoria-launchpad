// src/pages/ContactsPage.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Tag,
  Calendar,
  Loader2,
  X,
} from "lucide-react";
import { Contact, ContactFormData, Address } from "@/types/contact";

declare global {
  interface Window {
    api: {
      contacts: {
        getAll: (searchTerm?: string) => Promise<{ success: boolean; contacts?: Contact[]; error?: string }>;
        getById: (id: number) => Promise<{ success: boolean; contact?: Contact; error?: string }>;
        create: (data: ContactFormData) => Promise<{ success: boolean; contact?: Contact; error?: string }>;
        update: (id: number, data: Partial<ContactFormData>) => Promise<{ success: boolean; contact?: Contact; error?: string }>;
        delete: (id: number) => Promise<{ success: boolean; error?: string }>;
        search: (searchTerm: string) => Promise<{ success: boolean; contacts?: Contact[]; error?: string }>;
      };
    };
  }
}

const CATEGORIES = [
  "Client",
  "Prospect",
  "Partner",
  "Vendor",
  "Candidate",
  "Executive",
  "Investor",
  "Board Member",
  "Consultant",
  "Other",
];

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState<ContactFormData>({
    displayName: "",
    givenName: "",
    surname: "",
    middleName: "",
    title: "",
    companyName: "",
    department: "",
    jobTitle: "",
    emailAddress: "",
    businessPhones: [],
    mobilePhone: "",
    homePhones: [],
    businessAddress: {},
    homeAddress: {},
    otherAddress: {},
    birthday: "",
    personalNotes: "",
    categories: [],
  });

  const [newBusinessPhone, setNewBusinessPhone] = useState("");
  const [newHomePhone, setNewHomePhone] = useState("");
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async (search = "") => {
    setLoading(true);
    try {
      const result = await window.api.contacts.getAll(search);
      if (result.success && result.contacts) {
        setContacts(result.contacts);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load contacts",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading contacts:", error);
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadContacts(searchTerm);
  };

  const openCreateDialog = () => {
    setEditingContact(null);
    setFormData({
      displayName: "",
      givenName: "",
      surname: "",
      middleName: "",
      title: "",
      companyName: "",
      department: "",
      jobTitle: "",
      emailAddress: "",
      businessPhones: [],
      mobilePhone: "",
      homePhones: [],
      businessAddress: {},
      homeAddress: {},
      otherAddress: {},
      birthday: "",
      personalNotes: "",
      categories: [],
    });
    setIsFormOpen(true);
  };

  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      displayName: contact.displayName || "",
      givenName: contact.givenName || "",
      surname: contact.surname || "",
      middleName: contact.middleName || "",
      title: contact.title || "",
      companyName: contact.companyName || "",
      department: contact.department || "",
      jobTitle: contact.jobTitle || "",
      emailAddress: contact.emailAddress || "",
      businessPhones: contact.businessPhones || [],
      mobilePhone: contact.mobilePhone || "",
      homePhones: contact.homePhones || [],
      businessAddress: contact.businessAddress || {},
      homeAddress: contact.homeAddress || {},
      otherAddress: contact.otherAddress || {},
      birthday: contact.birthday || "",
      personalNotes: contact.personalNotes || "",
      categories: contact.categories || [],
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.displayName.trim()) {
      toast({
        title: "Validation Error",
        description: "Display name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = editingContact
        ? await window.api.contacts.update(editingContact.id, formData)
        : await window.api.contacts.create(formData);

      if (result.success) {
        toast({
          title: "Success",
          description: `Contact ${editingContact ? "updated" : "created"} successfully`,
        });
        setIsFormOpen(false);
        loadContacts(searchTerm);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save contact",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving contact:", error);
      toast({
        title: "Error",
        description: "Failed to save contact",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingContact) return;

    setLoading(true);
    try {
      const result = await window.api.contacts.delete(deletingContact.id);
      if (result.success) {
        toast({
          title: "Success",
          description: "Contact deleted successfully",
        });
        setIsDeleteOpen(false);
        setDeletingContact(null);
        loadContacts(searchTerm);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete contact",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast({
        title: "Error",
        description: "Failed to delete contact",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const viewContact = (contact: Contact) => {
    setViewingContact(contact);
    setIsViewOpen(true);
  };

  const addBusinessPhone = () => {
    if (newBusinessPhone.trim()) {
      setFormData({
        ...formData,
        businessPhones: [...(formData.businessPhones || []), newBusinessPhone.trim()],
      });
      setNewBusinessPhone("");
    }
  };

  const removeBusinessPhone = (index: number) => {
    setFormData({
      ...formData,
      businessPhones: formData.businessPhones?.filter((_, i) => i !== index) || [],
    });
  };

  const addHomePhone = () => {
    if (newHomePhone.trim()) {
      setFormData({
        ...formData,
        homePhones: [...(formData.homePhones || []), newHomePhone.trim()],
      });
      setNewHomePhone("");
    }
  };

  const removeHomePhone = (index: number) => {
    setFormData({
      ...formData,
      homePhones: formData.homePhones?.filter((_, i) => i !== index) || [],
    });
  };

  const addCategory = () => {
    if (newCategory && !formData.categories?.includes(newCategory)) {
      setFormData({
        ...formData,
        categories: [...(formData.categories || []), newCategory],
      });
      setNewCategory("");
    }
  };

  const removeCategory = (category: string) => {
    setFormData({
      ...formData,
      categories: formData.categories?.filter((c) => c !== category) || [],
    });
  };

  const updateAddress = (type: 'businessAddress' | 'homeAddress' | 'otherAddress', field: keyof Address, value: string) => {
    setFormData({
      ...formData,
      [type]: {
        ...(formData[type] || {}),
        [field]: value,
      },
    });
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your contacts (Microsoft 365 compatible)
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts by name, email, company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} variant="secondary">
          Search
        </Button>
        {searchTerm && (
          <Button onClick={() => { setSearchTerm(""); loadContacts(); }} variant="outline">
            Clear
          </Button>
        )}
      </div>

      {/* Contacts Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Job Title</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  <p className="mt-2 text-muted-foreground">Loading contacts...</p>
                </TableCell>
              </TableRow>
            ) : contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No contacts found. Click "Add Contact" to create your first contact.
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium text-foreground">{contact.displayName}</TableCell>
                  <TableCell>
                    {contact.emailAddress && (
                      <div className="flex items-center gap-1 text-sm text-foreground">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {contact.emailAddress}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.companyName && (
                      <div className="flex items-center gap-1 text-sm text-foreground">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        {contact.companyName}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.jobTitle && (
                      <div className="flex items-center gap-1 text-sm text-foreground">
                        <Briefcase className="h-3 w-3 text-muted-foreground" />
                        {contact.jobTitle}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.mobilePhone && (
                      <div className="flex items-center gap-1 text-sm text-foreground">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {contact.mobilePhone}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {contact.categories?.slice(0, 2).map((cat) => (
                        <Badge key={cat} variant="secondary" className="text-xs">
                          {cat}
                        </Badge>
                      ))}
                      {(contact.categories?.length || 0) > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{(contact.categories?.length || 0) - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewContact(contact)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(contact)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeletingContact(contact);
                          setIsDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? "Edit Contact" : "Add New Contact"}
            </DialogTitle>
            <DialogDescription>
              {editingContact
                ? "Update contact information"
                : "Create a new contact entry"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="displayName">Display Name *</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) =>
                      setFormData({ ...formData, displayName: e.target.value })
                    }
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="givenName">First Name</Label>
                  <Input
                    id="givenName"
                    value={formData.givenName}
                    onChange={(e) =>
                      setFormData({ ...formData, givenName: e.target.value })
                    }
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="surname">Last Name</Label>
                  <Input
                    id="surname"
                    value={formData.surname}
                    onChange={(e) =>
                      setFormData({ ...formData, surname: e.target.value })
                    }
                    placeholder="Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="middleName">Middle Name</Label>
                  <Input
                    id="middleName"
                    value={formData.middleName}
                    onChange={(e) =>
                      setFormData({ ...formData, middleName: e.target.value })
                    }
                    placeholder="Michael"
                  />
                </div>
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Mr., Ms., Dr., etc."
                  />
                </div>
              </div>
            </div>

            {/* Company Information */}
            <div className="space-y-4">
              <h3 className="font-semibold">Company Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName">Company</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                    placeholder="Acme Corp"
                  />
                </div>
                <div>
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    value={formData.jobTitle}
                    onChange={(e) =>
                      setFormData({ ...formData, jobTitle: e.target.value })
                    }
                    placeholder="CEO"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    placeholder="Sales"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold">Contact Information</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="emailAddress">Email</Label>
                  <Input
                    id="emailAddress"
                    type="email"
                    value={formData.emailAddress}
                    onChange={(e) =>
                      setFormData({ ...formData, emailAddress: e.target.value })
                    }
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="mobilePhone">Mobile Phone</Label>
                  <Input
                    id="mobilePhone"
                    value={formData.mobilePhone}
                    onChange={(e) =>
                      setFormData({ ...formData, mobilePhone: e.target.value })
                    }
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div>
                  <Label>Business Phones</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={newBusinessPhone}
                      onChange={(e) => setNewBusinessPhone(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addBusinessPhone())}
                      placeholder="Add business phone"
                    />
                    <Button type="button" onClick={addBusinessPhone} size="sm">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.businessPhones?.map((phone, index) => (
                      <Badge key={index} variant="secondary">
                        {phone}
                        <X
                          className="ml-1 h-3 w-3 cursor-pointer"
                          onClick={() => removeBusinessPhone(index)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Home Phones</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={newHomePhone}
                      onChange={(e) => setNewHomePhone(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHomePhone())}
                      placeholder="Add home phone"
                    />
                    <Button type="button" onClick={addHomePhone} size="sm">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.homePhones?.map((phone, index) => (
                      <Badge key={index} variant="secondary">
                        {phone}
                        <X
                          className="ml-1 h-3 w-3 cursor-pointer"
                          onClick={() => removeHomePhone(index)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Business Address */}
            <div className="space-y-4">
              <h3 className="font-semibold">Business Address</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="businessStreet">Street</Label>
                  <Input
                    id="businessStreet"
                    value={formData.businessAddress?.street || ""}
                    onChange={(e) => updateAddress('businessAddress', 'street', e.target.value)}
                    placeholder="123 Main St"
                  />
                </div>
                <div>
                  <Label htmlFor="businessCity">City</Label>
                  <Input
                    id="businessCity"
                    value={formData.businessAddress?.city || ""}
                    onChange={(e) => updateAddress('businessAddress', 'city', e.target.value)}
                    placeholder="New York"
                  />
                </div>
                <div>
                  <Label htmlFor="businessState">State</Label>
                  <Input
                    id="businessState"
                    value={formData.businessAddress?.state || ""}
                    onChange={(e) => updateAddress('businessAddress', 'state', e.target.value)}
                    placeholder="NY"
                  />
                </div>
                <div>
                  <Label htmlFor="businessPostalCode">Postal Code</Label>
                  <Input
                    id="businessPostalCode"
                    value={formData.businessAddress?.postalCode || ""}
                    onChange={(e) => updateAddress('businessAddress', 'postalCode', e.target.value)}
                    placeholder="10001"
                  />
                </div>
                <div>
                  <Label htmlFor="businessCountry">Country</Label>
                  <Input
                    id="businessCountry"
                    value={formData.businessAddress?.countryOrRegion || ""}
                    onChange={(e) => updateAddress('businessAddress', 'countryOrRegion', e.target.value)}
                    placeholder="USA"
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="font-semibold">Additional Information</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="birthday">Birthday</Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={formData.birthday}
                    onChange={(e) =>
                      setFormData({ ...formData, birthday: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Categories</Label>
                  <div className="flex gap-2 mb-2">
                    <Select value={newCategory} onValueChange={setNewCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" onClick={addCategory} size="sm">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.categories?.map((cat) => (
                      <Badge key={cat} variant="secondary">
                        <Tag className="mr-1 h-3 w-3" />
                        {cat}
                        <X
                          className="ml-1 h-3 w-3 cursor-pointer"
                          onClick={() => removeCategory(cat)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="personalNotes">Personal Notes</Label>
                  <Textarea
                    id="personalNotes"
                    value={formData.personalNotes}
                    onChange={(e) =>
                      setFormData({ ...formData, personalNotes: e.target.value })
                    }
                    placeholder="Add any notes about this contact..."
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingContact ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingContact?.displayName}</DialogTitle>
            <DialogDescription>Contact Details</DialogDescription>
          </DialogHeader>

          {viewingContact && (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              {(viewingContact.givenName || viewingContact.surname || viewingContact.title) && (
                <div>
                  <h3 className="font-semibold mb-2">Basic Information</h3>
                  <div className="space-y-1 text-sm">
                    {viewingContact.title && <p><strong>Title:</strong> {viewingContact.title}</p>}
                    {viewingContact.givenName && <p><strong>First Name:</strong> {viewingContact.givenName}</p>}
                    {viewingContact.surname && <p><strong>Last Name:</strong> {viewingContact.surname}</p>}
                    {viewingContact.middleName && <p><strong>Middle Name:</strong> {viewingContact.middleName}</p>}
                  </div>
                </div>
              )}

              {/* Company Info */}
              {(viewingContact.companyName || viewingContact.jobTitle || viewingContact.department) && (
                <div>
                  <h3 className="font-semibold mb-2">Company Information</h3>
                  <div className="space-y-1 text-sm">
                    {viewingContact.companyName && (
                      <p className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {viewingContact.companyName}
                      </p>
                    )}
                    {viewingContact.jobTitle && (
                      <p className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        {viewingContact.jobTitle}
                      </p>
                    )}
                    {viewingContact.department && <p><strong>Department:</strong> {viewingContact.department}</p>}
                  </div>
                </div>
              )}

              {/* Contact Info */}
              <div>
                <h3 className="font-semibold mb-2">Contact Information</h3>
                <div className="space-y-1 text-sm">
                  {viewingContact.emailAddress && (
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${viewingContact.emailAddress}`} className="text-blue-600 hover:underline">
                        {viewingContact.emailAddress}
                      </a>
                    </p>
                  )}
                  {viewingContact.mobilePhone && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {viewingContact.mobilePhone} (Mobile)
                    </p>
                  )}
                  {viewingContact.businessPhones && viewingContact.businessPhones.length > 0 && (
                    <div>
                      <strong>Business Phones:</strong>
                      <ul className="ml-6">
                        {viewingContact.businessPhones.map((phone, idx) => (
                          <li key={idx}>{phone}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {viewingContact.homePhones && viewingContact.homePhones.length > 0 && (
                    <div>
                      <strong>Home Phones:</strong>
                      <ul className="ml-6">
                        {viewingContact.homePhones.map((phone, idx) => (
                          <li key={idx}>{phone}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Business Address */}
              {viewingContact.businessAddress && Object.keys(viewingContact.businessAddress).length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Business Address</h3>
                  <div className="text-sm">
                    {viewingContact.businessAddress.street && <p>{viewingContact.businessAddress.street}</p>}
                    <p>
                      {[
                        viewingContact.businessAddress.city,
                        viewingContact.businessAddress.state,
                        viewingContact.businessAddress.postalCode,
                      ].filter(Boolean).join(", ")}
                    </p>
                    {viewingContact.businessAddress.countryOrRegion && (
                      <p>{viewingContact.businessAddress.countryOrRegion}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Categories */}
              {viewingContact.categories && viewingContact.categories.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {viewingContact.categories.map((cat) => (
                      <Badge key={cat} variant="secondary">
                        <Tag className="mr-1 h-3 w-3" />
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Birthday */}
              {viewingContact.birthday && (
                <div>
                  <h3 className="font-semibold mb-2">Birthday</h3>
                  <p className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    {new Date(viewingContact.birthday).toLocaleDateString()}
                  </p>
                </div>
              )}

              {/* Notes */}
              {viewingContact.personalNotes && (
                <div>
                  <h3 className="font-semibold mb-2">Personal Notes</h3>
                  <p className="text-sm whitespace-pre-wrap">{viewingContact.personalNotes}</p>
                </div>
              )}

              {/* Sync Status */}
              {viewingContact.isSynced && (
                <div className="pt-4 border-t">
                  <Badge variant="outline">
                    Synced with Microsoft 365
                  </Badge>
                  {viewingContact.lastSyncedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last synced: {new Date(viewingContact.lastSyncedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsViewOpen(false);
              if (viewingContact) openEditDialog(viewingContact);
            }}>
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingContact?.displayName}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
