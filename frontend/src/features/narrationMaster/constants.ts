import { NarrationRecordFormData } from '@/types';

// ── Direction options
export const DIRECTIONS = ['CREDIT', 'DEBIT'] as const;
export type Direction = (typeof DIRECTIONS)[number];

// ── Initial / empty form state
export const INITIAL_FORM: NarrationRecordFormData = {
  fip_id: '',
  narration_regex: '',
  transaction_type: '',
  transaction_group: '',
  direction: '',
};
