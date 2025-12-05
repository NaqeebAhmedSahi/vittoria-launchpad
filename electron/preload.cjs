// electron/preload.cjs
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Event listeners
  on: (channel, callback) => {
    const validChannels = ["intake:ocr-progress"];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  off: (channel, callback) => {
    const validChannels = ["intake:ocr-progress"];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, callback);
    }
  },
  source: {
    list: () => ipcRenderer.invoke("source:list"),
    getById: (id) => ipcRenderer.invoke("source:getById", id),
    create: (data) => ipcRenderer.invoke("source:create", data),
    getOrgPattern: () => ipcRenderer.invoke("source:getOrgPattern"),
    importHistorical: (rows) => ipcRenderer.invoke("source:importHistorical", rows),
    bulkUpdate: (updates) => ipcRenderer.invoke("source:bulkUpdate", updates),
  },
  recommendation: {
    create: (data) => ipcRenderer.invoke("recommendation:create", data),
    listByMandate: (mandateId) => ipcRenderer.invoke("recommendation:listByMandate", mandateId),
    listByCandidate: (candidateId, mandateId) => ipcRenderer.invoke("recommendation:listByCandidate", candidateId, mandateId),
  },
  outcome: {
    create: (data) => ipcRenderer.invoke("outcome:create", data),
    listByMandate: (mandateId) => ipcRenderer.invoke("outcome:listByMandate", mandateId),
  },
  reliability: {
    listSources: () => ipcRenderer.invoke("reliability:listSources"),
    getSourceDetail: (sourceId) => ipcRenderer.invoke("reliability:getSourceDetail", sourceId),
  },
  ping: () => "pong",

  // 🔹 Setup / PostgreSQL configuration
  setup: {
    // Check if full app setup is completed (based on settings)
    isCompleted: () => ipcRenderer.invoke("setup:isCompleted"),

    // Detect if PostgreSQL is installed on the system
    checkPostgres: () => ipcRenderer.invoke("setup:checkPostgres"),

    // Get platform-specific installation instructions (Windows / macOS / Linux)
    getInstructions: () => ipcRenderer.invoke("setup:getInstructions"),

    // Test connection to PostgreSQL with provided credentials
    testConnection: (credentials) =>
      ipcRenderer.invoke("setup:testConnection", credentials),

    // Create a new PostgreSQL user (using superuser credentials)
    createUser: (params) =>
      ipcRenderer.invoke("setup:createUser", params),
    // Create a new PostgreSQL user on Windows using elevated helper (UAC flow)
    createUserWindows: (params) =>
      ipcRenderer.invoke("setup:createUserWindows", params),

    // Generate SQL script for manual user creation
    generateUserScript: (params) =>
      ipcRenderer.invoke("setup:generateUserScript", params),

    // Create the Vittoria DB (vittoria_launchpad by default)
    createDatabase: (config) =>
      ipcRenderer.invoke("setup:createDatabase", config),

    // Initialize schema (tables, indexes, triggers, default settings)
    initializeSchema: (config) =>
      ipcRenderer.invoke("setup:initializeSchema", config),

    // Save DB config (host, port, db_name, username, password) in settings
    saveConfig: (config) =>
      ipcRenderer.invoke("setup:saveConfig", config),

    // Mark setup as complete
    complete: () => ipcRenderer.invoke("setup:complete"),

    // List all databases in PostgreSQL
    listDatabases: (credentials) =>
      ipcRenderer.invoke("setup:listDatabases", credentials),

    // Check database schema (list tables and row counts)
    checkDatabaseSchema: (config) =>
      ipcRenderer.invoke("setup:checkDatabaseSchema", config),

    // Get current database connection info
    getDatabaseInfo: () => ipcRenderer.invoke("setup:getDatabaseInfo"),

    // Disconnect database
    disconnect: () => ipcRenderer.invoke("setup:disconnect"),
  },
  intake: {
    list: () => ipcRenderer.invoke("intake:list"),
    addFiles: (files) => ipcRenderer.invoke("intake:addFiles", files),
    updateStatus: (id, status) =>
      ipcRenderer.invoke("intake:updateStatus", { id, status }),
    updateParsedJson: ({ intakeId, updatedJson, reScore }) =>
      ipcRenderer.invoke("intake:updateParsedJson", { intakeId, updatedJson, reScore }),
    preview: (id) => ipcRenderer.invoke("intake:preview", id),
    parseAndGenerate: (id) => ipcRenderer.invoke("intake:parseAndGenerate", id),
    processCV: (intakeId) => ipcRenderer.invoke("intake:processCV", intakeId),
    createCandidate: (intakeId) => ipcRenderer.invoke("intake:createCandidate", intakeId),
  },
  candidate: {
    list: (status) => ipcRenderer.invoke("candidate:list", status),
    getById: (candidateId) => ipcRenderer.invoke("candidate:getById", candidateId),
    update: (payload) => ipcRenderer.invoke("candidate:update", payload),
    approve: (candidateId) => ipcRenderer.invoke("candidate:approve", candidateId),
    reject: (candidateId) => ipcRenderer.invoke("candidate:reject", candidateId),
    defer: ({ candidateId, reason, reminderDate }) => ipcRenderer.invoke("candidate:defer", { candidateId, reason, reminderDate }),
    search: (searchTerm) => ipcRenderer.invoke("candidate:search", searchTerm),
    delete: (candidateId) => ipcRenderer.invoke("candidate:delete", candidateId),
    create: (data) => ipcRenderer.invoke("candidate:create", data),
    addMandate: (candidateId, mandateId) => ipcRenderer.invoke("candidate:addMandate", { candidateId, mandateId }),
    removeMandate: (candidateId, mandateId) => ipcRenderer.invoke("candidate:removeMandate", { candidateId, mandateId }),
    getMandates: (candidateId) => ipcRenderer.invoke("candidate:getMandates", candidateId),
  },
  settings: {
    getSetting: (key) => ipcRenderer.invoke("settings:getSetting", key),
    setSetting: (key, value) =>
      ipcRenderer.invoke("settings:setSetting", key, value),
    getCVStoragePath: () => ipcRenderer.invoke("settings:getCVStoragePath"),
    getAllCVPaths: () => ipcRenderer.invoke("settings:getAllCVPaths"),
    setCVStoragePath: (cvPath) =>
      ipcRenderer.invoke("settings:setCVStoragePath", cvPath),
  },
  llm: {
    activeModel: () => ipcRenderer.invoke("llm:activeModel"),
    ensureModelLoaded: (provider, model, baseUrl) => ipcRenderer.invoke("llm:ensureModelLoaded", { provider, model, baseUrl }),
  },
  auth: {
    login: (username, password) => ipcRenderer.invoke("auth:login", { username, password }),
    logout: (sessionToken) => ipcRenderer.invoke("auth:logout", sessionToken),
    validateSession: (sessionToken) => ipcRenderer.invoke("auth:validateSession", sessionToken),
    getCurrentUser: (sessionToken) => ipcRenderer.invoke("auth:getCurrentUser", sessionToken),
  },
  firm: {
    list: () => ipcRenderer.invoke("firm:list"),
    getById: (firmId) => ipcRenderer.invoke("firm:getById", firmId),
    create: (firmData) => ipcRenderer.invoke("firm:create", firmData),
    update: (firmId, updates) => ipcRenderer.invoke("firm:update", { firmId, updates }),
    delete: (firmId) => ipcRenderer.invoke("firm:delete", firmId),
  },
  mandate: {
    list: (options) => ipcRenderer.invoke("mandate:list", options),
    getById: (mandateId) => ipcRenderer.invoke("mandate:getById", mandateId),
    create: (mandateData) => ipcRenderer.invoke("mandate:create", mandateData),
    update: (mandateId, updates) => ipcRenderer.invoke("mandate:update", { mandateId, updates }),
    delete: (mandateId) => ipcRenderer.invoke("mandate:delete", mandateId),
    addCandidate: (payload) => ipcRenderer.invoke("mandate:addCandidate", payload),
    removeCandidate: (payload) => ipcRenderer.invoke("mandate:removeCandidate", payload),
    getCandidates: (mandateId) => ipcRenderer.invoke("mandate:getCandidates", mandateId),
  },
  scoring: {
    runFitAgainstMandate: (candidateId, mandateId) => ipcRenderer.invoke("scoring:runFitAgainstMandate", { candidateId, mandateId }),
    runFitAgainstAllMandates: (candidateId) => ipcRenderer.invoke("scoring:runFitAgainstAllMandates", candidateId),
    listMatchScoresForCandidate: (candidateId) => ipcRenderer.invoke("scoring:listMatchScoresForCandidate", candidateId),
    listMatchScoresForMandate: (mandateId) => ipcRenderer.invoke("scoring:listMatchScoresForMandate", mandateId),
  },
  team: {
    list: (firmId) => ipcRenderer.invoke("team:list", firmId),
    getById: (id) => ipcRenderer.invoke("team:getById", id),
    create: (data) => ipcRenderer.invoke("team:create", data),
    update: (id, data) => ipcRenderer.invoke("team:update", { id, data }),
    delete: (id) => ipcRenderer.invoke("team:delete", id),
    getMembers: (teamId) => ipcRenderer.invoke("team:getMembers", teamId),
  },
  people: {
    list: (filters) => ipcRenderer.invoke("people:list", filters),
    getById: (id) => ipcRenderer.invoke("people:getById", id),
    create: (data) => ipcRenderer.invoke("people:create", data),
    update: (id, data) => ipcRenderer.invoke("people:update", { id, data }),
    delete: (id) => ipcRenderer.invoke("people:delete", id),
    getEmploymentHistory: (personId) => ipcRenderer.invoke("people:getEmploymentHistory", personId),
  },
  employment: {
    list: (filters) => ipcRenderer.invoke("employment:list", filters),
    getById: (id) => ipcRenderer.invoke("employment:getById", id),
    create: (data) => ipcRenderer.invoke("employment:create", data),
    update: (id, data) => ipcRenderer.invoke("employment:update", { id, data }),
    delete: (id) => ipcRenderer.invoke("employment:delete", id),
  },
  document: {
    list: (filters) => ipcRenderer.invoke("document:list", filters),
    getById: (id) => ipcRenderer.invoke("document:getById", id),
    create: (data) => ipcRenderer.invoke("document:create", data),
    upload: (fileData, metadata) => ipcRenderer.invoke("document:upload", { fileData, metadata }),
    update: (id, data) => ipcRenderer.invoke("document:update", { id, data }),
    delete: (id) => ipcRenderer.invoke("document:delete", id),
    getByEntity: (entityType, entityId) => ipcRenderer.invoke("document:getByEntity", { entityType, entityId }),
    getCategories: () => ipcRenderer.invoke("document:getCategories"),
    download: (id) => ipcRenderer.invoke("document:download", id),
  },
  finance: {
    list: (filters) => ipcRenderer.invoke("finance:list", filters),
    getById: (id) => ipcRenderer.invoke("finance:getById", id),
    create: (data) => ipcRenderer.invoke("finance:create", data),
    update: (id, data) => ipcRenderer.invoke("finance:update", { id, data }),
    delete: (id) => ipcRenderer.invoke("finance:delete", id),
    getSummary: (filters) => ipcRenderer.invoke("finance:getSummary", filters),
    getCategories: () => ipcRenderer.invoke("finance:getCategories"),
  },
  audit: {
    list: (filters) => ipcRenderer.invoke("audit:list", filters),
    getById: (id) => ipcRenderer.invoke("audit:getById", id),
    create: (data) => ipcRenderer.invoke("audit:create", data),
    log: (entityType, entityId, action, performedBy, changes) =>
      ipcRenderer.invoke("audit:log", { entityType, entityId, action, performedBy, changes }),
    getByEntity: (entityType, entityId) => ipcRenderer.invoke("audit:getByEntity", { entityType, entityId }),
    getUserActivity: (userId, filters) => ipcRenderer.invoke("audit:getUserActivity", { userId, filters }),
    getRecentActivity: (limit) => ipcRenderer.invoke("audit:getRecentActivity", limit),
    deleteOldLogs: (beforeDate) => ipcRenderer.invoke("audit:deleteOldLogs", beforeDate),
  },
  // Operations Module
  emails: {
    getByMailbox: (mailbox) => ipcRenderer.invoke("emails:getByMailbox", mailbox),
    create: (emailData) => ipcRenderer.invoke("emails:create", emailData),
    updateStatus: (id, status) => ipcRenderer.invoke("emails:updateStatus", { id, status }),
    delete: (id) => ipcRenderer.invoke("emails:delete", id),
    getUnreadCount: (mailbox) => ipcRenderer.invoke("emails:getUnreadCount", mailbox),
    search: (query) => ipcRenderer.invoke("emails:search", query),
  },
  calendar: {
    getAll: () => ipcRenderer.invoke("calendar:getAll"),
    getByDateRange: (startDate, endDate) => ipcRenderer.invoke("calendar:getByDateRange", { startDate, endDate }),
    create: (eventData) => ipcRenderer.invoke("calendar:create", eventData),
    update: (id, eventData) => ipcRenderer.invoke("calendar:update", { id, eventData }),
    delete: (id) => ipcRenderer.invoke("calendar:delete", id),
    getById: (id) => ipcRenderer.invoke("calendar:getById", id),
  },
  intakeFolders: {
    // Controller channels:
    // getAll -> returns { success: true, folders }
    getAllFolders: () => ipcRenderer.invoke("intakeFolders:getAll"),
    getById: (id) => ipcRenderer.invoke("intakeFolders:getById", id),
    createFolder: (folderData) => ipcRenderer.invoke("intakeFolders:create", folderData),
    deleteFolder: (id) => ipcRenderer.invoke("intakeFolders:delete", id),
    // documents
    getDocumentsByFolder: (folderId) => ipcRenderer.invoke("intakeFolders:getDocuments", folderId),
    getDocumentById: (id) => ipcRenderer.invoke("intakeFolders:getDocumentById", id),
    createDocument: (documentData) => ipcRenderer.invoke("intakeFolders:createDocument", documentData),
    uploadFiles: (folderId) => ipcRenderer.invoke("intakeFolders:uploadFiles", { folderId }),
    uploadFolder: (folderId) => ipcRenderer.invoke("intakeFolders:uploadFolder", { folderId }),
    // Async uploads with progress events
    uploadFilesAsync: (folderId) => ipcRenderer.invoke("intakeFolders:uploadFilesAsync", { folderId }),
    uploadFolderAsync: (folderId) => ipcRenderer.invoke("intakeFolders:uploadFolderAsync", { folderId }),
  uploadPathsAsync: (folderId, paths) => ipcRenderer.invoke("intakeFolders:uploadPathsAsync", { folderId, paths }),
    onUploadProgress: (cb) => {
      const listener = (event, data) => cb(data);
      ipcRenderer.on('intakeFolders:uploadProgress', listener);
      return () => ipcRenderer.removeListener('intakeFolders:uploadProgress', listener);
    },
    onUploadComplete: (cb) => {
      const listener = (event, data) => cb(data);
      ipcRenderer.on('intakeFolders:uploadComplete', listener);
      return () => ipcRenderer.removeListener('intakeFolders:uploadComplete', listener);
    },
    updateDocumentStatus: (id, status) => ipcRenderer.invoke("intakeFolders:updateDocumentStatus", { id, status }),
    deleteDocument: (id) => ipcRenderer.invoke("intakeFolders:deleteDocument", id),
    getAllDocuments: () => ipcRenderer.invoke("intakeFolders:getAllDocuments"),
  },
  contacts: {
    getAll: (searchTerm) => ipcRenderer.invoke("contacts:getAll", searchTerm),
    getById: (id) => ipcRenderer.invoke("contacts:getById", id),
    create: (contactData) => ipcRenderer.invoke("contacts:create", contactData),
    update: (id, contactData) => ipcRenderer.invoke("contacts:update", id, contactData),
    delete: (id) => ipcRenderer.invoke("contacts:delete", id),
    getByCategory: (category) => ipcRenderer.invoke("contacts:getByCategory", category),
    getByCompany: (companyName) => ipcRenderer.invoke("contacts:getByCompany", companyName),
    search: (searchTerm) => ipcRenderer.invoke("contacts:search", searchTerm),
    bulkImport: (contacts) => ipcRenderer.invoke("contacts:bulkImport", contacts),
  },
  operationsSettings: {
    getAllMailboxes: () => ipcRenderer.invoke("operationsSettings:getAllMailboxes"),
    updateMailboxAccess: (email, access) => ipcRenderer.invoke("operationsSettings:updateMailboxAccess", { email, access }),
    getAllIntegrations: () => ipcRenderer.invoke("operationsSettings:getAllIntegrations"),
    updateIntegrationStatus: (name, status) => ipcRenderer.invoke("operationsSettings:updateIntegrationStatus", { name, status }),
    // Controller uses getPreferences / updatePreferences
    getUserPreferences: () => ipcRenderer.invoke("operationsSettings:getPreferences"),
    updateUserPreferences: (preferences) => ipcRenderer.invoke("operationsSettings:updatePreferences", preferences),
  }
});