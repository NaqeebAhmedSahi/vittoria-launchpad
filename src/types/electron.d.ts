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
      intake: {
        list(): Promise<IntakeDbRow[]>;
        addFiles(files: IntakeFileInput[]): Promise<IntakeDbRow[]>;
        updateStatus(id: number, status: string): Promise<IntakeDbRow>;
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
          search(searchTerm: string): Promise<Candidate[]>;
          delete(candidateId: number): Promise<void>;
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
      };
      scoring: {
        runFitAgainstMandate(candidateId: number, mandateId: number): Promise<{ success: boolean; result?: any; error?: string }>;
        runFitAgainstAllMandates(candidateId: number): Promise<{ success: boolean; results?: any[]; error?: string }>;
        listMatchScoresForCandidate(candidateId: number): Promise<{ success: boolean; scores?: any[]; error?: string }>;
        listMatchScoresForMandate(mandateId: number): Promise<{ success: boolean; scores?: any[]; error?: string }>;
      };
    };
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
