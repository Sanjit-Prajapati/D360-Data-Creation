// ── Restriction level options
export const RESTRICTION_LEVELS = [
  { value: 'COMPANY', label: 'Company' },
  { value: 'GROUP',   label: 'Group'   },
  { value: 'USER',    label: 'User'    },
] as const;

export type RestrictionLevel = (typeof RESTRICTION_LEVELS)[number]['value'];

// ── Reason of restriction options
export const RESTRICTION_REASONS = [
  { value: 'RESEARCH',                     label: 'Research'                      },
  { value: 'UPSI',                          label: 'UPSI'                          },
  { value: 'PMS',                           label: 'PMS'                           },
  { value: 'INVESTMENT_BANKING_TRANSACTION', label: 'Investment Banking Transaction' },
  { value: 'TRADING_WINDOW_CLOSURE',        label: 'Trading Window Closure'        },
  { value: 'OTHERS',                        label: 'Others'                        },
] as const;

export type RestrictionReason = (typeof RESTRICTION_REASONS)[number]['value'];

// ── CSV export headers
export const CSV_EXPORT_HEADERS = [
  'isin', 'instrumentName', 'securityType', 'restrictionLevel',
  'restrictedFor', 'reasonOfRestriction', 'remark',
  'startDate', 'endDate', 'createdAt', '_class',
] as const;

// ── Session-storage key — single source of truth
export const SESSION_KEY = 'restricted-company-data';

// ── Shared style objects — outside the component to prevent re-creation on render
export const fieldStyle = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 1.5,
    fontSize: '0.85rem',
  },
} as const;

export const labelStyle = {
  fontWeight: 600,
  mb: 0.5,
  display: 'block',
  color: 'text.secondary',
  '& .required': { color: 'error.main' },
} as const;
