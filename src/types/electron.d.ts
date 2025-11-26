import type {
  OutcomeEvent,
  OutcomeResult,
  OutcomeStage,
  SourceReliabilityDetailResponse,
  SourceReliabilityListResponse,
  MandateOutcomeLogResponse,
} from "./reliability";

export {};

declare global {
  interface ParsedCv {
    name: string;
    current_title?: string;
    current_firm?: string;
    location?: string;
    sectors: string[];
    functions: string[];
    asset_classes: string[];
    geographies: string[];
    seniority: string;
    experience: Array<{
      firm?: string;
      title?: string;
      dateFrom?: string;
      dateTo?: string | null;
    }>;
    education: Array<{
      institution?: string;
      degree?: string;
    }>;
    raw_text: string;
  }

  interface Candidate {
    id: number;
    name: string;
    current_title?: string;
    current_firm?: string;
    location?: string;
    sectors: string[];
    functions: string[];
    asset_classes: string[];
    geographies: string[];
    seniority?: string;
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
    created_at: string;
    updated_at: string;
  }

  interface CvUploadResult {
    intakeStatus: string;
    candidateId?: number;
    cvQualityScore: number;
    fitScore?: number;
  }

  interface IntakeDbRow {
    id: number;
    file_name: string;
    candidate: string | null;
    type: string;
    source: string;
    uploaded_by: string;
    uploaded_at: string;
    status: string;
    variant: string | null;
    quality_score?: number;
    candidate_id?: number;
    candidate_status?: string;
    avg_fit_score?: number;
    match_count?: number;
    parsed_json?: string;
    json?: string;
    jsonCandidate?: string;
  }

  interface IntakeFileInput {
    fileName: string;
    candidate?: string;
    type?: string;
    source?: string;
    uploadedBy?: string;
    uploadedAt?: string;

    // Add the Electron file path here
    tempPath?: string;
  }

  // 👇 ADD THIS 👇
  interface File {
    /** Electron-only property containing the real file path */
    path: string;
  }

  interface Window {
    api: {
      ping: () => string;
      source: {
        list(): Promise<{ success: boolean; sources?: any[]; error?: string }>;
        getById(id: number): Promise<{ success: boolean; source?: any; org_pattern?: any; error?: string }>;
        create(data: any): Promise<{ success: boolean; source?: any; error?: string }>;
        getOrgPattern(): Promise<{ success: boolean; pattern?: any; error?: string }>;
        importHistorical(rows: any[]): Promise<{ success: boolean; imported?: number; skipped?: number; errors?: string[]; error?: string }>;
        bulkUpdate(updates: any[]): Promise<{ success: boolean; updated?: number; errors?: string[]; error?: string }>;
      };
      recommendation: {
        create(data: { source_id: number; candidate_id: number; mandate_id: number; strength: string; comment?: string }): Promise<{ success: boolean; recommendation?: any; error?: string }>;
        listByMandate(mandateId: number): Promise<{ success: boolean; recommendations?: any[]; error?: string }>;
        listByCandidate(candidateId: number, mandateId: number): Promise<{ success: boolean; recommendations?: any[]; error?: string }>;
      };
      outcome: {
        create(data: { candidate_id: number; mandate_id: number; stage: OutcomeStage; result: OutcomeResult; notes?: string }): Promise<{ success: boolean; outcome?: OutcomeEvent; error?: string }>;
        listByMandate(mandateId: number): Promise<{ success: boolean; data?: MandateOutcomeLogResponse; error?: string }>;
      };
      reliability: {
        listSources(): Promise<{ success: boolean } & SourceReliabilityListResponse>;
        getSourceDetail(sourceId: number | string): Promise<{ success: boolean; detail?: SourceReliabilityDetailResponse; error?: string }>;
      };
      setup: {
        isCompleted(): Promise<{ success: boolean; completed: boolean }>;
        checkPostgres(): Promise<{ success: boolean; installed: boolean; version?: string; error?: string }>;
        getInstructions(): Promise<{ success: boolean; instructions: string }>;
        testConnection(credentials: {
          host: string;
          port: string;
          username: string;
          password: string;
          dbName: string;
        }): Promise<{ success: boolean; message?: string; error?: string }>;
        createUser(params: {
          superuser: {
            host: string;
            port: string;
            username: string;
            password: string;
          };
          newUser: {
            username: string;
            password: string;
          };
        }): Promise<{ success: boolean; message?: string; error?: string; code?: string }>;
        generateUserScript(params: {
          newUser: {
            username: string;
            password: string;
          };
        }): Promise<{ success: boolean; script?: string; error?: string }>;
        createDatabase(config: {
          host: string;
          port: string;
          username: string;
          password: string;
          dbName: string;
        }): Promise<{ success: boolean; message?: string; error?: string }>;
        initializeSchema(config: {
          host: string;
          port: string;
          username: string;
          password: string;
          dbName: string;
        }): Promise<{ success: boolean; message?: string; error?: string }>;
        saveConfig(config: {
          host: string;
          port: string;
          username: string;
          password: string;
          dbName: string;
        }): Promise<{ success: boolean; message?: string }>;
        complete(): Promise<{ success: boolean; message?: string }>;
        listDatabases(credentials: {
          host: string;
          port: number;
          username: string;
          password: string;
        }): Promise<{ 
          success: boolean; 
          databases?: Array<{ name: string; size: string; collation: string }>; 
          error?: string;
        }>;
        checkDatabaseSchema(config: {
          host: string;
          port: number;
          username: string;
          password: string;
          dbName: string;
        }): Promise<{
          success: boolean;
          database?: string;
          tables?: Array<{ name: string; size: string; rows: number }>;
          error?: string;
        }>;
        getDatabaseInfo(): Promise<{
          success: boolean;
          connected: boolean;
          host?: string;
          port?: number;
          database?: string;
          username?: string;
          version?: string;
          size?: string;
          tableCount?: number;
          error?: string;
          message?: string;
        }>;
        disconnect(): Promise<{
          success: boolean;
          message?: string;
          error?: string;
        }>;
      };
      intake: {
        list(): Promise<IntakeDbRow[]>;
        addFiles(files: IntakeFileInput[]): Promise<IntakeDbRow[]>;
        updateStatus(id: number, status: string): Promise<IntakeDbRow>;
        updateParsedJson(payload: { intakeId: number; updatedJson: any; reScore?: boolean }): Promise<IntakeDbRow>;
        preview(id: number): Promise<{
          fileName: string;
          mimeType: string;
          base64: string;
        } | null>;
          processCV(intakeId: number): Promise<CvUploadResult>;
          createCandidate(intakeId: number): Promise<number>;
        };
        candidate: {
          list(status?: string): Promise<Candidate[]>;
          getById(candidateId: number): Promise<Candidate | null>;
          create(data: Partial<Candidate>): Promise<Candidate>;
          update(payload: { candidateId: number; updates: Partial<Candidate> }): Promise<void>;
          approve(candidateId: number): Promise<void>;
          reject(candidateId: number): Promise<void>;
          defer(payload: { candidateId: number; reason?: string; reminderDate?: string | null }): Promise<void>;
          search(searchTerm: string): Promise<Candidate[]>;
          delete(candidateId: number): Promise<void>;
          addMandate(candidateId: number, mandateId: number): Promise<{ success: boolean; mandateIds?: number[]; error?: string }>;
          removeMandate(candidateId: number, mandateId: number): Promise<{ success: boolean; mandateIds?: number[]; error?: string }>;
          getMandates(candidateId: number): Promise<{ success: boolean; mandateIds?: number[]; error?: string }>;
      };
      settings: {
        getSetting(key: string): Promise<any>;
        setSetting(key: string, value: any): Promise<void>;
        getCVStoragePath(): Promise<string>;
        getAllCVPaths(): Promise<any[]>;
        setCVStoragePath(cvPath: string): Promise<void>;
      };
      llm: {
        activeModel(): Promise<string>;
      };
      auth: {
        login(username: string, password: string): Promise<{
          success: boolean;
          sessionToken?: string;
          user?: {
            id: number;
            username: string;
            fullName: string;
            role: string;
          };
          error?: string;
        }>;
        logout(sessionToken: string): Promise<{ success: boolean }>;
        validateSession(sessionToken: string): Promise<{
          valid: boolean;
          user?: {
            id: number;
            username: string;
            fullName: string;
            role: string;
          };
        }>;
        getCurrentUser(sessionToken: string): Promise<{
          id: number;
          username: string;
          fullName: string;
          role: string;
        } | null>;
      };
      firm: {
        list(): Promise<{ success: boolean; firms?: Firm[]; error?: string }>;
        getById(firmId: number): Promise<{ success: boolean; firm?: Firm; error?: string }>;
        create(firmData: Partial<Firm>): Promise<{ success: boolean; firmId?: number; error?: string }>;
        update(firmId: number, updates: Partial<Firm>): Promise<{ success: boolean; error?: string }>;
        delete(firmId: number): Promise<{ success: boolean; error?: string }>;
      };
      mandate: {
        list(options?: { firm_id?: number; status?: string }): Promise<{ success: boolean; mandates?: Mandate[]; error?: string }>;
        getById(mandateId: number): Promise<{ success: boolean; mandate?: Mandate; error?: string }>;
        create(mandateData: Partial<Mandate>): Promise<{ success: boolean; mandateId?: number; error?: string }>;
        update(mandateId: number, updates: Partial<Mandate>): Promise<{ success: boolean; error?: string }>;
        delete(mandateId: number): Promise<{ success: boolean; error?: string }>;
        addCandidate(payload: { mandateId: number; candidateId: number }): Promise<{ success: boolean; candidateIds?: number[]; error?: string }>;
        removeCandidate(payload: { mandateId: number; candidateId: number }): Promise<{ success: boolean; candidateIds?: number[]; error?: string }>;
        getCandidates(mandateId: number): Promise<{ success: boolean; candidateIds?: number[]; error?: string }>;
      };
      scoring: {
        runFitAgainstMandate(candidateId: number, mandateId: number): Promise<{ success: boolean; result?: any; error?: string }>;
        runFitAgainstAllMandates(candidateId: number): Promise<{ success: boolean; results?: any[]; error?: string }>;
        listMatchScoresForCandidate(candidateId: number): Promise<{ success: boolean; scores?: any[]; error?: string }>;
        listMatchScoresForMandate(mandateId: number): Promise<{ success: boolean; scores?: any[]; error?: string }>;
      };
      team: {
        list(firmId?: number): Promise<{ success: boolean; teams?: Team[]; error?: string }>;
        getById(id: number): Promise<{ success: boolean; team?: Team; error?: string }>;
        create(data: Partial<Team>): Promise<{ success: boolean; teamId?: number; error?: string }>;
        update(id: number, data: Partial<Team>): Promise<{ success: boolean; error?: string }>;
        delete(id: number): Promise<{ success: boolean; error?: string }>;
        getMembers(teamId: number): Promise<{ success: boolean; members?: Person[]; error?: string }>;
      };
      people: {
        list(filters?: { firm_id?: number; team_id?: number; search?: string }): Promise<{ success: boolean; people?: Person[]; error?: string }>;
        getById(id: number): Promise<{ success: boolean; person?: Person; error?: string }>;
        create(data: Partial<Person>): Promise<{ success: boolean; personId?: number; error?: string }>;
        update(id: number, data: Partial<Person>): Promise<{ success: boolean; error?: string }>;
        delete(id: number): Promise<{ success: boolean; error?: string }>;
        getEmploymentHistory(personId: number): Promise<{ success: boolean; employments?: Employment[]; error?: string }>;
      };
      employment: {
        list(filters?: { person_id?: number; firm_id?: number; team_id?: number; status?: string }): Promise<{ success: boolean; employments?: Employment[]; error?: string }>;
        getById(id: number): Promise<{ success: boolean; employment?: Employment; error?: string }>;
        create(data: Partial<Employment>): Promise<{ success: boolean; employmentId?: number; error?: string }>;
        update(id: number, data: Partial<Employment>): Promise<{ success: boolean; error?: string }>;
        delete(id: number): Promise<{ success: boolean; error?: string }>;
      };
      document: {
        list(filters?: { firm_id?: number; mandate_id?: number; candidate_id?: number; category?: string; uploaded_by?: number; search?: string }): Promise<{ success: boolean; documents?: Document[]; error?: string }>;
        getById(id: number): Promise<{ success: boolean; document?: Document; error?: string }>;
        create(data: Partial<Document>): Promise<{ success: boolean; documentId?: number; error?: string }>;
        upload(fileData: any, metadata: Partial<Document>): Promise<{ success: boolean; documentId?: number; error?: string }>;
        update(id: number, data: Partial<Document>): Promise<{ success: boolean; error?: string }>;
        delete(id: number): Promise<{ success: boolean; error?: string }>;
        getByEntity(entityType: string, entityId: number): Promise<{ success: boolean; documents?: Document[]; error?: string }>;
        getCategories(): Promise<{ success: boolean; categories?: string[]; error?: string }>;
        download(id: number): Promise<{ success: boolean; data?: { base64: string; name: string; type: string }; error?: string }>;
      };
      finance: {
        list(filters?: { firm_id?: number; mandate_id?: number; candidate_id?: number; transaction_type?: string; payment_status?: string; start_date?: string; end_date?: string; category?: string }): Promise<{ success: boolean; transactions?: FinanceTransaction[]; error?: string }>;
        getById(id: number): Promise<{ success: boolean; transaction?: FinanceTransaction; error?: string }>;
        create(data: Partial<FinanceTransaction>): Promise<{ success: boolean; transactionId?: number; error?: string }>;
        update(id: number, data: Partial<FinanceTransaction>): Promise<{ success: boolean; error?: string }>;
        delete(id: number): Promise<{ success: boolean; error?: string }>;
        getSummary(filters?: { firm_id?: number; start_date?: string; end_date?: string }): Promise<{ success: boolean; summary?: any[]; error?: string }>;
        getCategories(): Promise<{ success: boolean; categories?: string[]; error?: string }>;
      };
      audit: {
        list(filters?: { entity_type?: string; entity_id?: number; performed_by?: number; action?: string; start_date?: string; end_date?: string }): Promise<{ success: boolean; logs?: AuditLog[]; error?: string }>;
        getById(id: number): Promise<{ success: boolean; log?: AuditLog; error?: string }>;
        create(data: Partial<AuditLog>): Promise<{ success: boolean; logId?: number; error?: string }>;
        log(entityType: string, entityId: number, action: string, performedBy: number, changes?: any): Promise<{ success: boolean; logId?: number; error?: string }>;
        getByEntity(entityType: string, entityId: number): Promise<{ success: boolean; logs?: AuditLog[]; error?: string }>;
        getUserActivity(userId: number, filters?: { start_date?: string; end_date?: string }): Promise<{ success: boolean; activity?: any[]; error?: string }>;
        getRecentActivity(limit?: number): Promise<{ success: boolean; activity?: AuditLog[]; error?: string }>;
        deleteOldLogs(beforeDate: string): Promise<{ success: boolean; deletedCount?: number; error?: string }>;
      };
    };
  }

  interface FinanceTransaction {
    id: number;
    transaction_type: string;
    category?: string | null;
    amount: number;
    currency: string;
    description?: string | null;
    transaction_date: string;
    firm_id?: number | null;
    mandate_id?: number | null;
    candidate_id?: number | null;
    invoice_number?: string | null;
    payment_status: string;
    payment_method?: string | null;
    payment_date?: string | null;
    tax_amount?: number | null;
    notes?: string | null;
    created_by?: number | null;
    created_at: string;
    updated_at: string;
    creator_name?: string;
    firm_name?: string;
    mandate_name?: string;
    candidate_name?: string;
  }

  interface AuditLog {
    id: number;
    entity_type: string;
    entity_id: number;
    action: string;
    performed_by?: number | null;
    changes?: any;
    ip_address?: string | null;
    user_agent?: string | null;
    timestamp: string;
    performer_name?: string;
  }

  interface Document {
    id: number;
    name: string;
    description?: string | null;
    file_path: string;
    file_type?: string | null;
    file_size?: number | null;
    category?: string | null;
    tags?: string[] | null;
    uploaded_by?: number | null;
    related_entity_type?: string | null;
    related_entity_id?: number | null;
    firm_id?: number | null;
    mandate_id?: number | null;
    candidate_id?: number | null;
    is_confidential: boolean;
    created_at: string;
    updated_at: string;
    uploader_name?: string;
    firm_name?: string;
    mandate_name?: string;
    candidate_name?: string;
  }

  interface Team {
    id: number;
    name: string;
    firm_id?: number | null;
    description?: string | null;
    created_at: string;
    updated_at: string;
  }

  interface Person {
    id: number;
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
    firm_id?: number | null;
    team_id?: number | null;
    role?: string | null;
    linkedin_url?: string | null;
    created_at: string;
    updated_at: string;
  }

  interface Employment {
    id: number;
    person_id: number;
    firm_id?: number | null;
    team_id?: number | null;
    job_title?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    status: string;
    created_at: string;
    updated_at: string;
  }

  interface Firm {
    id: number;
    name: string;
    short_name?: string | null;
    sector_focus: string[];
    asset_classes: string[];
    regions: string[];
    platform_type?: string | null;
    website?: string | null;
    notes_text?: string | null;
    created_at: string;
    updated_at: string;
  }

  interface Mandate {
    id: number;
    name: string;
    firm_id: number;
    location?: string | null;
    primary_sector?: string | null;
    sectors: string[];
    functions: string[];
    asset_classes: string[];
    regions: string[];
    seniority_min?: string | null;
    seniority_max?: string | null;
    status: string;
    raw_brief?: string | null;
    created_at: string;
    updated_at: string;
  }
}
