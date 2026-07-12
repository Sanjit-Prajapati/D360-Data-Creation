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
  DIRECTIONS,
  DATA_SOURCES,
  CSV_EXPORT_HEADERS,
  SESSION_KEY,
  fieldStyle,
  labelStyle,
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
  settlementDate: string;
  effectiveDate: string;
  rate: string;
  dataSource: string;
  createdAt: string;
}

interface FormData {
  txnId: string;
  date: string;
  transactionType: string;
  direction: string;
  quantity: string;
  settlementDate: string;
  effectiveDate: string;
  rate: string;
  dataSource: string;
}

const today = new Date().toISOString().split('T')[0];

const INITIAL_FORM: FormData = {
  txnId: '',
  date: today,
  transactionType: '',
  direction: 'CREDIT',
  quantity: '',
  settlementDate: today,
  effectiveDate: today,
  rate: '',
  dataSource: 'Account Aggregator',
};

// ── ID generator
const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// ── Prevent formula injection in CSV exports
const sanitizeCSV = (value: unknown): string => {
  const str = String(value);
  return /^[=+\-@]/.test(str) ? `'${str}` : str;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const MainTransaction = () => {
  // ── ISIN search state
  const [selectedIsin, setSelectedIsin] = useState<IsinMaster | null>(null);
  const [isinSearchText, setIsinSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [isinFieldOpen, setIsinFieldOpen] = useState(false);

  // ── Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);

  // ── Inline validation error (replaces alert())
  const [validationError, setValidationError] = useState<string | null>(null);

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

  // Persist to sessionStorage on every change
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
    staleTime: Infinity, // enums don't change at runtime
  });

  // ── Field change handler — stable reference via useCallback
  const handleFieldChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // ── Add transaction — inline validation, no alert()
  const handleAddTransaction = () => {
    setValidationError(null);

    if (!selectedIsin) return setValidationError('Please select an ISIN');

    const sanitizedTxnId = formData.txnId.trim();
    if (!sanitizedTxnId) return setValidationError('Please enter a Transaction ID');
    if (/[<>"'&]/.test(sanitizedTxnId)) return setValidationError('Transaction ID contains invalid characters');
    if (!formData.transactionType) return setValidationError('Please select a Transaction Type');
    if (!formData.direction) return setValidationError('Please select a Direction');
    if (!formData.dataSource) return setValidationError('Please select a Data Source');
    if (!formData.date) return setValidationError('Please select a Trade Date');
    if (!formData.settlementDate) return setValidationError('Please select a Settlement Date');
    if (!formData.effectiveDate) return setValidationError('Please select an Effective Date');

    const qty = parseFloat(formData.quantity);
    if (!formData.quantity || isNaN(qty) || qty <= 0) return setValidationError('Please enter a valid positive Quantity');

    const rateNum = parseFloat(formData.rate);
    if (!formData.rate || isNaN(rateNum) || rateNum <= 0) return setValidationError('Please enter a valid positive Rate');

    // Date logic validation
    if (new Date(formData.settlementDate) < new Date(formData.date)) {
      return setValidationError('Settlement Date cannot be before Trade Date');
    }

    const newTransaction: Transaction = {
      id: generateId(),
      txnId: sanitizedTxnId,
      isin: selectedIsin.isin,
      instrumentName: selectedIsin.instrument_name,
      securityType: selectedIsin.security_type,
      fipId: '',        // not used in Main Transaction
      narration: '',    // not used in Main Transaction
      date: formData.date,
      transactionType: formData.transactionType,
      direction: formData.direction,
      quantity: qty,
      settlementDate: formData.settlementDate,
      effectiveDate: formData.effectiveDate,
      rate: formData.rate,
      dataSource: formData.dataSource,
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
    setTransactionToDelete(null); // always reset to avoid stale id on backdrop dismiss
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

  // ── CSV export with the specific column format required by downstream system
  const handleExportCSV = useCallback(() => {
    if (transactions.length === 0) return;

    const csvRows = transactions.map(txn => [
      '',                                                           // _id
      'STOCKS',                                                     // transactionCategory
      '', '', '', '',                                               // userId, holderId, dematAccountId, policyId
      txn.transactionType,                                          // transactionType
      txn.isin,                                                     // isin
      txn.quantity,                                                 // quantity
      txn.rate,                                                     // rate
      new Date(txn.date).toISOString(),                             // tradeDate
      new Date(txn.settlementDate).toISOString(),                   // settlementDate
      new Date(txn.effectiveDate).toISOString(),                    // effectiveDate
      txn.direction,                                                // direction
      '',                                                           // referenceId
      txn.dataSource.toUpperCase().replace(/\s+/g, '_'),            // dataSource
      txn.txnId,                                                    // txnId
      '23:59:59',                                                   // orderId
      '', '', '', '', '', '', '', '', '',                           // audit fields (empty)
    ]);

    const csvContent = [
      [...CSV_EXPORT_HEADERS].join(','),
      ...csvRows.map(row => row.map(cell => `"${sanitizeCSV(cell)}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `main_transactions_${Date.now()}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // prevent memory leak
  }, [transactions]);

  // ── Column definitions
  const columns: ColumnDef<Transaction>[] = useMemo(
    () => [
      { field: 'txnId', headerName: 'Txn ID', minWidth: 150, sortable: true },
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
      { field: 'date',           headerName: 'Trade Date',       minWidth: 110, sortable: true },
      { field: 'settlementDate', headerName: 'Settlement Date',  minWidth: 130, sortable: true },
      { field: 'effectiveDate',  headerName: 'Effective Date',   minWidth: 130, sortable: true },
      {
        field: 'transactionType',
        headerName: 'Transaction Type',
        minWidth: 150,
        sortable: true,
        renderCell: row => {
          const type = transactionTypes.find(t => t.value === row.transactionType);
          return type ? type.label : row.transactionType;
        },
      },
      { field: 'direction', headerName: 'Direction', minWidth: 100, sortable: true },
      {
        field: 'quantity',
        headerName: 'Quantity',
        minWidth: 120,
        sortable: true,
        renderCell: row => String(row.quantity),
      },
      {
        field: 'rate',
        headerName: 'Rate',
        minWidth: 100,
        sortable: true,
        renderCell: row => row.rate || '50.00',
      },
      { field: 'dataSource', headerName: 'Data Source', minWidth: 180, sortable: true },
    ],
    [transactionTypes],
  );

  const isFormValid = useMemo(() => {
    if (!selectedIsin) return false;
    if (!formData.txnId.trim()) return false;
    if (!formData.transactionType) return false;
    if (!formData.direction) return false;
    if (!formData.dataSource) return false;
    if (!formData.date) return false;
    if (!formData.settlementDate) return false;
    if (!formData.effectiveDate) return false;
    if (!formData.quantity || isNaN(parseFloat(formData.quantity)) || parseFloat(formData.quantity) <= 0) return false;
    if (!formData.rate || isNaN(parseFloat(formData.rate)) || parseFloat(formData.rate) <= 0) return false;
    if (new Date(formData.settlementDate) < new Date(formData.date)) return false;
    return true;
  }, [selectedIsin, formData]);

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

            {/* Row 1: ISIN, Transaction ID, Transaction Type, Direction */}
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
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

              <Grid item xs={12} md={3.5}>
                <FormInput
                  label="Transaction ID"
                  required
                  value={formData.txnId}
                  onChange={(e) => handleFieldChange('txnId', e.target.value)}
                  placeholder="Enter Txn ID"
                  sx={fieldStyle}
                />
              </Grid>

              <Grid item xs={12} md={3}>
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

              <Grid item xs={12} md={1.5}>
                <FormInput
                  select
                  label="Direction"
                  required
                  value={formData.direction}
                  onChange={(e) => handleFieldChange('direction', e.target.value)}
                  sx={fieldStyle}
                  SelectProps={{ displayEmpty: true }}
                >
                  {DIRECTIONS.map((dir) => (
                    <MenuItem key={dir.value} value={dir.value} sx={{ fontSize: '0.85rem' }}>
                      {dir.label}
                    </MenuItem>
                  ))}
                </FormInput>
              </Grid>
            </Grid>

            {/* Row 2: Data Source, Trade Date, Settlement Date, Effective Date, Quantity, Rate, Add */}
            <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 150 }}>
                <FormInput
                  select
                  label="Data Source"
                  required
                  value={formData.dataSource}
                  onChange={(e) => handleFieldChange('dataSource', e.target.value)}
                  sx={fieldStyle}
                  SelectProps={{ displayEmpty: true }}
                >
                  {DATA_SOURCES.map((source) => (
                    <MenuItem key={source.value} value={source.value} sx={{ fontSize: '0.85rem' }}>
                      {source.label}
                    </MenuItem>
                  ))}
                </FormInput>
              </Box>

              <Box sx={{ flex: 1, minWidth: 150 }}>
                <DateInput
                  label="Trade Date"
                  required
                  value={formData.date}
                  onChange={(e) => handleFieldChange('date', e.target.value)}
                  sx={fieldStyle}
                />
              </Box>

              <Box sx={{ flex: 1, minWidth: 150 }}>
                <DateInput
                  label="Settlement Date"
                  required
                  value={formData.settlementDate}
                  onChange={(e) => handleFieldChange('settlementDate', e.target.value)}
                  sx={fieldStyle}
                />
              </Box>

              <Box sx={{ flex: 1, minWidth: 150 }}>
                <DateInput
                  label="Effective Date"
                  required
                  value={formData.effectiveDate}
                  onChange={(e) => handleFieldChange('effectiveDate', e.target.value)}
                  sx={fieldStyle}
                />
              </Box>

              <Box sx={{ flex: 1, minWidth: 120 }}>
                <FormInput
                  label="Quantity"
                  required
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleFieldChange('quantity', e.target.value)}
                  placeholder="100"
                  sx={fieldStyle}
                />
              </Box>

              <Box sx={{ flex: 1, minWidth: 120 }}>
                <FormInput
                  label="Rate"
                  required
                  type="number"
                  value={formData.rate}
                  onChange={(e) => handleFieldChange('rate', e.target.value)}
                  placeholder="50.00"
                  inputProps={{ step: '0.01' }}
                  sx={fieldStyle}
                />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'flex-end', minWidth: 50 }}>
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
            </Box>

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
          searchFields={['txnId', 'isin', 'instrumentName', 'transactionType', 'dataSource']}
          onDelete={row => handleOpenDelete(row.id)}
          exportFilename="main_transactions.csv"
          onExport={handleExportCSV}
          customToolbarActions={
            <Button
              variant="contained"
              color="error"
              onClick={() => setDeleteAllConfirmOpen(true)}
              disabled={transactions.length === 0}
              startIcon={<DeleteIcon sx={{ fontSize: 18 }} />}
              sx={{ fontWeight: 700, height: 34, borderRadius: 1.5, fontSize: '0.8125rem', px: 2 }}
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
          <Button variant="outlined" onClick={handleCloseDelete} sx={{ color: 'text.secondary', borderColor: 'divider' }}>
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
          <Button variant="outlined" onClick={() => setDeleteAllConfirmOpen(false)} sx={{ color: 'text.secondary', borderColor: 'divider' }}>
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
