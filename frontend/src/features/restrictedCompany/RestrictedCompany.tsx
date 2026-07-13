import {
  Box,
  MenuItem,
  Typography,
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
import { IsinMaster } from '@/types';
import {
  RESTRICTION_LEVELS,
  RESTRICTION_REASONS,
  CSV_EXPORT_HEADERS,
  SESSION_KEY,
  fieldStyle,
  labelStyle,
} from './constants';

// ── Local record shape (client-side staging, not a server entity)
interface RestrictionRecord {
  id: string;
  isin: string;
  instrumentName: string;
  securityType: string;
  restrictionLevel: string;
  restrictedFor?: string;
  reasonOfRestriction: string;
  remark?: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

// ── Form state — flat, explicit
interface FormState {
  restrictionLevel: string;
  restrictedFor: string;
  reasonOfRestriction: string;
  remark: string;
  startDate: string;
  endDate: string;
}

const today = new Date().toISOString().split('T')[0];

const INITIAL_FORM: FormState = {
  restrictionLevel: '',
  restrictedFor: '',
  reasonOfRestriction: '',
  remark: '',
  startDate: today,
  endDate: today,
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

export const RestrictedCompany = () => {
  // ── ISIN search state
  const [selectedIsin, setSelectedIsin] = useState<IsinMaster | null>(null);
  const [isinSearchText, setIsinSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [isinFieldOpen, setIsinFieldOpen] = useState(false);

  // ── Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);

  // ── Inline validation error (replaces alert())
  const [validationError, setValidationError] = useState<string | null>(null);

  // ── Form state — consolidated into single object
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  // ── Records — persisted to sessionStorage
  const [records, setRecords] = useState<RestrictionRecord[]>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed: unknown[] = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed as RestrictionRecord[];
      }
    } catch {
      console.error('Failed to load data from sessionStorage');
    }
    return [];
  });

  // Persist to sessionStorage on every change
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(records));
    } catch {
      console.error('Failed to save data to sessionStorage');
    }
  }, [records]);

  // ── Debounce ISIN search text (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchText(isinSearchText), 300);
    return () => clearTimeout(timer);
  }, [isinSearchText]);

  // ── Server state — ISIN search
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

  // ── Generic form field setter — stable via useCallback
  const setField = useCallback((field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // ── Add record — inline validation, no alert()
  const handleAddRecord = () => {
    setValidationError(null);

    if (!selectedIsin) return setValidationError('Please select an ISIN');
    if (!form.restrictionLevel) return setValidationError('Please select Level of Restriction');
    if (
      (form.restrictionLevel === 'GROUP' || form.restrictionLevel === 'USER') &&
      !form.restrictedFor.trim()
    ) return setValidationError('Please enter a Restricted For value');
    if (!form.reasonOfRestriction) return setValidationError('Please select a Reason of Restriction');
    if (form.reasonOfRestriction === 'OTHERS' && !form.remark.trim()) {
      return setValidationError('Please enter a Remark for Others');
    }
    if (!form.startDate) return setValidationError('Please select a Start Date');
    if (!form.endDate) return setValidationError('Please select an End Date');
    if (new Date(form.endDate) < new Date(form.startDate)) {
      return setValidationError('End Date must be equal to or after Start Date');
    }

    const newRecord: RestrictionRecord = {
      id: generateId(),
      isin: selectedIsin.isin,
      instrumentName: selectedIsin.instrument_name,
      securityType: selectedIsin.security_type,
      restrictionLevel: form.restrictionLevel,
      restrictedFor:
        form.restrictionLevel === 'GROUP' || form.restrictionLevel === 'USER'
          ? form.restrictedFor
          : undefined,
      reasonOfRestriction: form.reasonOfRestriction,
      remark: form.reasonOfRestriction === 'OTHERS' ? form.remark : undefined,
      startDate: form.startDate,
      endDate: form.endDate,
      createdAt: new Date().toISOString(),
    };

    setRecords(prev => [...prev, newRecord]);
    // Clear only per-record fields; keep ISIN, level, dates for quick re-entry
    setForm(prev => ({ ...prev, restrictedFor: '', remark: '' }));
  };

  // ── Delete handlers
  const handleOpenDelete = (id: string) => {
    setRecordToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleCloseDelete = () => {
    setDeleteConfirmOpen(false);
    setRecordToDelete(null); // always reset to prevent stale id on backdrop dismiss
  };

  const handleConfirmDelete = () => {
    if (recordToDelete) {
      setRecords(prev => prev.filter(r => r.id !== recordToDelete));
    }
    handleCloseDelete();
  };

  const handleConfirmDeleteAll = () => {
    setRecords([]);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      console.error('Failed to clear data from sessionStorage');
    }
    setDeleteAllConfirmOpen(false);
  };

  // ── CSV export
  const handleExportCSV = useCallback(() => {
    if (records.length === 0) return;

    const csvRows = records.map(r => [
      r.isin,
      r.instrumentName,
      r.securityType,
      r.restrictionLevel,
      r.restrictedFor ?? '',
      r.reasonOfRestriction,
      r.remark ?? '',
      r.startDate,
      r.endDate,
      r.createdAt,
      '', // _class
    ]);

    const csvContent = [
      [...CSV_EXPORT_HEADERS].join(','),
      ...csvRows.map(row => row.map(cell => `"${sanitizeCSV(cell)}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `restricted_company_${Date.now()}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // prevent memory leak
  }, [records]);

  // ── Column definitions
  const columns: ColumnDef<RestrictionRecord>[] = useMemo(
    () => [
      {
        field: 'isin',
        headerName: 'ISIN',
        minWidth: 130,
        sortable: true,
        renderCell: row => (
          <Typography sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.8125rem' }}>
            {row.isin}
          </Typography>
        ),
      },
      { field: 'instrumentName',      headerName: 'Instrument Name',             minWidth: 250, sortable: true },
      {
        field: 'restrictionLevel',
        headerName: 'Level Of Restriction',
        minWidth: 170,
        sortable: true,
        renderCell: row =>
          RESTRICTION_LEVELS.find(l => l.value === row.restrictionLevel)?.label ?? row.restrictionLevel,
      },
      {
        field: 'restrictedFor',
        headerName: 'Restricted For',
        minWidth: 180,
        sortable: true,
        renderCell: row => row.restrictedFor ?? '-',
      },
      {
        field: 'reasonOfRestriction',
        headerName: 'Reason of Restriction',
        minWidth: 220,
        sortable: true,
        renderCell: row =>
          RESTRICTION_REASONS.find(r => r.value === row.reasonOfRestriction)?.label ?? row.reasonOfRestriction,
      },
      {
        field: 'remark',
        headerName: 'Remarks (In case of Others)',
        minWidth: 230,
        sortable: true,
        renderCell: row => row.remark ?? '-',
      },
      { field: 'startDate', headerName: 'Start Date', minWidth: 120, sortable: true },
      { field: 'endDate',   headerName: 'End Date',   minWidth: 120, sortable: true },
    ],
    [], // RESTRICTION_LEVELS and RESTRICTION_REASONS are module-level constants — stable references
  );

  const isFormValid = useMemo(() => {
    if (!selectedIsin) return false;
    if (!form.restrictionLevel) return false;
    if (
      (form.restrictionLevel === 'GROUP' || form.restrictionLevel === 'USER') &&
      !form.restrictedFor.trim()
    ) return false;
    if (!form.reasonOfRestriction) return false;
    if (form.reasonOfRestriction === 'OTHERS' && !form.remark.trim()) return false;
    if (!form.startDate || !form.endDate) return false;
    if (new Date(form.endDate) < new Date(form.startDate)) return false;
    return true;
  }, [selectedIsin, form]);

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

            {/* Row 1: ISIN, Level of Restriction, Restricted For, Reason */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 300px', minWidth: 240 }}>
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
              </Box>

              {/* Level of Restriction */}
              <Box sx={{ flex: '1 1 200px', minWidth: 180 }}>
                <FormInput
                  select
                  label="Level of Restriction"
                  required
                  value={form.restrictionLevel}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm(prev => ({
                      ...prev,
                      restrictionLevel: val,
                      restrictedFor: val === 'COMPANY' ? '' : prev.restrictedFor,
                    }));
                  }}
                  SelectProps={{ displayEmpty: true, sx: { fontSize: '0.85rem' } }}
                  InputProps={{
                    endAdornment: form.restrictionLevel ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setForm(prev => ({ ...prev, restrictionLevel: '', restrictedFor: '' }));
                          }}
                          edge="end"
                          sx={{ mr: 1 }}
                        >
                          <ClearIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </InputAdornment>
                    ) : undefined,
                  }}
                >
                  <MenuItem value="" disabled sx={{ fontSize: '0.85rem' }}>Select Level of Restriction</MenuItem>
                  {RESTRICTION_LEVELS.map((level) => (
                    <MenuItem key={level.value} value={level.value} sx={{ fontSize: '0.85rem' }}>
                      {level.label}
                    </MenuItem>
                  ))}
                </FormInput>
              </Box>

              {/* Restricted For — conditional on GROUP/USER */}
              <Box sx={{ flex: '1 1 240px', minWidth: 200 }}>
                <FormInput
                  label="Restricted For"
                  required={form.restrictionLevel === 'GROUP' || form.restrictionLevel === 'USER'}
                  value={form.restrictedFor}
                  onChange={(e) => setField('restrictedFor', e.target.value)}
                  placeholder={
                    form.restrictionLevel === 'GROUP'
                      ? 'Enter Group name'
                      : form.restrictionLevel === 'USER'
                      ? 'Enter User name'
                      : 'Select Group or User first'
                  }
                  disabled={form.restrictionLevel === 'COMPANY' || !form.restrictionLevel}
                  InputProps={{
                    endAdornment: form.restrictedFor && form.restrictionLevel !== 'COMPANY' ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setField('restrictedFor', '')} edge="end">
                          <ClearIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </InputAdornment>
                    ) : undefined,
                  }}
                />
              </Box>

              {/* Reason of Restriction */}
              <Box sx={{ flex: '1 1 240px', minWidth: 200 }}>
                <FormInput
                  select
                  label="Reason of Restrictions"
                  required
                  value={form.reasonOfRestriction}
                  onChange={(e) => {
                    setForm(prev => ({
                      ...prev,
                      reasonOfRestriction: e.target.value,
                      remark: '', // clear remark when reason changes
                    }));
                  }}
                  SelectProps={{ displayEmpty: true, sx: { fontSize: '0.85rem' } }}
                  InputProps={{
                    endAdornment: form.reasonOfRestriction ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setForm(prev => ({ ...prev, reasonOfRestriction: '', remark: '' }));
                          }}
                          edge="end"
                          sx={{ mr: 1 }}
                        >
                          <ClearIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </InputAdornment>
                    ) : undefined,
                  }}
                >
                  <MenuItem value="" disabled sx={{ fontSize: '0.85rem' }}>Select Reason</MenuItem>
                  {RESTRICTION_REASONS.map((reason) => (
                    <MenuItem key={reason.value} value={reason.value} sx={{ fontSize: '0.85rem' }}>
                      {reason.label}
                    </MenuItem>
                  ))}
                </FormInput>
              </Box>
            </Box>

            {/* Row 2: Remark (conditional), Start Date, End Date, Add */}
            <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {form.reasonOfRestriction === 'OTHERS' && (
                <Box sx={{ flex: '2 1 300px', minWidth: 240 }}>
                  <FormInput
                    label="Remark (In case of Others)"
                    required
                    value={form.remark}
                    onChange={(e) => setField('remark', e.target.value)}
                    placeholder="Enter remark"
                    InputProps={{
                      endAdornment: form.remark ? (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setField('remark', '')} edge="end">
                            <ClearIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </InputAdornment>
                      ) : undefined,
                    }}
                  />
                </Box>
              )}

              <Box sx={{ flex: '1 1 160px', minWidth: 140 }}>
                <DateInput
                  label="Start Date"
                  required
                  value={form.startDate}
                  onChange={(e) => setField('startDate', e.target.value)}
                  minDate={today}
                  sx={fieldStyle}
                />
              </Box>

              <Box sx={{ flex: '1 1 160px', minWidth: 140 }}>
                <DateInput
                  label="End Date"
                  required
                  value={form.endDate}
                  onChange={(e) => setField('endDate', e.target.value)}
                  minDate={form.startDate || today}
                  sx={fieldStyle}
                />
              </Box>

              {/* Add button */}
              <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                <Button
                  variant="contained"
                  onClick={handleAddRecord}
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
        <DataTable<RestrictionRecord>
          data={records}
          columns={columns}
          idField="id"
          loading={false}
          disableSearch={false}
          disableColumnFilters={true}
          searchPlaceholder="Search restrictions..."
          searchFields={['isin', 'instrumentName', 'securityType', 'restrictionLevel', 'restrictedFor', 'reasonOfRestriction', 'remark']}
          onDelete={row => handleOpenDelete(row.id)}
          exportFilename="restricted_company.csv"
          onExport={handleExportCSV}
          customToolbarActions={
            <Button
              variant="contained"
              color="error"
              onClick={() => setDeleteAllConfirmOpen(true)}
              disabled={records.length === 0}
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
          Delete Restriction Record?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Are you sure you want to delete this restriction? This action cannot be undone.
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
          Delete All Records?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Are you sure you want to delete <strong>all {records.length} record(s)</strong>? This action is permanent and cannot be undone.
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
