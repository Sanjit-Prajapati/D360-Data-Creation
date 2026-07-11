// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// ============================================================================
// THEME TYPES
// ============================================================================

export type ThemeMode = 'light' | 'dark';

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// ============================================================================
// ISIN MASTER TYPES
// ============================================================================

export interface IsinMaster {
  id: string;
  isin: string;
  instrument_name: string;
  symbol: string;
  security_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface IsinMasterFormData {
  isin: string;
  instrument_name: string;
  symbol: string;
  security_type: string;
  status: string;
}

export interface IsinImportStats {
  totalRecords: number;
  recordsCreated: number;
  duplicateRecords: number;
}

// ============================================================================
// NARRATION MASTER TYPES
// ============================================================================

export interface NarrationRecord {
  id: string;
  fip_id: string;
  narration_regex: string;
  transaction_type: string;
  transaction_group: string;
  direction: string;
  created_at: string;
  updated_at: string;
}

export interface NarrationRecordFormData {
  fip_id: string;
  narration_regex: string;
  transaction_type: string;
  transaction_group: string;
  direction: string;
}

// ============================================================================
// TRANSACTION CREATION TYPES
// ============================================================================

export interface TransactionRecord {
  id?: string;
  isin: string;
  transactionDate: string;
  fipId: string;
  transactionType: string;
  narration: string;
  settlementId: string;
  quantity: number;
  rate: number;
  amount: number;
  dynamicFields?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTransactionRequest {
  securities: {
    isin: string;
    transactions: Omit<TransactionRecord, 'id' | 'isin' | 'createdAt' | 'updatedAt'>[];
  }[];
}

export interface NarrationOption {
  id: string;
  narrationRegex: string;
  dynamicFields: string[];
}

export interface FipIdOption {
  value: string;
  label: string;
}

export interface TransactionTypeOption {
  value: string;
  label: string;
}

export interface DuplicateValidationResult {
  isDuplicate: boolean;
  message?: string;
}

// ============================================================================
// EXPORT DATA TYPES
// ============================================================================

export interface ExportData {
  filename: string;
  data: Blob;
}
