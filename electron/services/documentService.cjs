// electron/services/documentService.cjs
const DocumentModel = require('../models/documentModel.cjs');
const fs = require('fs').promises;
const path = require('path');

const DocumentService = {
  async list(filters) {
    return await DocumentModel.list(filters);
  },

  async getById(id) {
    return await DocumentModel.getById(id);
  },

  async create(data) {
    return await DocumentModel.create(data);
  },

  async update(id, data) {
    return await DocumentModel.update(id, data);
  },

  async delete(id) {
    // Get document to find file path
    const doc = await DocumentModel.getById(id);
    
    // Delete from database
    await DocumentModel.delete(id);
    
    // Delete physical file if it exists
    if (doc && doc.file_path) {
      try {
        await fs.unlink(doc.file_path);
        console.log(`[documentService] Deleted file: ${doc.file_path}`);
      } catch (error) {
        console.error(`[documentService] Failed to delete file: ${doc.file_path}`, error);
        // Don't throw - database record is already deleted
      }
    }
  },

  async getByEntity(entityType, entityId) {
    return await DocumentModel.getByEntity(entityType, entityId);
  },

  async getCategories() {
    return await DocumentModel.getCategories();
  },

  /**
   * Upload a document file and create database record
   * @param {string} fileData - Base64 encoded file data
   * @param {Object} metadata - Document metadata including file_name, mime_type, file_size
   * @param {string} storageDir - Base storage directory
   * @returns {Promise<number>} - New document ID
   */
  async uploadDocument(fileData, metadata, storageDir) {
    // Create storage directory if it doesn't exist
    const docsDir = path.join(storageDir, 'documents');
    await fs.mkdir(docsDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = metadata.file_name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${sanitizedName}`;
    const filePath = path.join(docsDir, filename);

    // Convert base64 to buffer and write file to disk
    const buffer = Buffer.from(fileData, 'base64');
    await fs.writeFile(filePath, buffer);

    // Create database record
    const documentData = {
      name: metadata.file_name,
      file_path: filePath,
      file_type: metadata.mime_type,
      file_size: metadata.file_size,
      category: metadata.category,
      description: metadata.description,
      firm_id: metadata.firm_id,
      mandate_id: metadata.mandate_id,
      candidate_id: metadata.candidate_id,
      tags: metadata.tags,
      is_confidential: metadata.is_confidential || false
    };

    const documentId = await DocumentModel.create(documentData);
    return documentId;
  },

  /**
   * Get file content for download
   * @param {number} id
   * @returns {Promise<{buffer: Buffer, name: string, type: string}>}
   */
  async downloadDocument(id) {
    const doc = await DocumentModel.getById(id);
    if (!doc) {
      throw new Error('Document not found');
    }

    const buffer = await fs.readFile(doc.file_path);
    return {
      buffer,
      name: doc.name,
      type: doc.file_type
    };
  }
};

module.exports = DocumentService;
