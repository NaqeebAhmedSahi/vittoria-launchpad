// electron/controllers/intakeFolderController.cjs
const { ipcMain } = require('electron');
const intakeFolderModel = require('../models/intakeFolderModel.cjs');

function setupIntakeFolderHandlers() {
  // Get all folders
  ipcMain.handle('intakeFolders:getAll', async (event) => {
    try {
      const folders = await intakeFolderModel.getAllFolders();
      return { success: true, folders };
    } catch (error) {
      console.error('[intakeFolderController] Error getting folders:', error);
      return { success: false, error: error.message };
    }
  });

  // Get folder by ID
  ipcMain.handle('intakeFolders:getById', async (event, id) => {
    try {
      const folder = await intakeFolderModel.getFolderById(id);
      return { success: true, folder };
    } catch (error) {
      console.error('[intakeFolderController] Error getting folder:', error);
      return { success: false, error: error.message };
    }
  });

  // Create folder
  ipcMain.handle('intakeFolders:create', async (event, folderData) => {
    try {
      const folder = await intakeFolderModel.createFolder(folderData);
      return { success: true, folder };
    } catch (error) {
      console.error('[intakeFolderController] Error creating folder:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete folder
  ipcMain.handle('intakeFolders:delete', async (event, id) => {
    try {
      const folder = await intakeFolderModel.deleteFolder(id);
      return { success: true, folder };
    } catch (error) {
      console.error('[intakeFolderController] Error deleting folder:', error);
      return { success: false, error: error.message };
    }
  });

  // Get documents by folder
  ipcMain.handle('intakeFolders:getDocuments', async (event, folderId) => {
    try {
      const documents = await intakeFolderModel.getDocumentsByFolder(folderId);
      return { success: true, documents };
    } catch (error) {
      console.error('[intakeFolderController] Error getting documents:', error);
      return { success: false, error: error.message };
    }
  });

  // Get document by ID
  ipcMain.handle('intakeFolders:getDocumentById', async (event, id) => {
    try {
      const document = await intakeFolderModel.getDocumentById(id);
      return { success: true, document };
    } catch (error) {
      console.error('[intakeFolderController] Error getting document:', error);
      return { success: false, error: error.message };
    }
  });

  // Create document
  ipcMain.handle('intakeFolders:createDocument', async (event, documentData) => {
    try {
      const document = await intakeFolderModel.createDocument(documentData);
      return { success: true, document };
    } catch (error) {
      console.error('[intakeFolderController] Error creating document:', error);
      return { success: false, error: error.message };
    }
  });

  // Upload files via system dialog, copy into app storage and create document records
  ipcMain.handle('intakeFolders:uploadFiles', async (event, { folderId }) => {
    try {
      const { dialog, app } = require('electron');
      const fs = require('fs');
      const path = require('path');

      const res = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections']
      });

      if (res.canceled || !res.filePaths || res.filePaths.length === 0) {
        return { success: true, uploaded: [] };
      }

      const storageDir = path.join(app.getPath('userData'), 'intake_documents', String(folderId));
      fs.mkdirSync(storageDir, { recursive: true });

      const uploadedDocs = [];

      // simple extension -> category map
      const extToCategory = (ext) => {
        const e = ext.toLowerCase();
        if (['.pdf'].includes(e)) return 'pdf';
        if (['.doc', '.docx', '.odt', '.rtf'].includes(e)) return 'doc';
        if (['.ppt', '.pptx', '.key', '.odp'].includes(e)) return 'slide';
        if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.tiff'].includes(e)) return 'image';
        if (['.mp3', '.wav', '.ogg', '.m4a', '.flac'].includes(e)) return 'audio';
        return 'other';
      };

      for (const srcPath of res.filePaths) {
        const stat = fs.statSync(srcPath);
        const originalName = path.basename(srcPath);
        const ext = path.extname(originalName) || '';
        const timestamp = Date.now();
        const destName = `${timestamp}_${originalName}`;
        const destPath = path.join(storageDir, destName);

        // copy file into app storage
        fs.copyFileSync(srcPath, destPath);

        const category = extToCategory(ext);

        // create DB record
        const doc = await intakeFolderModel.createDocument({
          folder_id: folderId,
          name: originalName,
          file_path: destPath,
          status: 'pending',
          file_size: stat.size,
          file_type: ext.replace('.', ''),
          category
        });

        uploadedDocs.push(doc);
      }

      return { success: true, uploaded: uploadedDocs };
    } catch (error) {
      console.error('[intakeFolderController] Error uploading files:', error);
      return { success: false, error: error.message };
    }
  });

  // Upload directories: allow selecting folders and copy recursively
  ipcMain.handle('intakeFolders:uploadFolder', async (event, { folderId }) => {
    try {
      const { dialog, app } = require('electron');
      const fs = require('fs');
      const path = require('path');

      const res = await dialog.showOpenDialog({
        properties: ['openDirectory', 'multiSelections']
      });

      if (res.canceled || !res.filePaths || res.filePaths.length === 0) {
        return { success: true, uploaded: [] };
      }

      const storageDir = path.join(app.getPath('userData'), 'intake_documents', String(folderId));
      fs.mkdirSync(storageDir, { recursive: true });

      const uploadedDocs = [];

      const extToCategory = (ext) => {
        const e = ext.toLowerCase();
        if (['.pdf'].includes(e)) return 'pdf';
        if (['.doc', '.docx', '.odt', '.rtf'].includes(e)) return 'doc';
        if (['.ppt', '.pptx', '.key', '.odp'].includes(e)) return 'slide';
        if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.tiff'].includes(e)) return 'image';
        if (['.mp3', '.wav', '.ogg', '.m4a', '.flac'].includes(e)) return 'audio';
        return 'other';
      };

      // recursive walker
      function walkDir(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const ent of entries) {
          const full = path.join(dir, ent.name);
          if (ent.isDirectory()) {
            walkDir(full);
          } else if (ent.isFile()) {
            const stat = fs.statSync(full);
            const originalName = ent.name;
            const ext = path.extname(originalName) || '';
            const timestamp = Date.now();
            const destName = `${timestamp}_${originalName}`;
            const destPath = path.join(storageDir, destName);
            fs.copyFileSync(full, destPath);
            const category = extToCategory(ext);
            // create DB record
            // eslint-disable-next-line no-await-in-loop
            const doc = intakeFolderModel.createDocument({
              folder_id: folderId,
              name: originalName,
              file_path: destPath,
              status: 'pending',
              file_size: stat.size,
              file_type: ext.replace('.', ''),
              category
            });
            uploadedDocs.push(doc);
          }
        }
      }

      for (const srcDir of res.filePaths) {
        walkDir(srcDir);
      }

      // wait for any pending promises to resolve (createDocument returns rows synchronously above)
      const resolved = await Promise.all(uploadedDocs);

      return { success: true, uploaded: resolved };
    } catch (error) {
      console.error('[intakeFolderController] Error uploading folder:', error);
      return { success: false, error: error.message };
    }
  });

  // Asynchronous upload with progress events (files)
  ipcMain.handle('intakeFolders:uploadFilesAsync', async (event, { folderId }) => {
    try {
      const { dialog, app } = require('electron');
      const fs = require('fs').promises;
      const fsSync = require('fs');
      const path = require('path');

      const res = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections']
      });

      if (res.canceled || !res.filePaths || res.filePaths.length === 0) {
        return { success: true, uploaded: [] };
      }

      const storageDir = path.join(app.getPath('userData'), 'intake_documents', String(folderId));
      fsSync.mkdirSync(storageDir, { recursive: true });

      const files = res.filePaths;
      const total = files.length;
      let completed = 0;
      const uploaded = [];

      const extToCategory = (ext) => {
        const e = ext.toLowerCase();
        if (['.pdf'].includes(e)) return 'pdf';
        if (['.doc', '.docx', '.odt', '.rtf'].includes(e)) return 'doc';
        if (['.ppt', '.pptx', '.key', '.odp'].includes(e)) return 'slide';
        if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.tiff'].includes(e)) return 'image';
        if (['.mp3', '.wav', '.ogg', '.m4a', '.flac'].includes(e)) return 'audio';
        return 'other';
      };

      for (const srcPath of files) {
        const stat = fsSync.statSync(srcPath);
        const originalName = path.basename(srcPath);
        const ext = path.extname(originalName) || '';
        const timestamp = Date.now();
        const destName = `${timestamp}_${originalName}`;
        const destPath = path.join(storageDir, destName);

        // copy file async
        await fs.copyFile(srcPath, destPath);

        const category = extToCategory(ext);

        const doc = await intakeFolderModel.createDocument({
          folder_id: folderId,
          name: originalName,
          file_path: destPath,
          status: 'pending',
          file_size: stat.size,
          file_type: ext.replace('.', ''),
          category
        });

        uploaded.push(doc);
        completed += 1;

        // send progress update
        try {
          event.sender.send('intakeFolders:uploadProgress', {
            folderId,
            filename: originalName,
            completed,
            total,
            percent: Math.round((completed / total) * 100),
          });
        } catch (e) {
          // ignore
        }
      }

      event.sender.send('intakeFolders:uploadComplete', { folderId, uploaded });

      return { success: true, uploaded };
    } catch (error) {
      console.error('[intakeFolderController] Error uploading files async:', error);
      return { success: false, error: error.message };
    }
  });

  // Asynchronous upload with progress events (folders)
  ipcMain.handle('intakeFolders:uploadFolderAsync', async (event, { folderId }) => {
    try {
      const { dialog, app } = require('electron');
      const fs = require('fs').promises;
      const fsSync = require('fs');
      const path = require('path');

      const res = await dialog.showOpenDialog({
        properties: ['openDirectory', 'multiSelections']
      });

      if (res.canceled || !res.filePaths || res.filePaths.length === 0) {
        return { success: true, uploaded: [] };
      }

      const storageDir = path.join(app.getPath('userData'), 'intake_documents', String(folderId));
      fsSync.mkdirSync(storageDir, { recursive: true });

      const extToCategory = (ext) => {
        const e = ext.toLowerCase();
        if (['.pdf'].includes(e)) return 'pdf';
        if (['.doc', '.docx', '.odt', '.rtf'].includes(e)) return 'doc';
        if (['.ppt', '.pptx', '.key', '.odp'].includes(e)) return 'slide';
        if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.tiff'].includes(e)) return 'image';
        if (['.mp3', '.wav', '.ogg', '.m4a', '.flac'].includes(e)) return 'audio';
        return 'other';
      };

      // collect files recursively
      const collectFiles = async (dir) => {
        const list = [];
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const ent of entries) {
          const full = path.join(dir, ent.name);
          if (ent.isDirectory()) {
            const sub = await collectFiles(full);
            list.push(...sub);
          } else if (ent.isFile()) {
            list.push(full);
          }
        }
        return list;
      };

      let files = [];
      for (const d of res.filePaths) {
        const collected = await collectFiles(d);
        files.push(...collected);
      }

      const total = files.length;
      let completed = 0;
      const uploaded = [];

      for (const srcPath of files) {
        const stat = fsSync.statSync(srcPath);
        const originalName = path.basename(srcPath);
        const ext = path.extname(originalName) || '';
        const timestamp = Date.now();
        const destName = `${timestamp}_${originalName}`;
        const destPath = path.join(storageDir, destName);

        await fs.copyFile(srcPath, destPath);

        const category = extToCategory(ext);

        const doc = await intakeFolderModel.createDocument({
          folder_id: folderId,
          name: originalName,
          file_path: destPath,
          status: 'pending',
          file_size: stat.size,
          file_type: ext.replace('.', ''),
          category
        });

        uploaded.push(doc);
        completed += 1;

        event.sender.send('intakeFolders:uploadProgress', {
          folderId,
          filename: originalName,
          completed,
          total,
          percent: Math.round((completed / total) * 100),
        });
      }

      event.sender.send('intakeFolders:uploadComplete', { folderId, uploaded });

      return { success: true, uploaded };
    } catch (error) {
      console.error('[intakeFolderController] Error uploading folder async:', error);
      return { success: false, error: error.message };
    }
  });

  // Upload given file/folder paths (async) — used for drag-and-drop or programmatic uploads
  ipcMain.handle('intakeFolders:uploadPathsAsync', async (event, { folderId, paths }) => {
    try {
      const fs = require('fs').promises;
      const fsSync = require('fs');
      const path = require('path');
      const app = require('electron').app;

      if (!paths || paths.length === 0) {
        return { success: true, uploaded: [] };
      }

      const storageDir = path.join(app.getPath('userData'), 'intake_documents', String(folderId));
      fsSync.mkdirSync(storageDir, { recursive: true });

      // collect all files from the supplied paths (files or directories)
      const collectFiles = async (p) => {
        const stat = await fs.lstat(p);
        if (stat.isDirectory()) {
          const entries = await fs.readdir(p);
          let results = [];
          for (const e of entries) {
            results = results.concat(await collectFiles(path.join(p, e)));
          }
          return results;
        } else if (stat.isFile()) {
          return [p];
        }
        return [];
      };

      let files = [];
      for (const p of paths) {
        const found = await collectFiles(p);
        files.push(...found);
      }

      const total = files.length;
      let completed = 0;
      const uploaded = [];

      const extToCategory = (ext) => {
        const e = ext.toLowerCase();
        if (['.pdf'].includes(e)) return 'pdf';
        if (['.doc', '.docx', '.odt', '.rtf'].includes(e)) return 'doc';
        if (['.ppt', '.pptx', '.key', '.odp'].includes(e)) return 'slide';
        if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.tiff'].includes(e)) return 'image';
        if (['.mp3', '.wav', '.ogg', '.m4a', '.flac'].includes(e)) return 'audio';
        return 'other';
      };

      for (const srcPath of files) {
        const stat = fsSync.statSync(srcPath);
        const originalName = path.basename(srcPath);
        const ext = path.extname(originalName) || '';
        const timestamp = Date.now();
        const destName = `${timestamp}_${originalName}`;
        const destPath = path.join(storageDir, destName);

        await fs.copyFile(srcPath, destPath);

        const category = extToCategory(ext);

        const doc = await intakeFolderModel.createDocument({
          folder_id: folderId,
          name: originalName,
          file_path: destPath,
          status: 'pending',
          file_size: stat.size,
          file_type: ext.replace('.', ''),
          category
        });

        uploaded.push(doc);
        completed += 1;

        event.sender.send('intakeFolders:uploadProgress', {
          folderId,
          filename: originalName,
          completed,
          total,
          percent: Math.round((completed / total) * 100),
        });
      }

      event.sender.send('intakeFolders:uploadComplete', { folderId, uploaded });

      return { success: true, uploaded };
    } catch (error) {
      console.error('[intakeFolderController] Error uploading paths async:', error);
      return { success: false, error: error.message };
    }
  });

  // Update document status
  ipcMain.handle('intakeFolders:updateDocumentStatus', async (event, { id, status }) => {
    try {
      const document = await intakeFolderModel.updateDocumentStatus(id, status);
      return { success: true, document };
    } catch (error) {
      console.error('[intakeFolderController] Error updating document status:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete document
  ipcMain.handle('intakeFolders:deleteDocument', async (event, id) => {
    try {
      const document = await intakeFolderModel.deleteDocument(id);
      return { success: true, document };
    } catch (error) {
      console.error('[intakeFolderController] Error deleting document:', error);
      return { success: false, error: error.message };
    }
  });

  // Get all documents (regardless of folder)
  ipcMain.handle('intakeFolders:getAllDocuments', async (event) => {
    try {
      const documents = await intakeFolderModel.getAllDocuments();
      return { success: true, documents };
    } catch (error) {
      console.error('[intakeFolderController] Error getting all documents:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { setupIntakeFolderHandlers };
