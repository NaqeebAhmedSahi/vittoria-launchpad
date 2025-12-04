// electron/controllers/contactController.cjs
// IPC handlers for contact operations

const { ipcMain } = require('electron');
const contactModel = require('../models/contactModel.cjs');

/**
 * Transform database row to camelCase for frontend
 */
function transformContact(contact) {
  if (!contact) return null;
  
  return {
    id: contact.id,
    displayName: contact.display_name,
    givenName: contact.given_name,
    surname: contact.surname,
    middleName: contact.middle_name,
    title: contact.title,
    companyName: contact.company_name,
    department: contact.department,
    jobTitle: contact.job_title,
    emailAddress: contact.email_address,
    businessPhones: contact.business_phones,
    mobilePhone: contact.mobile_phone,
    homePhones: contact.home_phones,
    businessAddress: contact.business_address,
    homeAddress: contact.home_address,
    otherAddress: contact.other_address,
    birthday: contact.birthday,
    personalNotes: contact.personal_notes,
    categories: contact.categories,
    microsoftId: contact.microsoft_id,
    changeKey: contact.change_key,
    isSynced: contact.is_synced,
    lastSyncedAt: contact.last_synced_at,
    createdAt: contact.created_at,
    updatedAt: contact.updated_at
  };
}

/**
 * Register all contact-related IPC handlers
 */
function registerContactHandlers() {
  // Get all contacts
  ipcMain.handle('contacts:getAll', async (event, searchTerm) => {
    try {
      const contacts = await contactModel.getAllContacts(searchTerm);
      return { success: true, contacts: contacts.map(transformContact) };
    } catch (error) {
      console.error('[contactController] Error getting all contacts:', error);
      return { success: false, error: error.message };
    }
  });

  // Get contact by ID
  ipcMain.handle('contacts:getById', async (event, id) => {
    try {
      const contact = await contactModel.getContactById(id);
      if (!contact) {
        return { success: false, error: 'Contact not found' };
      }
      return { success: true, contact: transformContact(contact) };
    } catch (error) {
      console.error('[contactController] Error getting contact by ID:', error);
      return { success: false, error: error.message };
    }
  });

  // Create new contact
  ipcMain.handle('contacts:create', async (event, contactData) => {
    try {
      const contact = await contactModel.createContact(contactData);
      return { success: true, contact: transformContact(contact) };
    } catch (error) {
      console.error('[contactController] Error creating contact:', error);
      return { success: false, error: error.message };
    }
  });

  // Update contact
  ipcMain.handle('contacts:update', async (event, id, contactData) => {
    try {
      const contact = await contactModel.updateContact(id, contactData);
      if (!contact) {
        return { success: false, error: 'Contact not found' };
      }
      return { success: true, contact: transformContact(contact) };
    } catch (error) {
      console.error('[contactController] Error updating contact:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete contact
  ipcMain.handle('contacts:delete', async (event, id) => {
    try {
      const deleted = await contactModel.deleteContact(id);
      if (!deleted) {
        return { success: false, error: 'Contact not found' };
      }
      return { success: true };
    } catch (error) {
      console.error('[contactController] Error deleting contact:', error);
      return { success: false, error: error.message };
    }
  });

  // Get contacts by category
  ipcMain.handle('contacts:getByCategory', async (event, category) => {
    try {
      const contacts = await contactModel.getContactsByCategory(category);
      return { success: true, contacts: contacts.map(transformContact) };
    } catch (error) {
      console.error('[contactController] Error getting contacts by category:', error);
      return { success: false, error: error.message };
    }
  });

  // Get contacts by company
  ipcMain.handle('contacts:getByCompany', async (event, companyName) => {
    try {
      const contacts = await contactModel.getContactsByCompany(companyName);
      return { success: true, contacts: contacts.map(transformContact) };
    } catch (error) {
      console.error('[contactController] Error getting contacts by company:', error);
      return { success: false, error: error.message };
    }
  });

  // Search contacts
  ipcMain.handle('contacts:search', async (event, searchTerm) => {
    try {
      const contacts = await contactModel.searchContacts(searchTerm);
      return { success: true, contacts: contacts.map(transformContact) };
    } catch (error) {
      console.error('[contactController] Error searching contacts:', error);
      return { success: false, error: error.message };
    }
  });

  // Bulk import contacts (for M365 sync)
  ipcMain.handle('contacts:bulkImport', async (event, contacts) => {
    try {
      const result = await contactModel.bulkImportContacts(contacts);
      return { success: true, ...result };
    } catch (error) {
      console.error('[contactController] Error bulk importing contacts:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('[contactController] Contact handlers registered');
}

module.exports = { registerContactHandlers };
