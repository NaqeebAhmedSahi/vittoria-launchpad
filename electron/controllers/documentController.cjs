// electron/controllers/documentController.cjs
const { ipcMain } = require('electron');
const DocumentService = require('../services/documentService.cjs');
const path = require('path');
const os = require('os');

function registerDocumentIpcHandlers() {
  // List documents with filters
  ipcMain.handle('document:list', async (_event, filters) => {
    try {
      const documents = await DocumentService.list(filters || {});
      return { success: true, documents };
    } catch (error) {
      console.error('[documentController] Error listing documents:', error);
      return { success: false, error: error.message };
    }
  });

  // Get document by ID
  ipcMain.handle('document:getById', async (_event, id) => {
    try {
      const document = await DocumentService.getById(id);
      return { success: true, document };
    } catch (error) {
      console.error('[documentController] Error getting document:', error);
      return { success: false, error: error.message };
    }
  });

  // Create document (metadata only)
  ipcMain.handle('document:create', async (_event, data) => {
    try {
      const documentId = await DocumentService.create(data);
      return { success: true, documentId };
    } catch (error) {
      console.error('[documentController] Error creating document:', error);
      return { success: false, error: error.message };
    }
  });

  // Upload document (file + metadata)
  ipcMain.handle('document:upload', async (_event, { fileData, metadata }) => {
    try {
      // Get storage directory from settings or use default
      const storageDir = path.join(os.homedir(), 'VittoriaDocuments');
      
      const documentId = await DocumentService.uploadDocument(fileData, metadata, storageDir);
      return { success: true, documentId };
    } catch (error) {
      console.error('[documentController] Error uploading document:', error);
      return { success: false, error: error.message };
    }
  });

  // Update document metadata
  ipcMain.handle('document:update', async (_event, { id, data }) => {
    try {
      await DocumentService.update(id, data);
      return { success: true };
    } catch (error) {
      console.error('[documentController] Error updating document:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete document
  ipcMain.handle('document:delete', async (_event, id) => {
    try {
      await DocumentService.delete(id);
      return { success: true };
    } catch (error) {
      console.error('[documentController] Error deleting document:', error);
      return { success: false, error: error.message };
    }
  });

  // Get documents by entity
  ipcMain.handle('document:getByEntity', async (_event, { entityType, entityId }) => {
    try {
      const documents = await DocumentService.getByEntity(entityType, entityId);
      return { success: true, documents };
    } catch (error) {
      console.error('[documentController] Error getting documents by entity:', error);
      return { success: false, error: error.message };
    }
  });

  // Get document categories
  ipcMain.handle('document:getCategories', async () => {
    try {
      const categories = await DocumentService.getCategories();
      return { success: true, categories };
    } catch (error) {
      console.error('[documentController] Error getting categories:', error);
      return { success: false, error: error.message };
    }
  });

  // Download document
  ipcMain.handle('document:download', async (_event, id) => {
    try {
      const { buffer, name, type } = await DocumentService.downloadDocument(id);
      return { 
        success: true, 
        data: {
          base64: buffer.toString('base64'),
          name,
          type
        }
      };
    } catch (error) {
      console.error('[documentController] Error downloading document:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('[documentController] Document IPC handlers registered');
}

module.exports = { registerDocumentIpcHandlers };
