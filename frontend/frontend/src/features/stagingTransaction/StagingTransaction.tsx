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
  createdAt: string;
}

export const TransactionCreation = () => {
  const [selectedIsin, setSelectedIsin] = useState<IsinMaster | null>(null);
  const [isinSearchText, setIsinSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [isinFieldOpen, setIsinFieldOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  
  // Ref for date input
  const tradeDateRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    txnId: '',
    date: new Date().toISOString().split('T')[0],
    transactionType: '',
    fipId: '',
    narration: '',
    direction: 'CREDIT',
    quantity: '',
    settlementId: '',
    accountNumber: '',
  });

  // Temporary mock data - replace with actual API call
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    // Load from sessionStorage on initial mount
    try {
      const saved = sessionStorage.getItem('transaction-draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate structure
        if (Array.isArray(parsed)) {
          const valid = parsed.every(txn => 
            txn.id && txn.isin && typeof txn.quantity === 'number'
          );
          return valid ? parsed : [];
        }
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

  // Fetch narrations filtered by selected transaction type and FIP ID
  const { data: filteredNarrations = [], isLoading: isLoadingNarrations } = useQuery({
    queryKey: ['narrations-options', formData.transactionType, formData.fipId],
    queryFn: async () => {
      if (!formData.transactionType || !formData.fipId) return [];
      
      console.log('Fetching narration options:', {
        fipId: formData.fipId,
        transactionType: formData.transactionType,
      });
      
      const results = await narrationService.getNarrationOptions(formData.fipId, formData.transactionType);
      console.log('Narration options received:', results);
      return results;
    },
    enabled: !!formData.transactionType && !!formData.fipId,
  });

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear narration and dynamic fields when transaction type or FIP ID changes
    if (field === 'transactionType' || field === 'fipId') {
      setFormData(prev => ({ 
        ...prev, 
        narration: '',
        settlementId: '',
        accountNumber: '',
      }));
    }
    
    // Clear dynamic fields when narration changes
    if (field === 'narration') {
      setFormData(prev => ({ 
        ...prev, 
        settlementId: '',
        accountNumber: '',
      }));
    }
  };

  // Check if selected narration contains placeholders
  const selectedNarrationRecord = filteredNarrations.find(
    n => n.narration_regex === formData.narration
  );
  
  const hasSettlementId = selectedNarrationRecord?.narration_regex.includes('{SettlementId}') || false;
  const hasAccountNumber = selectedNarrationRecord?.narration_regex.includes('{AccountNumber}') || false;

  // Replace placeholders in narration with actual values
  const getFinalNarration = () => {
    if (!formData.narration) return '';
    
    let finalNarration = formData.narration;
    
    if (hasSettlementId && formData.settlementId) {
      finalNarration = finalNarration.replace('{SettlementId}', formData.settlementId);
    }
    
    if (hasAccountNumber && formData.accountNumber) {
      finalNarration = finalNarration.replace('{AccountNumber}', formData.accountNumber);
    }
    
    return finalNarration;
  };

  const handleAddTransaction = () => {
    // Validate all mandatory fields
    if (!selectedIsin) {
      alert('Please select an ISIN');
      return;
    }
    if (!formData.fipId) {
      alert('Please select FIP ID');
      return;
    }
    
    // Sanitize and validate Transaction ID
    const sanitizedTxnId = formData.txnId.trim();
    if (!sanitizedTxnId) {
      alert('Please enter Transaction ID');
      return;
    }
    if (/[<>\"'&]/.test(sanitizedTxnId)) {
      alert('Transaction ID contains invalid characters');
      return;
    }
    
    if (!formData.date) {
      alert('Please select Date');
      return;
    }
    if (!formData.transactionType) {
      alert('Please select Transaction Type');
      return;
    }
    if (!formData.narration) {
      alert('Please select Narration');
      return;
    }
    
    // Validate quantity
    const qty = parseFloat(formData.quantity);
    if (!formData.quantity || isNaN(qty) || qty <= 0) {
      alert('Please enter a valid positive Quantity');
      return;
    }

    // Validate dynamic fields
    if (hasSettlementId && formData.settlementId.length !== 7) {
      alert('Settlement ID must be exactly 7 digits');
      return;
    }
    
    if (hasAccountNumber && formData.accountNumber.length !== 16) {
      alert('Account Number must be exactly 16 digits');
      return;
    }

    // Find the selected narration record to get its direction
    const selectedNarrationRecord = filteredNarrations.find(
      n => n.narration_regex === formData.narration
    );
    const direction = selectedNarrationRecord?.direction || 'CREDIT';

    const newTransaction: Transaction = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      txnId: sanitizedTxnId,
      isin: selectedIsin.isin,
      instrumentName: selectedIsin.instrument_name,
      securityType: selectedIsin.security_type,
      fipId: formData.fipId,
      date: formData.date,
      transactionType: formData.transactionType,
      narration: getFinalNarration(), // Use final narration with replaced placeholders
      direction: direction,
      quantity: parseFloat(formData.quantity),
      createdAt: new Date().toISOString(),
    };

    setTransactions(prev => [...prev, newTransaction]);

    // Don't clear any fields - keep all previous data
    // This allows quick addition of similar transactions
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

  // Sanitize CSV values to prevent formula injection
  const sanitizeCSV = (value: any): string => {
    const str = String(value);
    // Prevent formula injection - prefix dangerous characters
    if (str.startsWith('=') || str.startsWith('+') || 
        str.startsWith('-') || str.startsWith('@')) {
      return `'${str}`;
    }
    return str;
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
      'modifiedBy.email',
      '_class'
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
      
      // Convert dataSource to uppercase with underscores for export
      const dataSourceExport = 'ACCOUNT_AGGREGATOR';

      return [
        '', // _id - empty
        txn.fipId,
        '', // holderId - empty
        '', // dematId - empty
        dataSourceExport, // dataSource - ACCOUNT_AGGREGATOR
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
        '',  // modifiedBy.email - empty
        '' // _class - empty (last column)
      ];
    });

    // Create CSV content with sanitized values
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.map(cell => `"${sanitizeCSV(cell)}"`).join(','))
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
    '& .required': {
      color: 'error.main',
    }
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
      field: 'fipId', 
      headerName: 'FIP ID', 
      minWidth: 130, 
      sortable: true 
    },
    {
      field: 'txnId',
      headerName: 'Txn ID',
      minWidth: 150,
      sortable: true,
    },
    { 
      field: 'date', 
      headerName: 'Trade Date', 
      minWidth: 110, 
      sortable: true 
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
      field: 'instrumentName', 
      headerName: 'Security Name', 
      minWidth: 200, 
      sortable: true 
    },
    { 
      field: 'securityType', 
      headerName: 'Security Type', 
      minWidth: 120, 
      sortable: true 
    },
    { 
      field: 'narration', 
      headerName: 'Narration', 
      minWidth: 250, 
      sortable: true 
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
  ], []);

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ flexShrink: 0 }}>
      <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent sx={{ p: 2 }}>
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

            <Grid item xs={12} md={3}>
              <Typography variant="caption" sx={labelStyle}>
                Security Name
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={selectedIsin?.instrument_name || ''}
                placeholder="Auto-populated from ISIN"
                disabled
                sx={disabledStyle}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <Typography variant="caption" sx={labelStyle}>
                Security Type
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={selectedIsin?.security_type || ''}
                placeholder="Auto-populated from ISIN"
                disabled
                sx={disabledStyle}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <Typography variant="caption" sx={labelStyle}>
                FIP ID <span className="required">*</span>
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={formData.fipId}
                onChange={(e) => handleFieldChange('fipId', e.target.value)}
                sx={fieldStyle}
                SelectProps={{
                  displayEmpty: true,
                  MenuProps: { PaperProps: { sx: { maxHeight: 250 } } }
                }}
                InputProps={{
                  endAdornment: formData.fipId ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => handleFieldChange('fipId', '')}
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
                  Select FIP ID
                </MenuItem>
                {FIP_IDS.map((fip) => (
                  <MenuItem key={fip.value} value={fip.value} sx={{ fontSize: '0.85rem' }}>
                    {fip.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={3}>
              <Typography variant="caption" sx={labelStyle}>
                Txn ID <span className="required">*</span>
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={formData.txnId}
                onChange={(e) => handleFieldChange('txnId', e.target.value)}
                placeholder="Enter Transaction ID"
                sx={fieldStyle}
              />
            </Grid>

            <Grid item xs={12} md={1.5}>
              <Typography variant="caption" sx={labelStyle}>
                Date <span className="required">*</span>
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
            </Grid>

            <Grid item xs={12} md={2}>
              <Typography variant="caption" sx={labelStyle}>
                Transaction Type <span className="required">*</span>
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

            <Grid item xs={12} md={4}>
              <Typography variant="caption" sx={labelStyle}>
                Narration <span className="required">*</span>
              </Typography>
              
              {/* Show dropdown when no narration selected */}
              {!formData.narration && (
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={formData.narration}
                  onChange={(e) => handleFieldChange('narration', e.target.value)}
                  disabled={!formData.transactionType || !formData.fipId || filteredNarrations.length === 0}
                  sx={fieldStyle}
                  SelectProps={{
                    displayEmpty: true,
                    MenuProps: { PaperProps: { sx: { maxHeight: 250 } } }
                  }}
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
                    <MenuItem 
                      key={narration.id} 
                      value={narration.narration_regex} 
                      sx={{ fontSize: '0.85rem' }}
                    >
                      {narration.narration_regex}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              {/* Show narration with embedded input fields when narration is selected */}
              {formData.narration && (
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    px: 1.5,
                    py: 0.75,
                    minHeight: 38,
                    flexWrap: 'wrap',
                    bgcolor: 'background.paper',
                  }}
                >
                  {/* Parse narration and render text with embedded inputs */}
                  {formData.narration.split(/(\{SettlementId\}|\{AccountNumber\})/).map((part, index) => {
                    if (part === '{SettlementId}') {
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
                              height: 28,
                              fontSize: '0.85rem',
                              bgcolor: hasSettlementId && formData.settlementId.length === 7 ? 'success.lighter' : 'grey.50',
                            },
                            '& .MuiOutlinedInput-input': {
                              py: 0.5,
                              px: 1,
                            }
                          }}
                        />
                      );
                    } else if (part === '{AccountNumber}') {
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
                              height: 28,
                              fontSize: '0.85rem',
                              bgcolor: hasAccountNumber && formData.accountNumber.length === 16 ? 'success.lighter' : 'grey.50',
                            },
                            '& .MuiOutlinedInput-input': {
                              py: 0.5,
                              px: 1,
                            }
                          }}
                        />
                      );
                    } else {
                      return (
                        <Typography 
                          key={index} 
                          component="span" 
                          sx={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                        >
                          {part}
                        </Typography>
                      );
                    }
                  })}
                  
                  {/* Clear button */}
                  <IconButton
                    size="small"
                    onClick={() => handleFieldChange('narration', '')}
                    sx={{ ml: 'auto', p: 0.5 }}
                  >
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              )}
            </Grid>

            <Grid item xs={12} md={1.5}>
              <Typography variant="caption" sx={labelStyle}>
                Qty <span className="required">*</span>
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleFieldChange('quantity', e.target.value)}
                  placeholder="100"
                  sx={fieldStyle}
                />
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
