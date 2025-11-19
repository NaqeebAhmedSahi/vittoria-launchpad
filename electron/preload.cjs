// electron/preload.cjs
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
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
  },
  intake: {
    list: () => ipcRenderer.invoke("intake:list"),
    addFiles: (files) => ipcRenderer.invoke("intake:addFiles", files),
    updateStatus: (id, status) =>
      ipcRenderer.invoke("intake:updateStatus", { id, status }),
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
  }
});