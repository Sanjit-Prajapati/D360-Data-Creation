import {
  Box,
  MenuItem,
  Typography,
  Grid,
  Card,
  CardContent,
  Autocomplete,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { Button } from '@/components/ui/Button';
import { FormInput } from '@/components/ui/FormInput';
import { DateInput } from '@/components/ui/DateInput';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  DeleteOutlineRounded as DeleteIcon,
  WarningAmberRounded as WarningIcon,
} from '@mui/icons-material';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable, ColumnDef } from '@/components/common/DataTable';
import { isinService } from '@/services/isinService';
import { narrationService } from '@/services/narrationService';
import { IsinMaster } from '@/types';
import {
  FIP_IDS,
  CSV_EXPORT_HEADERS,
  SESSION_KEY,
  fieldStyle,
  labelStyle,
  disabledFieldStyle,
  PLACEHOLDER_SETTLEMENT_ID,
  PLACEHOLDER_ACCOUNT_NUMBER,
  NARRATION_SPLIT_REGEX,
} from './constants';

// ── Local transaction shape (client-side staging, not a server entity)
interface Transaction {
  id: string;
  txnId: string;
  isin: string;
  instrumentName: string;
  securityType: string;
  fipId: string;
  date: string;
  transactionType: string;
  narration: string;
  direction: string;
  quantity: number;
  createdAt: string;
}

interface FormData {
  txnId: string;
  date: string;
  transactionType: string;
  fipId: string;
  narration: string;
  direction: string;
  quantity: string;
  settlementId: string;
  accountNumber: string;
}

const INITIAL_FORM: FormData = {
  txnId: '',
  date: new Date().toISOString().split('T')[0],
  transactionType: '',
  fipId: '',
  narration: '',
  direction: 'CREDIT',
  quantity: '',
  settlementId: '',
  accountNumber: '',
};

