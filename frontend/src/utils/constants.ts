// ============================================================================
// APP WIDE CONFIGURATION CONSTANTS
// ============================================================================

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
