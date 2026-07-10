import { format, parseISO, differenceInDays } from 'date-fns';
import { DISPLAY_DATE_FORMAT, DISPLAY_DATETIME_FORMAT } from './constants';

/**
 * Format date string to display format
 */
export const formatDate = (date: string | Date, dateFormat = DISPLAY_DATE_FORMAT): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, dateFormat);
  } catch {
    return 'Invalid Date';
  }
};

/**
 * Format datetime string to display format
 */
export const formatDateTime = (
  datetime: string | Date,
  dateTimeFormat = DISPLAY_DATETIME_FORMAT
): string => {
  try {
    const dateObj = typeof datetime === 'string' ? parseISO(datetime) : datetime;
    return format(dateObj, dateTimeFormat);
  } catch {
    return 'Invalid DateTime';
  }
};

/**
 * Calculate days until date
 */
export const daysUntil = (date: string | Date): number => {
  try {
    const targetDate = typeof date === 'string' ? parseISO(date) : date;
    return differenceInDays(targetDate, new Date());
  } catch {
    return 0;
  }
};

/**
 * Check if warranty is expiring soon
 */
export const isWarrantyExpiringSoon = (warrantyEndDate?: string, threshold = 90): boolean => {
  if (!warrantyEndDate) return false;
  const days = daysUntil(warrantyEndDate);
  return days > 0 && days <= threshold;
};

/**
 * Format currency
 */
export const formatCurrency = (amount?: number, currency = 'USD'): string => {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

/**
 * Get initials from name
 */
export const getInitials = (firstName: string, lastName?: string): string => {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return `${first}${last}`;
};

/**
 * Truncate text
 */
export const truncate = (text: string, maxLength = 50): string => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Generate random color for avatars
 */
export const stringToColor = (string: string): string => {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
};

/**
 * Download file from blob
 */
export const downloadFile = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: any;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Check if object is empty
 */
export const isEmpty = (obj: any): boolean => {
  if (obj === null || obj === undefined) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
};

/**
 * Convert enum to options array
 */
export const enumToOptions = <T extends Record<string, string>>(
  enumObj: T,
  labels?: Record<keyof T, string>
): Array<{ value: string; label: string }> => {
  return Object.values(enumObj).map((value) => ({
    value,
    label: labels?.[value as keyof T] || value,
  }));
};

/**
 * Generate ticket number
 */
export const generateTicketNumber = (prefix = 'TKT'): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Validate email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

/**
 * Calculate percentage
 */
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

/**
 * Get contrast color (black or white) based on background
 */
export const getContrastColor = (hexColor: string): string => {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};