// ── ID generator — more readable than Date.now() + Math.random()
const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// ── Prevent formula injection in CSV exports
const sanitizeCSV = (value: unknown): string => {
  const str = String(value);
  return /^[=+\-@]/.test(str) ? `'${str}` : str;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const TransactionCreation = () => {
  // ── ISIN search state
  const [selectedIsin, setSelectedIsin] = useState<IsinMaster | null>(null);
  const [isinSearchText, setIsinSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [isinFieldOpen, setIsinFieldOpen] = useState(false);

  // ── Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);

  // ── Form state — explicitly typed
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);

  // ── Transactions — persisted to sessionStorage
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed: unknown[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed.every(
            (txn): txn is Transaction =>
              typeof txn === 'object' &&
              txn !== null &&
              'id' in txn &&
              'isin' in txn &&
              typeof (txn as Transaction).quantity === 'number',
          );
          return valid ? (parsed as Transaction[]) : [];
        }
      }
    } catch {
      console.error('Failed to load draft from sessionStorage');
    }
    return [];
  });

  // Save to sessionStorage whenever transactions change
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(transactions));
    } catch {
      console.error('Failed to save draft to sessionStorage');
    }
  }, [transactions]);

  // ── Debounce ISIN search text (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchText(isinSearchText), 300);
    return () => clearTimeout(timer);
  }, [isinSearchText]);

  // ── Server state
  const { data: isins = [], isLoading } = useQuery({
    queryKey: ['isins-search', debouncedSearchText],
    queryFn: async () => {
      const filters: Record<string, string> = {};
      if (debouncedSearchText) filters.search = debouncedSearchText;
      const results = await isinService.getAll(filters);
      return results.slice(0, 50); // cap at 50 for performance
    },
    enabled: isinFieldOpen,
    staleTime: 5 * 60 * 1000,
  });

  const { data: transactionTypes = [] } = useQuery({
    queryKey: ['transaction-types'],
    queryFn: () => narrationService.getTransactionTypes(),
    staleTime: Infinity,
  });

  const { data: filteredNarrations = [], isLoading: isLoadingNarrations } = useQuery({
    queryKey: ['narrations-options', formData.transactionType, formData.fipId],
    queryFn: () => narrationService.getNarrationOptions(formData.fipId, formData.transactionType),
    enabled: !!formData.transactionType && !!formData.fipId,
  });

  // ── Derived state — which narration placeholders are active
  const selectedNarrationRecord = useMemo(
    () => filteredNarrations.find(n => n.narration_regex === formData.narration),
    [filteredNarrations, formData.narration],
  );

  const hasSettlementId = selectedNarrationRecord?.narration_regex.includes(PLACEHOLDER_SETTLEMENT_ID) ?? false;
  const hasAccountNumber = selectedNarrationRecord?.narration_regex.includes(PLACEHOLDER_ACCOUNT_NUMBER) ?? false;

  // ── Replace placeholders with user-entered values for final narration
  const getFinalNarration = useCallback((): string => {
    if (!formData.narration) return '';
    let result = formData.narration;
    if (hasSettlementId && formData.settlementId) {
      result = result.replace(PLACEHOLDER_SETTLEMENT_ID, formData.settlementId);
    }
    if (hasAccountNumber && formData.accountNumber) {
      result = result.replace(PLACEHOLDER_ACCOUNT_NUMBER, formData.accountNumber);
    }
    return result;
  }, [formData, hasSettlementId, hasAccountNumber]);

  // ── Field change handler — clears dependent fields when parent changes
  const handleFieldChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      // Changing transactionType or fipId clears downstream narration + dynamic fields
      if (field === 'transactionType' || field === 'fipId') {
        next.narration = '';
        next.settlementId = '';
        next.accountNumber = '';
      }
      // Changing narration clears its dynamic fields
      if (field === 'narration') {
        next.settlementId = '';
        next.accountNumber = '';
      }
      return next;
    });
  }, []);

  // ── Add transaction — validation with inline error (no alert())
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleAddTransaction = () => {
    setValidationError(null);

    if (!selectedIsin) return setValidationError('Please select an ISIN');
    if (!formData.fipId) return setValidationError('Please select a FIP ID');

    const sanitizedTxnId = formData.txnId.trim();
    if (!sanitizedTxnId) return setValidationError('Please enter a Transaction ID');
    if (/[<>"'&]/.test(sanitizedTxnId)) return setValidationError('Transaction ID contains invalid characters');
    if (!formData.date) return setValidationError('Please select a Date');
    if (!formData.transactionType) return setValidationError('Please select a Transaction Type');
    if (!formData.narration) return setValidationError('Please select a Narration');

    const qty = parseFloat(formData.quantity);
    if (!formData.quantity || isNaN(qty) || qty <= 0) return setValidationError('Please enter a valid positive Quantity');
    if (hasSettlementId && formData.settlementId.length !== 7) return setValidationError('Settlement ID must be exactly 7 digits');
    if (hasAccountNumber && formData.accountNumber.length !== 16) return setValidationError('Account Number must be exactly 16 digits');

    const direction = selectedNarrationRecord?.direction ?? 'CREDIT';

    const newTransaction: Transaction = {
      id: generateId(),
      txnId: sanitizedTxnId,
      isin: selectedIsin.isin,
      instrumentName: selectedIsin.instrument_name,
      securityType: selectedIsin.security_type,
      fipId: formData.fipId,
      date: formData.date,
      transactionType: formData.transactionType,
      narration: getFinalNarration(),
      direction,
      quantity: qty,
      createdAt: new Date().toISOString(),
    };

    setTransactions(prev => [...prev, newTransaction]);
    // Keep form values — allows quick addition of similar transactions
  };

  // ── Delete handlers
  const handleOpenDelete = (id: string) => {
    setTransactionToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleCloseDelete = () => {
    setDeleteConfirmOpen(false);
    setTransactionToDelete(null); // always reset to avoid stale id
  };

  const handleConfirmDelete = () => {
    if (transactionToDelete) {
      setTransactions(prev => prev.filter(t => t.id !== transactionToDelete));
    }
    handleCloseDelete();
  };

  const handleConfirmDeleteAll = () => {
    setTransactions([]);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      console.error('Failed to clear draft from sessionStorage');
    }
    setDeleteAllConfirmOpen(false);
  };

  // ── CSV export with specific column format required by downstream system
  const handleExportCSV = () => {
    if (transactions.length === 0) return;

    const csvRows = transactions.map((txn, index) => [
      '',                                                   // _id
      txn.fipId,                                            // fipId
      '', '',                                               // holderId, dematId
      'ACCOUNT_AGGREGATOR',                                 // dataSource
      '',                                                   // referenceId
      txn.txnId,                                            // txnId
      10001 + index,                                        // orderId
      txn.instrumentName,                                   // instrumentName
      new Date(txn.date).toISOString(),                     // tradeDate
      Math.random() > 0.5 ? 'BSE' : 'NSE',                 // exchangeType
      txn.isin,                                             // isin
      txn.instrumentName,                                   // isinDescription
      txn.securityType,                                     // category
      txn.narration,                                        // narration
      '50.00',                                              // rate
      txn.direction === 'CREDIT' ? 'BUY' : 'SELL',         // direction
      txn.quantity,                                         // quantity
      'PENDING',                                            // txnExecutionStatus
      '', '', '', '', '', '', '', '', '',                   // audit fields (empty)
    ]);

    const csvContent = [
      [...CSV_EXPORT_HEADERS].join(','),
      ...csvRows.map(row => row.map(cell => `"${sanitizeCSV(cell)}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions_${Date.now()}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // ← prevent memory leak
  };

  // ── Column definitions
  const columns: ColumnDef<Transaction>[] = useMemo(
    () => [
      { field: 'fipId',          headerName: 'FIP ID',        minWidth: 130, sortable: true },
      { field: 'txnId',          headerName: 'Txn ID',        minWidth: 150, sortable: true },
      { field: 'date',           headerName: 'Trade Date',    minWidth: 110, sortable: true },
      {
        field: 'isin',
        headerName: 'ISIN',
        minWidth: 120,
        sortable: true,
        renderCell: row => (
          <Typography sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.8125rem' }}>
            {row.isin}
          </Typography>
        ),
      },
      { field: 'instrumentName', headerName: 'Security Name', minWidth: 200, sortable: true },
      { field: 'securityType',   headerName: 'Security Type', minWidth: 120, sortable: true },
      { field: 'narration',      headerName: 'Narration',     minWidth: 250, sortable: true },
      { field: 'direction',      headerName: 'Direction',     minWidth: 100, sortable: true },
      {
        field: 'quantity',
        headerName: 'Quantity',
        minWidth: 120,
        sortable: true,
        renderCell: row => String(row.quantity),
      },
    ],
    [],
  );

  const isFormValid = useMemo(() => {
    if (!selectedIsin) return false;
    if (!formData.fipId) return false;
    if (!formData.txnId.trim()) return false;
    if (!formData.date) return false;
    if (!formData.transactionType) return false;
    if (!formData.narration) return false;
    if (!formData.quantity || isNaN(parseFloat(formData.quantity)) || parseFloat(formData.quantity) <= 0) return false;
    if (hasSettlementId && formData.settlementId.length !== 7) return false;
    if (hasAccountNumber && formData.accountNumber.length !== 16) return false;
    return true;
  }, [selectedIsin, formData, hasSettlementId, hasAccountNumber]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ flexShrink: 0 }}>
        <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <CardContent sx={{ p: 2 }}>

            {/* Validation error banner */}
            {validationError && (
              <Box
                sx={{
                  mb: 1.5, px: 2, py: 1, borderRadius: 1.5,
                  backgroundColor: 'error.lighter',
                  border: '1px solid', borderColor: 'error.light',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <Typography sx={{ fontSize: '0.82rem', color: 'error.dark', fontWeight: 500 }}>
                  {validationError}
                </Typography>
                <IconButton size="small" onClick={() => setValidationError(null)} sx={{ p: 0.25 }}>
                  <ClearIcon sx={{ fontSize: 16, color: 'error.dark' }} />
                </IconButton>
              </Box>
            )}

            {/* Row 1: ISIN, Security Name, Security Type, FIP ID */}
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Typography variant="caption" sx={labelStyle}>
                  ISIN <span className="required">*</span>
                </Typography>
                <Autocomplete
                  value={selectedIsin}
                  onChange={(_, newValue) => setSelectedIsin(newValue)}
                  onInputChange={(_, newInputValue) => setIsinSearchText(newInputValue)}
                  onOpen={() => {
                    setIsinFieldOpen(true);
                    setIsinSearchText('');
                    setDebouncedSearchText('');
                  }}
                  onClose={() => setIsinFieldOpen(false)}
                  options={isins}
                  getOptionLabel={(option) => `${option.isin} - ${option.instrument_name}`}
                  filterOptions={(x) => x}
                  loading={isLoading}
                  loadingText="Loading ISINs..."
                  noOptionsText="No ISINs found — start typing to search"
                  size="small"
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Type ISIN or Name to search..."
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <InputAdornment position="start">
                              <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                            </InputAdornment>
                            {params.InputProps.startAdornment}
                          </>
                        ),
                      }}
                      sx={fieldStyle}
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'primary.main' }}>
                          {option.isin}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {option.instrument_name}
                        </Typography>
                      </Box>
                    </li>
                  )}
                  ListboxProps={{ style: { maxHeight: 250 } }}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <FormInput
                  label="Security Name"
                  value={selectedIsin?.instrument_name ?? ''}
                  placeholder="Auto-populated from ISIN"
                  disabled
                  sx={disabledFieldStyle}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <FormInput
                  label="Security Type"
                  value={selectedIsin?.security_type ?? ''}
                  placeholder="Auto-populated from ISIN"
                  disabled
                  sx={disabledFieldStyle}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <FormInput
                  select
                  label="FIP ID"
                  required
                  value={formData.fipId}
                  onChange={(e) => handleFieldChange('fipId', e.target.value)}
                  sx={fieldStyle}
                  SelectProps={{ displayEmpty: true, MenuProps: { PaperProps: { sx: { maxHeight: 250 } } } }}
                  InputProps={{
                    endAdornment: formData.fipId ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => handleFieldChange('fipId', '')} edge="end" sx={{ mr: 1 }}>
                          <ClearIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                >
                  <MenuItem value="" disabled sx={{ fontSize: '0.85rem' }}>Select FIP ID</MenuItem>
                  {FIP_IDS.map((fip) => (
                    <MenuItem key={fip.value} value={fip.value} sx={{ fontSize: '0.85rem' }}>
                      {fip.label}
                    </MenuItem>
                  ))}
                </FormInput>
              </Grid>
            </Grid>

            {/* Row 2: Txn ID, Date, Transaction Type, Narration, Quantity + Add */}
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} md={3}>
                <FormInput
                  label="Txn ID"
                  required
                  value={formData.txnId}
                  onChange={(e) => handleFieldChange('txnId', e.target.value)}
                  placeholder="Enter Transaction ID"
                  sx={fieldStyle}
                />
              </Grid>

              <Grid item xs={12} md={1.5}>
                <DateInput
                  label="Date"
                  required
                  value={formData.date}
                  onChange={(e) => handleFieldChange('date', e.target.value)}
                  sx={fieldStyle}
                />
              </Grid>

              <Grid item xs={12} md={2}>
                <FormInput
                  select
                  label="Transaction Type"
                  required
                  value={formData.transactionType}
                  onChange={(e) => handleFieldChange('transactionType', e.target.value)}
                  sx={fieldStyle}
                  SelectProps={{ displayEmpty: true, MenuProps: { PaperProps: { sx: { maxHeight: 250 } } } }}
                  InputProps={{
                    endAdornment: formData.transactionType ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => handleFieldChange('transactionType', '')} edge="end" sx={{ mr: 1 }}>
                          <ClearIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                >
                  <MenuItem value="" disabled sx={{ fontSize: '0.85rem' }}>Select Transaction Type</MenuItem>
                  {transactionTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value} sx={{ fontSize: '0.85rem' }}>
                      {type.label}
                    </MenuItem>
                  ))}
                </FormInput>
              </Grid>

              {/* Narration — dropdown or inline editor with placeholder inputs */}
              <Grid item xs={12} md={4}>
                <Typography variant="caption" sx={labelStyle}>
                  Narration <span className="required">*</span>
                </Typography>

                {!formData.narration ? (
                  <FormInput
                    select
                    value=""
                    onChange={(e) => handleFieldChange('narration', e.target.value)}
                    disabled={!formData.transactionType || !formData.fipId || filteredNarrations.length === 0}
                    sx={fieldStyle}
                    SelectProps={{ displayEmpty: true, MenuProps: { PaperProps: { sx: { maxHeight: 250 } } } }}
                  >
                    <MenuItem value="" disabled sx={{ fontSize: '0.85rem' }}>
                      {!formData.transactionType || !formData.fipId
                        ? 'Select Transaction Type & FIP ID first'
                        : isLoadingNarrations
                        ? 'Loading narrations...'
                        : filteredNarrations.length === 0
                        ? 'No narrations found'
                        : 'Select Narration'}
                    </MenuItem>
                    {filteredNarrations.map((narration) => (
                      <MenuItem key={narration.id} value={narration.narration_regex} sx={{ fontSize: '0.85rem' }}>
                        {narration.narration_regex}
                      </MenuItem>
                    ))}
                  </FormInput>
                ) : (
                  // Inline editor: narration text with embedded TextField inputs for placeholders
                  <Box
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 0.5,
                      border: '1px solid', borderColor: 'divider',
                      borderRadius: 1.5, px: 1.5, py: 0.75,
                      minHeight: 38, flexWrap: 'wrap',
                      bgcolor: 'background.paper',
                    }}
                  >
                    {formData.narration.split(NARRATION_SPLIT_REGEX).map((part, index) => {
                      if (part === PLACEHOLDER_SETTLEMENT_ID) {
                        return (
                          <TextField
                            key={index}
                            size="small"
                            value={formData.settlementId}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 7);
                              handleFieldChange('settlementId', value);
                            }}
                            placeholder="7 digits"
                            inputProps={{ maxLength: 7 }}
                            error={formData.settlementId.length > 0 && formData.settlementId.length !== 7}
                            sx={{
                              width: '100px',
                              '& .MuiOutlinedInput-root': {
                                height: 28, fontSize: '0.85rem',
                                bgcolor: hasSettlementId && formData.settlementId.length === 7 ? 'success.lighter' : 'grey.50',
                              },
                              '& .MuiOutlinedInput-input': { py: 0.5, px: 1 },
                            }}
                          />
                        );
                      }
                      if (part === PLACEHOLDER_ACCOUNT_NUMBER) {
                        return (
                          <TextField
                            key={index}
                            size="small"
                            value={formData.accountNumber}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 16);
                              handleFieldChange('accountNumber', value);
                            }}
                            placeholder="16 digits"
                            inputProps={{ maxLength: 16 }}
                            error={formData.accountNumber.length > 0 && formData.accountNumber.length !== 16}
                            sx={{
                              width: '140px',
                              '& .MuiOutlinedInput-root': {
                                height: 28, fontSize: '0.85rem',
                                bgcolor: hasAccountNumber && formData.accountNumber.length === 16 ? 'success.lighter' : 'grey.50',
                              },
                              '& .MuiOutlinedInput-input': { py: 0.5, px: 1 },
                            }}
                          />
                        );
                      }
                      return (
                        <Typography key={index} component="span" sx={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          {part}
                        </Typography>
                      );
                    })}
                    <IconButton size="small" onClick={() => handleFieldChange('narration', '')} sx={{ ml: 'auto', p: 0.5 }}>
                      <ClearIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                )}
              </Grid>

              <Grid item xs={12} md={1.5}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                  <FormInput
                    label="Qty"
                    required
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => handleFieldChange('quantity', e.target.value)}
                    placeholder="100"
                    sx={fieldStyle}
                  />
                  <Button
                    variant="contained"
                    onClick={handleAddTransaction}
                    disabled={!isFormValid}
                    sx={{
                      minWidth: 40, width: 40, height: 38,
                      bgcolor: 'black', color: 'white',
                      fontSize: '1.2rem', padding: 0,
                      '&:hover': { bgcolor: 'grey.800' },
                    }}
                  >
                    +
                  </Button>
                </Box>
              </Grid>
            </Grid>

          </CardContent>
        </Card>
      </Box>

      {/* DataTable */}
      <Box sx={{ flex: 1, overflow: 'hidden', mt: 2 }}>
        <DataTable<Transaction>
          data={transactions}
          columns={columns}
          idField="id"
          loading={false}
          disableSearch={false}
          disableColumnFilters={true}
          searchPlaceholder="Search transactions..."
          searchFields={['fipId', 'txnId', 'isin', 'instrumentName', 'narration']}
          onDelete={row => handleOpenDelete(row.id)}
          exportFilename="transactions.csv"
          onExport={handleExportCSV}
          customToolbarActions={
            <Button
              variant="contained"
              color="error"
              onClick={() => setDeleteAllConfirmOpen(true)}
              disabled={transactions.length === 0}
              startIcon={<DeleteIcon sx={{ fontSize: 18 }} />}
              sx={{
                fontWeight: 700, height: 34, borderRadius: 1.5,
                fontSize: '0.8125rem', px: 2,
              }}
            >
              Delete All
            </Button>
          }
        />
      </Box>

      {/* ── Delete Single Confirmation ── */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCloseDelete}
        PaperProps={{
          sx: {
            borderRadius: 2.5, backgroundColor: 'background.paper',
            backgroundImage: 'none', border: '1px solid', borderColor: 'divider', maxWidth: 400,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem', pb: 1 }}>
          Delete Transaction?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Are you sure you want to delete this transaction? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={handleCloseDelete}
            sx={{ color: 'text.secondary', borderColor: 'divider' }}
          >
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete All Confirmation ── */}
      <Dialog
        open={deleteAllConfirmOpen}
        onClose={() => setDeleteAllConfirmOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 2.5, backgroundColor: 'background.paper',
            backgroundImage: 'none', border: '1px solid', borderColor: 'divider', maxWidth: 450,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem', pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon sx={{ color: 'error.main', fontSize: 24 }} />
          Delete All Transactions?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Are you sure you want to delete <strong>all {transactions.length} transaction(s)</strong>? This action is permanent and cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteAllConfirmOpen(false)}
            sx={{ color: 'text.secondary', borderColor: 'divider' }}
          >
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirmDeleteAll}>
            Delete All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
