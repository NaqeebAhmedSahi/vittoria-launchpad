// src/types/contact.ts
// TypeScript types for Microsoft 365 compatible contacts

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  countryOrRegion?: string;
}

export interface Contact {
  id: number;
  displayName: string;
  givenName?: string;
  surname?: string;
  middleName?: string;
  title?: string;
  companyName?: string;
  department?: string;
  jobTitle?: string;
  emailAddress?: string;
  businessPhones?: string[];
  mobilePhone?: string;
  homePhones?: string[];
  businessAddress?: Address;
  homeAddress?: Address;
  otherAddress?: Address;
  birthday?: string;
  personalNotes?: string;
  categories?: string[];
  microsoftId?: string;
  changeKey?: string;
  isSynced?: boolean;
  lastSyncedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContactFormData {
  displayName: string;
  givenName?: string;
  surname?: string;
  middleName?: string;
  title?: string;
  companyName?: string;
  department?: string;
  jobTitle?: string;
  emailAddress?: string;
  businessPhones?: string[];
  mobilePhone?: string;
  homePhones?: string[];
  businessAddress?: Address;
  homeAddress?: Address;
  otherAddress?: Address;
  birthday?: string;
  personalNotes?: string;
  categories?: string[];
}
