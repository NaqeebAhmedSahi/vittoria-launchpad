// electron/models/intakeFolderModel.cjs
const db = require('../db/pgConnection.cjs');

/**
 * Get all folders with document counts
 */
async function getAllFolders() {
  const query = `
    SELECT 
      f.*,
      COUNT(d.id) as document_count
    FROM intake_folders f
    LEFT JOIN intake_folder_documents d ON f.id = d.folder_id
    GROUP BY f.id
    ORDER BY f.name ASC
  `;
  const result = await db.query(query);
  return result.rows;
}

/**
 * Get folder by ID
 */
async function getFolderById(id) {
  const query = 'SELECT * FROM intake_folders WHERE id = $1';
  const result = await db.query(query, [id]);
  return result.rows[0];
}

/**
 * Create a new folder
 */
async function createFolder(folderData) {
  const { name, description } = folderData;

  const query = `
    INSERT INTO intake_folders (name, description)
    VALUES ($1, $2)
    RETURNING *
  `;

  const result = await db.query(query, [name, description]);
  return result.rows[0];
}

/**
 * Get all documents in a folder
 */
async function getDocumentsByFolder(folderId) {
  let query, params;
  
  if (folderId === null || folderId === undefined) {
    // Get documents without a folder
    query = `
      SELECT * FROM intake_folder_documents 
      WHERE folder_id IS NULL 
      ORDER BY uploaded_at DESC
    `;
    params = [];
  } else {
    query = `
      SELECT * FROM intake_folder_documents 
      WHERE folder_id = $1 
      ORDER BY uploaded_at DESC
    `;
    params = [folderId];
  }
  
  const result = await db.query(query, params);
  return result.rows;
}

/**
 * Get document by ID
 */
async function getDocumentById(id) {
  const query = 'SELECT * FROM intake_folder_documents WHERE id = $1';
  const result = await db.query(query, [id]);
  return result.rows[0];
}

/**
 * Create a new document
 */
async function createDocument(documentData) {
  const {
    folder_id,
    name,
    file_name, // Accept both name and file_name
    file_path,
    status = 'pending',
    file_size,
    file_type,
    category = 'other'
  } = documentData;
  
  // Use file_name if provided, otherwise use name
  const fileName = file_name || name;
  
  if (!fileName) {
    throw new Error('file_name or name is required');
  }
  
  // Note: table columns use file_name and uploaded_at
  const query = `
    INSERT INTO intake_folder_documents (folder_id, file_name, file_path, status, file_size, file_type, category, uploaded_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING *
  `;

  const result = await db.query(query, [
    folder_id,
    fileName,
    file_path || '',
    status,
    file_size,
    file_type,
    category
  ]);

  return result.rows[0];
}

/**
 * Update document status
 */
async function updateDocumentStatus(id, status) {
  const query = `
    UPDATE intake_folder_documents 
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;
  const result = await db.query(query, [status, id]);
  return result.rows[0];
}

/**
 * Delete a document
 */
async function deleteDocument(id) {
  const query = 'DELETE FROM intake_folder_documents WHERE id = $1 RETURNING *';
  const result = await db.query(query, [id]);
  return result.rows[0];
}

/**
 * Get all documents (regardless of folder)
 */
async function getAllDocuments() {
  const query = `
    SELECT * FROM intake_folder_documents 
    ORDER BY uploaded_at DESC
  `;
  const result = await db.query(query);
  return result.rows;
}

/**
 * Delete a folder
 */
async function deleteFolder(id) {
  const query = 'DELETE FROM intake_folders WHERE id = $1 RETURNING *';
  const result = await db.query(query, [id]);
  return result.rows[0];
}

module.exports = {
  getAllFolders,
  getFolderById,
  createFolder,
  getDocumentsByFolder,
  getDocumentById,
  createDocument,
  updateDocumentStatus,
  deleteDocument,
  deleteFolder,
  getAllDocuments
};
