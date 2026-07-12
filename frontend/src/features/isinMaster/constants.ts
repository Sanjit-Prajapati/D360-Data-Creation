import { IsinMasterFormData } from '@/types';

// ── Security type options
export const SECURITY_TYPES = ['EQUITY', 'REIT', 'INVIT'] as const;
export type SecurityType = (typeof SECURITY_TYPES)[number];

// ── Status options
export const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE'] as const;
export type StatusOption = (typeof STATUS_OPTIONS)[number];

// ── Initial / empty form state
export const INITIAL_FORM: IsinMasterFormData = {
  isin: '',
  instrument_name: '',
  symbol: '',
  security_type: 'EQUITY',
  status: 'ACTIVE',
};
