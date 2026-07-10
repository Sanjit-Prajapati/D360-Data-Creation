// ============================================================================
// TRANSACTION CONFIGURATION CONSTANTS
// ============================================================================

// Security Types
export const SECURITY_TYPES = [
  'EQUITY',
  'DEBT',
  'MUTUAL_FUND',
  'ETF',
  'BOND',
  'COMMODITY',
  'DERIVATIVE',
];

// ISIN Status Options
export const ISIN_STATUS_OPTIONS = [
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
];

// FIP ID Options  
export const FIP_ID_OPTIONS = [
  { value: 'fip@finrepo', label: 'FIP@FINREPO' },
  { value: 'fip@nsdl', label: 'FIP@NSDL' },
  { value: 'CDSLFIP', label: 'CDSLFIP' },
];

// Transaction Types
export const TRANSACTION_TYPES = [
  'BUY',
  'SELL',
  'DIVIDEND',
  'BONUS',
  'RIGHTS',
  'SPLIT',
  'MERGER',
  'SPIN_OFF',
];

// Transaction Groups
export const TRANSACTION_GROUPS = [
  'MARKET',
  'CORPORATE_ACTION',
  'SETTLEMENT',
  'ADJUSTMENT',
];

// Direction Options
export const DIRECTION_OPTIONS = [
  'CREDIT',
  'DEBIT',
];

// Status Options
export const STATUS_OPTIONS = [
  'ACTIVE',
  'INACTIVE',
];

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Date Formats
export const DATE_FORMAT = 'yyyy-MM-dd';
export const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';
export const DISPLAY_DATE_FORMAT = 'MMM dd, yyyy';
export const DISPLAY_DATETIME_FORMAT = 'MMM dd, yyyy hh:mm a';

// Session Timeout (in minutes)
export const SESSION_TIMEOUT = 30;

// File Upload Limits
export const MAX_FILE_SIZE_MB = 50;
export const ALLOWED_FILE_TYPES = ['.csv'];

// Currency Format
export const CURRENCY_FORMAT = {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};
