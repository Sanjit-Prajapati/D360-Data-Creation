// ── Direction options
export const DIRECTIONS = [
  { value: 'CREDIT', label: 'CREDIT' },
  { value: 'DEBIT',  label: 'DEBIT'  },
] as const;

// ── Data source options
export const DATA_SOURCES = [
  { value: 'Account Aggregator', label: 'Account Aggregator' },
  { value: 'Manual',             label: 'Manual'             },
  { value: 'D360 System',        label: 'D360 System'        },
] as const;

// ── CSV export headers (fixed format required by downstream system)
export const CSV_EXPORT_HEADERS = [
  '_id', 'transactionCategory', 'userId', 'holderId', 'dematAccountId',
  'policyId', 'transactionType', 'isin', 'quantity', 'rate',
  'tradeDate', 'settlementDate', 'effectiveDate', 'direction',
  'referenceId', 'dataSource', 'txnId', 'orderId',
  'createdOn', 'createdBy._id', 'createdBy.name', 'createdBy.email',
  'modifiedOn', 'modifiedBy._id', 'modifiedBy.name', 'modifiedBy.email', '_class',
] as const;

// ── Session-storage key — single source of truth
export const SESSION_KEY = 'main-transaction-draft';

// ── Shared style objects — defined outside the component so they are
//    stable references and don't trigger unnecessary re-renders
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
