// electron/controllers/emailController.cjs
const { ipcMain } = require('electron');
const emailModel = require('../models/emailModel.cjs');

function setupEmailHandlers() {
  // Get emails by mailbox
  ipcMain.handle('emails:getByMailbox', async (event, mailbox) => {
    try {
      const emails = await emailModel.getEmailsByMailbox(mailbox);
      return { success: true, emails };
    } catch (error) {
      console.error('[emailController] Error getting emails:', error);
      return { success: false, error: error.message };
    }
  });

  // Get email by ID
  ipcMain.handle('emails:getById', async (event, id) => {
    try {
      const email = await emailModel.getEmailById(id);
      return { success: true, email };
    } catch (error) {
      console.error('[emailController] Error getting email:', error);
      return { success: false, error: error.message };
    }
  });

  // Create email (send)
  ipcMain.handle('emails:create', async (event, emailData) => {
    try {
      const email = await emailModel.createEmail(emailData);
      return { success: true, email };
    } catch (error) {
      console.error('[emailController] Error creating email:', error);
      return { success: false, error: error.message };
    }
  });

  // Update email status
  ipcMain.handle('emails:updateStatus', async (event, { id, status }) => {
    try {
      const email = await emailModel.updateEmailStatus(id, status);
      return { success: true, email };
    } catch (error) {
      console.error('[emailController] Error updating email status:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete email
  ipcMain.handle('emails:delete', async (event, id) => {
    try {
      const email = await emailModel.deleteEmail(id);
      return { success: true, email };
    } catch (error) {
      console.error('[emailController] Error deleting email:', error);
      return { success: false, error: error.message };
    }
  });

  // Get unread count
  ipcMain.handle('emails:getUnreadCount', async (event, mailbox) => {
    try {
      const count = await emailModel.getUnreadCount(mailbox);
      return { success: true, count };
    } catch (error) {
      console.error('[emailController] Error getting unread count:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { setupEmailHandlers };
