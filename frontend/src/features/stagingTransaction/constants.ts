// ── FIP ID options (hardcoded for now — replace with API call when available)
export const FIP_IDS = [
  { value: 'fip@finrepo', label: 'fip@finrepo' },
  { value: 'fip@nsdl',    label: 'fip@nsdl'    },
  { value: 'CDSLFIP',     label: 'CDSLFIP'      },
] as const;

// ── CSV export headers (fixed format required by downstream system)
export const CSV_EXPORT_HEADERS = [
  '_id', 'fipId', 'holderId', 'dematId', 'dataSource', 'referenceId',
  'txnId', 'orderId', 'instrumentName', 'tradeDate', 'exchangeType',
  'isin', 'isinDescription', 'category', 'narration', 'rate', 'direction',
  'quantity', 'txnExecutionStatus', 'createdOn', 'createdBy._id',
  'createdBy.name', 'createdBy.email', 'modifiedOn', 'modifiedBy._id',
  'modifiedBy.name', 'modifiedBy.email', '_class',
] as const;

// ── Shared style objects — defined outside the component so they
//    are stable references and don't trigger re-renders
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

export const disabledFieldStyle = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 1.5,
    fontSize: '0.85rem',
  },
  '& .MuiOutlinedInput-root.Mui-disabled': {
    bgcolor: 'action.hover',
    '& fieldset': { borderColor: 'divider' },
  },
  '& .MuiInputBase-input.Mui-disabled': {
    WebkitTextFillColor: 'rgba(0, 0, 0, 0.6)',
    fontWeight: 600,
  },
} as const;

// ── Session-storage key — single source of truth
export const SESSION_KEY = 'transaction-draft';

// ── Narration placeholder tokens
export const PLACEHOLDER_SETTLEMENT_ID = '{SettlementId}';
export const PLACEHOLDER_ACCOUNT_NUMBER = '{AccountNumber}';
export const NARRATION_SPLIT_REGEX = /(\{SettlementId\}|\{AccountNumber\})/;
