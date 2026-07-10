import {
  Box,
  Button,
  TextField,
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
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Clear as ClearIcon,
  DeleteOutlineRounded as DeleteIcon,
  WarningAmberRounded as WarningIcon,
} from '@mui/icons-material';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable, ColumnDef } from '@/components/common/DataTable';
import { isinService } from '@/services/isinService';
import { narrationService } from '@/services/narrationService';
import { IsinMaster } from '@/types';

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

export const MainTransaction = () => {
  const [selectedIsin, setSelectedIsin] = useState<IsinMaster | null>(null);
  const [isinSearchText, setIsinSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [isinFieldOpen, setIsinFieldOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  
  // Refs for date inputs
  const tradeDateRef = useRef<HTMLInputElement>(null);
  const settlementDateRef = useRef<HTMLInputElement>(null);
  const effectiveDateRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    txnId: '',
    date: new Date().toISOString().split('T')[0],
    transactionType: '',
    direction: 'CREDIT',
    quantity: '',
    settlementDate: new Date().toISOString().split('T')[0],
    effectiveDate: new Date().toISOString().split('T')[0],
    rate: '',
    dataSource: 'Account Aggregator',
  });

  // Temporary mock data - replace with actual API call
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    // Load from sessionStorage on initial mount
    try {
      const saved = sessionStorage.getItem('transaction-draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Failed to load draft from sessionStorage:', error);
    }
    return [];
  });

  // Save to sessionStorage whenever transactions change
  useEffect(() => {
    try {
      sessionStorage.setItem('transaction-draft', JSON.stringify(transactions));
    } catch (error) {
      console.error('Failed to save draft to sessionStorage:', error);
    }
  }, [transactions]);

  // Debounce search text
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(isinSearchText);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [isinSearchText]);

  // Fetch ISINs when field is opened OR when user searches (debounced)
  // Limit to first 50 results for performance
  const { data: isins = [], isLoading } = useQuery({
    queryKey: ['isins-search', debouncedSearchText],
    queryFn: async () => {
      const filters: Record<string, any> = {};
      if (debouncedSearchText) {
        filters.search = debouncedSearchText;
      }
      const results = await isinService.getAll(filters);
      // Limit to first 50 for performance
      return results.slice(0, 50);
    },
    enabled: isinFieldOpen,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const { data: transactionTypes = [] } = useQuery({
    queryKey: ['transaction-types'],
    queryFn: () => narrationService.getTransactionTypes(),
  });

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTransaction = () => {
    // All fields are mandatory
    if (!selectedIsin || !formData.txnId || !formData.transactionType || !formData.quantity || !formData.rate) {
      alert('Please fill in all required fields');
      return;
    }

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      txnId: formData.txnId,
      isin: selectedIsin.isin,
      instrumentName: selectedIsin.instrument_name,
      securityType: selectedIsin.security_type,
      fipId: '', // Not used in Main Transaction
      date: formData.date,
      transactionType: formData.transactionType,
      narration: '', // Not used in Main Transaction
      direction: formData.direction,
      quantity: parseFloat(formData.quantity),
      settlementDate: formData.settlementDate,
      effectiveDate: formData.effectiveDate,
      rate: formData.rate,
      dataSource: formData.dataSource,
      createdAt: new Date().toISOString(),
    };

    setTransactions(prev => [...prev, newTransaction]);

    // Keep all fields with their current values - don't clear anything
  };

  const handleOpenDelete = (id: string) => {
    setTransactionToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (transactionToDelete) {
      setTransactions(prev => prev.filter(t => t.id !== transactionToDelete));
      setTransactionToDelete(null);
    }
    setDeleteConfirmOpen(false);
  };

  const handleDeleteAll = () => {
    setDeleteAllConfirmOpen(true);
  };

  const handleConfirmDeleteAll = () => {
    setTransactions([]);
    // Clear sessionStorage when all transactions are deleted
    try {
      sessionStorage.removeItem('transaction-draft');
    } catch (error) {
      console.error('Failed to clear draft from sessionStorage:', error);
    }
    setDeleteAllConfirmOpen(false);
  };

  // Custom CSV Export with specific format and columns
  const handleExportCSV = () => {
    if (transactions.length === 0) return;

    // Define headers
    const headers = [
      '_id',
      'fipId',
      'holderId',
      'dematId',
      'dataSource',
      'referenceId',
      'txnId',
      'orderId',
      'instrumentName',
      'tradeDate',
      'exchangeType',
      'isin',
      'isinDescription',
      'category',
      'narration',
      'rate',
      'direction',
      'quantity',
      'txnExecutionStatus',
      'createdOn',
      'createdBy._id',
      'createdBy.name',
      'createdBy.email',
      'modifiedOn',
      'modifiedBy._id',
      'modifiedBy.name',
      'modifiedBy.email'
    ];

    // Transform transactions to CSV rows
    const csvRows = transactions.map((txn, index) => {
      // Generate orderId starting from 10001
      const orderId = 10001 + index;
      
      // Determine exchangeType randomly (BSE or NSE)
      const exchangeType = Math.random() > 0.5 ? 'BSE' : 'NSE';
      
      // Convert direction: CREDIT -> BUY, DEBIT -> SELL
      const direction = txn.direction === 'CREDIT' ? 'BUY' : 'SELL';
      
      // Format date as ISO string with time (YYYY-MM-DDTHH:mm:ss.sssZ)
      const tradeDate = new Date(txn.date).toISOString();

      return [
        '', // _id - empty
        txn.fipId,
        '', // holderId - empty
        '', // dematId - empty
        'ACCOUNT_AGGREGATOR', // dataSource - default
        '', // referenceId - empty
        txn.txnId || '',
        orderId,
        txn.instrumentName,
        tradeDate,
        exchangeType,
        txn.isin,
        txn.instrumentName, // isinDescription = instrument name
        txn.securityType, // category = security type
        txn.narration,
        '50.00', // rate - default
        direction,
        txn.quantity,
        'PENDING', // txnExecutionStatus - default
        '', // createdOn - empty
        '', // createdBy._id - empty
        '', // createdBy.name - empty
        '', // createdBy.email - empty
        '', // modifiedOn - empty
        '', // modifiedBy._id - empty
        '', // modifiedBy.name - empty
        ''  // modifiedBy.email - empty
      ];
    });

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob with UTF-8 encoding
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const DATA_SOURCES = [
    { value: 'Account Aggregator', label: 'Account Aggregator' },
    { value: 'Manual', label: 'Manual' },
    { value: 'D360 System', label: 'D360 System' },
  ];

  const DIRECTIONS = [
    { value: 'CREDIT', label: 'CREDIT' },
    { value: 'DEBIT', label: 'DEBIT' },
  ];

  const FIP_IDS = [
    { value: 'fip@finrepo', label: 'fip@finrepo' },
    { value: 'fip@nsdl', label: 'fip@nsdl' },
    { value: 'CDSLFIP', label: 'CDSLFIP' },
  ];

  const fieldStyle = {
    '& .MuiOutlinedInput-root': { 
      borderRadius: 1.5, 
      fontSize: '0.85rem' 
    },
  };

  const labelStyle = {
    fontWeight: 600,
    mb: 0.5,
    display: 'block',
    color: 'text.secondary',
  };

  const disabledStyle = {
    '& .MuiOutlinedInput-root': { 
      borderRadius: 1.5, 
      fontSize: '0.85rem' 
    },
    '& .MuiOutlinedInput-root.Mui-disabled': {
      bgcolor: 'action.hover',
      '& fieldset': { borderColor: 'divider' },
    },
    '& .MuiInputBase-input.Mui-disabled': {
      WebkitTextFillColor: 'rgba(0, 0, 0, 0.6)',
      fontWeight: 600,
    },
  };

  // Column definitions for DataTable - Reordered as per specification
  const columns: ColumnDef<Transaction>[] = useMemo(() => [
    {
      field: 'txnId',
      headerName: 'Txn ID',
      minWidth: 150,
      sortable: true,
    },
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
    { 
      field: 'date', 
      headerName: 'Trade Date', 
      minWidth: 110, 
      sortable: true 
    },
    { 
      field: 'settlementDate', 
      headerName: 'Settlement Date', 
      minWidth: 130, 
      sortable: true 
    },
    { 
      field: 'effectiveDate', 
      headerName: 'Effective Date', 
      minWidth: 130, 
      sortable: true 
    },
    {
      field: 'transactionType',
      headerName: 'Transaction Type',
      minWidth: 150,
      sortable: true,
    },
    { 
      field: 'direction', 
      headerName: 'Direction', 
      minWidth: 100, 
      sortable: true,
    },
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
    { 
      field: 'dataSource', 
      headerName: 'Data Source', 
      minWidth: 180, 
      sortable: true 
    },
  ], []);

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ flexShrink: 0 }}>
      <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="caption" sx={labelStyle}>
                ISIN *
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
                noOptionsText="No ISINs found - start typing to search"
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
                ListboxProps={{
                  style: { maxHeight: 250 }
                }}
              />
            </Grid>

            <Grid item xs={12} md={3.5}>
              <Typography variant="caption" sx={labelStyle}>
                Transaction ID
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={formData.txnId}
                onChange={(e) => handleFieldChange('txnId', e.target.value)}
                placeholder="Enter Txn ID"
                sx={fieldStyle}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <Typography variant="caption" sx={labelStyle}>
                Transaction Type *
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={formData.transactionType}
                onChange={(e) => handleFieldChange('transactionType', e.target.value)}
                sx={fieldStyle}
                SelectProps={{
                  displayEmpty: true,
                  MenuProps: { PaperProps: { sx: { maxHeight: 250 } } }
                }}
                InputProps={{
                  endAdornment: formData.transactionType ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => handleFieldChange('transactionType', '')}
                        edge="end"
                        sx={{ mr: 1 }}
                      >
                        <ClearIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              >
                <MenuItem value="" disabled sx={{ fontSize: '0.85rem' }}>
                  Select Transaction Type
                </MenuItem>
                {transactionTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value} sx={{ fontSize: '0.85rem' }}>
                    {type.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={1.5}>
              <Typography variant="caption" sx={labelStyle}>
                Direction *
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={formData.direction}
                onChange={(e) => handleFieldChange('direction', e.target.value)}
                sx={fieldStyle}
                SelectProps={{
                  displayEmpty: true,
                }}
              >
                {DIRECTIONS.map((dir) => (
                  <MenuItem key={dir.value} value={dir.value} sx={{ fontSize: '0.85rem' }}>
                    {dir.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 150 }}>
              <Typography variant="caption" sx={labelStyle}>
                Data Source *
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={formData.dataSource}
                onChange={(e) => handleFieldChange('dataSource', e.target.value)}
                sx={fieldStyle}
                SelectProps={{
                  displayEmpty: true,
                }}
              >
                {DATA_SOURCES.map((source) => (
                  <MenuItem key={source.value} value={source.value} sx={{ fontSize: '0.85rem' }}>
                    {source.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Box sx={{ flex: 1, minWidth: 150 }}>
              <Typography variant="caption" sx={labelStyle}>
                Trade Date *
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="date"
                value={formData.date}
                onChange={(e) => handleFieldChange('date', e.target.value)}
                inputRef={tradeDateRef}
                onClick={() => tradeDateRef.current?.showPicker?.()}
                sx={fieldStyle}
              />
            </Box>

            <Box sx={{ flex: 1, minWidth: 150 }}>
              <Typography variant="caption" sx={labelStyle}>
                Settlement Date *
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="date"
                value={formData.settlementDate}
                onChange={(e) => handleFieldChange('settlementDate', e.target.value)}
                inputRef={settlementDateRef}
                onClick={() => settlementDateRef.current?.showPicker?.()}
                sx={fieldStyle}
              />
            </Box>

            <Box sx={{ flex: 1, minWidth: 150 }}>
              <Typography variant="caption" sx={labelStyle}>
                Effective Date *
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="date"
                value={formData.effectiveDate}
                onChange={(e) => handleFieldChange('effectiveDate', e.target.value)}
                inputRef={effectiveDateRef}
                onClick={() => effectiveDateRef.current?.showPicker?.()}
                sx={fieldStyle}
              />
            </Box>

            <Box sx={{ flex: 1, minWidth: 120 }}>
              <Typography variant="caption" sx={labelStyle}>
                Quantity *
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={formData.quantity}
                onChange={(e) => handleFieldChange('quantity', e.target.value)}
                placeholder="100"
                sx={fieldStyle}
              />
            </Box>

            <Box sx={{ flex: 1, minWidth: 120 }}>
              <Typography variant="caption" sx={labelStyle}>
                Rate *
              </Typography>
              <TextField
                fullWidth
                size="small"
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
                sx={{
                  borderRadius: 1.5,
                  minWidth: 40,
                  width: 40,
                  height: 38,
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: 'none',
                  bgcolor: 'black',
                  color: 'white',
                  fontSize: '1.2rem',
                  padding: 0,
                  '&:hover': { bgcolor: 'grey.800' }
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
          searchFields={['fipId', 'txnId', 'isin', 'instrumentName', 'narration']}
          onDelete={row => handleOpenDelete(row.id)}
          exportFilename="transactions.csv"
          onExport={handleExportCSV}
          customToolbarActions={
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteAll}
              disabled={transactions.length === 0}
              startIcon={<DeleteIcon sx={{ fontSize: 18 }} />}
              sx={{
                fontWeight: 700,
                height: 34,
                borderRadius: 1.5,
                fontSize: '0.8125rem',
                px: 2,
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: '0 2px 8px rgba(211, 47, 47, 0.3)',
                },
                '&:disabled': {
                  backgroundColor: 'action.disabledBackground',
                  color: 'text.disabled',
                }
              }}
            >
              Delete All
            </Button>
          }
        />
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            backgroundColor: 'background.paper',
            backgroundImage: 'none',
            border: '1px solid',
            borderColor: 'divider',
            maxWidth: 400,
          }
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
            onClick={() => setDeleteConfirmOpen(false)}
            sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, color: 'text.secondary', borderColor: 'divider' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete All Confirmation Dialog */}
      <Dialog
        open={deleteAllConfirmOpen}
        onClose={() => setDeleteAllConfirmOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            backgroundColor: 'background.paper',
            backgroundImage: 'none',
            border: '1px solid',
            borderColor: 'divider',
            maxWidth: 450,
          }
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
            sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, color: 'text.secondary', borderColor: 'divider' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDeleteAll}
            sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
          >
            Delete All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
