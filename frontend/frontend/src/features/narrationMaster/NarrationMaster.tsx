import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  MenuItem,
  FormControlLabel,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { Clear as ClearIcon } from '@mui/icons-material';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, ColumnDef } from '@/components/common/DataTable';
import { NarrationRecord } from '@/types';
import { narrationService, formatEnumLabel } from '@/services/narrationService';

const DIRECTIONS = ['CREDIT', 'DEBIT'];



// ─── Main NarrationMaster Component ──────────────────────────────────────────

export const NarrationMaster = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<NarrationRecord | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Multi-FIP checkbox state (Add mode only)
  const [selectedFipIds, setSelectedFipIds] = useState<string[]>([]);

  const [formFields, setFormFields] = useState({
    fip_id: '',
    narration_regex: '',
    transaction_type: '',
    transaction_group: '',
    direction: '',
  });

  // 1. Fetch live records from backend
  const { data: narrations = [], isLoading } = useQuery<NarrationRecord[]>({
    queryKey: ['narrations'],
    queryFn: () => narrationService.getAll(),
  });

  // 2. Fetch enum options from backend
  const { data: fipIds = [] } = useQuery<{ value: string; label: string }[]>({
    queryKey: ['narration-fip-ids'],
    queryFn: () => narrationService.getFipIds(),
    staleTime: Infinity, // enums don't change at runtime
  });

  const { data: transactionTypes = [] } = useQuery<{ value: string; label: string }[]>({
    queryKey: ['narration-transaction-types'],
    queryFn: () => narrationService.getTransactionTypes(),
    staleTime: Infinity,
  });

  const { data: transactionCategories = [] } = useQuery<{ value: string; label: string }[]>({
    queryKey: ['narration-transaction-categories'],
    queryFn: () => narrationService.getTransactionCategories(),
    staleTime: Infinity,
  });

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: (newRecord: any) => narrationService.create(newRecord),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['narrations'] });
      setDialogOpen(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create narration rule';
      setErrorMsg(msg);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => narrationService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['narrations'] });
      setDialogOpen(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update narration rule';
      setErrorMsg(msg);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => narrationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['narrations'] });
      setDeleteConfirmOpen(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete narration rule';
      setErrorMsg(msg);
    }
  });

  const handleOpenAdd = () => {
    setSelectedRecord(null);
    setErrorMsg(null);
    setSelectedFipIds([]);
    setFormFields({
      fip_id: '',
      narration_regex: '',
      transaction_type: '',
      transaction_group: '',
      direction: '',
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (record: NarrationRecord) => {
    setSelectedRecord(record);
    setErrorMsg(null);
    setFormFields({
      fip_id: record.fip_id,
      narration_regex: record.narration_regex,
      transaction_type: record.transaction_type,
      transaction_group: record.transaction_group,
      direction: record.direction,
    });
    setDialogOpen(true);
  };

  const handleInputChange = (field: keyof typeof formFields, value: string | boolean) => {
    setFormFields(prev => ({ ...prev, [field]: value }));
  };

  const handleToggleFipId = (fipId: string) => {
    setSelectedFipIds(prev =>
      prev.includes(fipId) ? prev.filter(f => f !== fipId) : [...prev, fipId]
    );
  };

  const handleSave = () => {
    setErrorMsg(null);
    if (selectedRecord) {
      // Edit mode — single FIP ID update
      updateMutation.mutate({
        id: selectedRecord.id,
        data: formFields,
      });
    } else {
      // Add mode — client-side duplicate check before batch create
      const duplicateFips = selectedFipIds.filter(fipId =>
        narrations.some(n =>
          n.fip_id === fipId &&
          n.transaction_type === formFields.transaction_type &&
          n.narration_regex.trim() === formFields.narration_regex.trim()
        )
      );
      if (duplicateFips.length > 0) {
        setErrorMsg(
          `A narration rule with the given type and regex already exists for FIP ID(s): ${duplicateFips.join(', ')}`
        );
        return;
      }
      createMutation.mutate({
        ...formFields,
        fipIds: selectedFipIds,
      } as any);
    }
  };

  const handleOpenDelete = (id: string) => {
    setRecordToDelete(id);
    setErrorMsg(null);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (recordToDelete !== null) {
      deleteMutation.mutate(recordToDelete);
      setRecordToDelete(null);
    }
  };

  const isFormValid = useMemo(() => {
    const hasNarration = formFields.narration_regex.trim().length > 0;
    const hasType = formFields.transaction_type.trim().length > 0;
    const hasGroup = formFields.transaction_group.trim().length > 0;
    const hasDirection = formFields.direction.trim().length > 0;
    if (selectedRecord) {
      // Edit mode: single FIP ID via dropdown
      return formFields.fip_id.trim().length > 0 && hasNarration && hasType && hasGroup && hasDirection;
    }
    // Add mode: at least one checkbox selected
    return selectedFipIds.length > 0 && hasNarration && hasType && hasGroup && hasDirection;
  }, [formFields, selectedRecord, selectedFipIds]);

  // ── Column definitions ─────────────────────────────────────────────────────

  const columns: ColumnDef<NarrationRecord>[] = useMemo(() => [
    {
      field: 'fip_id',
      headerName: 'FIP ID',
      minWidth: 130,
      sortable: true,
      renderCell: row => (
        <Typography sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.8125rem', letterSpacing: '0.3px' }}>
          {row.fip_id}
        </Typography>
      ),
    },
    {
      field: 'narration_regex',
      headerName: 'Narration Regex',
      minWidth: 200,
      sortable: true,
      renderCell: row => (
        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#333' }}>
          {row.narration_regex}
        </Typography>
      ),
    },
    { field: 'transaction_type',  headerName: 'Transaction Type',     minWidth: 160, sortable: true, renderCell: row => {
        const match = transactionTypes.find(t => t.value === row.transaction_type);
        return match ? match.label : formatEnumLabel(row.transaction_type);
      }
    },
    { field: 'transaction_group', headerName: 'Transaction Category',  minWidth: 170, sortable: true, renderCell: row => {
        const match = transactionCategories.find(c => c.value === row.transaction_group);
        return match ? match.label : formatEnumLabel(row.transaction_group);
      }
    },
    {
      field: 'direction',
      headerName: 'Direction',
      minWidth: 110,
      sortable: true,
      renderCell: row => (
        <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
          {String(row.direction).toUpperCase()}
        </Typography>
      ),
    },
    { field: 'created_at', headerName: 'Created At', minWidth: 145, sortable: true },
    { field: 'updated_at', headerName: 'Updated At', minWidth: 145, sortable: true },
  ], []);

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      <DataTable<NarrationRecord>
        data={narrations}
        columns={columns}
        idField="id"
        loading={isLoading}
        disableSearch={false}
        disableColumnFilters={true}
        searchPlaceholder="Search by FIP ID or Regex..."
        searchFields={['fip_id', 'narration_regex']}
        dropdownFilters={[
          { key: 'fip_id',            label: 'FIP ID',               options: fipIds.map(f => f.value), labelFn: val => {
              const match = fipIds.find(f => f.value.toLowerCase() === val.toLowerCase());
              return match ? match.label : val;
            }
          },
          { key: 'transaction_type',  label: 'Transaction Type',     options: transactionTypes.map(t => t.value),     width: '240px', labelFn: val => {
              const match = transactionTypes.find(t => t.value.toLowerCase() === val.toLowerCase());
              return match ? match.label : formatEnumLabel(val);
            }
          },
          { key: 'transaction_group', label: 'Transaction Category', options: transactionCategories.map(c => c.value), width: '220px', labelFn: val => {
              const match = transactionCategories.find(c => c.value.toLowerCase() === val.toLowerCase());
              return match ? match.label : formatEnumLabel(val);
            }
          },
        ]}
        addLabel="Add Rule"
        onAdd={handleOpenAdd}
        onEdit={handleOpenEdit}
        onDelete={row => handleOpenDelete(row.id)}
        exportFilename="narration_master.csv"
      />

      {/* ── Add / Edit Dialog ── */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            backgroundColor: 'background.paper',
            backgroundImage: 'none',
            border: '1px solid',
            borderColor: 'divider',
          }
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
              {selectedRecord ? 'Edit Narration Details' : 'Add New Narration'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
              {selectedRecord ? 'Modify the selected narration rule' : 'Fill in the details to add a new narration rule'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setDialogOpen(false)} sx={{ color: 'text.secondary' }}>
            <ClearIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 1.5 }}>
          <Grid container spacing={2}>

            {/* Error inside Form */}
            {errorMsg && (
              <Grid item xs={12}>
                <Alert severity="error" onClose={() => setErrorMsg(null)} sx={{ borderRadius: 1.5 }}>
                  {errorMsg}
                </Alert>
              </Grid>
            )}

            {/* Fip Id — Checkbox (Add) / Dropdown (Edit) */}
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block', color: 'text.secondary' }}>
                {selectedRecord ? 'FIP ID *' : 'Select FIP ID(s) *'}
              </Typography>
              {selectedRecord ? (
                // Edit mode — single dropdown
                <TextField
                  select fullWidth size="small"
                  value={formFields.fip_id}
                  onChange={e => handleInputChange('fip_id', e.target.value)}
                  SelectProps={{ displayEmpty: true }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: '0.85rem' } }}
                >
                  <MenuItem value="" disabled sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>Select FIP ID</MenuItem>
                  {fipIds.map(f => <MenuItem key={f.value} value={f.value} sx={{ fontSize: '0.85rem' }}>{f.label}</MenuItem>)}
                </TextField>
              ) : (
                // Add mode — multi-select checkboxes
                <Box sx={{
                  display: 'flex', flexWrap: 'wrap', gap: 1,
                  p: 1.5, border: '1px solid', borderColor: 'divider',
                  borderRadius: 1.5, backgroundColor: 'action.hover',
                }}>
                  {fipIds.map(f => (
                    <FormControlLabel
                      key={f.value}
                      control={
                        <Checkbox
                          size="small"
                          checked={selectedFipIds.includes(f.value)}
                          onChange={() => handleToggleFipId(f.value)}
                          sx={{ py: 0 }}
                        />
                      }
                      label={<Typography sx={{ fontSize: '0.85rem', fontWeight: 500 }}>{f.label}</Typography>}
                    />
                  ))}
                </Box>
              )}
            </Grid>

            {/* Narration (Regex) */}
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block', color: 'text.secondary' }}>Narration Regex *</Typography>
              <TextField
                fullWidth size="small"
                placeholder="e.g. ^BUY.*NSE.*"
                value={formFields.narration_regex}
                onChange={e => handleInputChange('narration_regex', e.target.value)}
                inputProps={{ style: { fontFamily: 'monospace' } }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: '0.85rem' } }}
              />
            </Grid>

            {/* Select Transaction Type */}
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block', color: 'text.secondary' }}>Select Transaction Type *</Typography>
              <TextField
                select fullWidth size="small"
                value={formFields.transaction_type}
                onChange={e => handleInputChange('transaction_type', e.target.value)}
                SelectProps={{ displayEmpty: true, MenuProps: { PaperProps: { sx: { maxHeight: 250 } } } }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: '0.85rem' } }}
              >
                <MenuItem value="" disabled sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>Select Transaction Type</MenuItem>
                {transactionTypes.map(t => <MenuItem key={t.value} value={t.value} sx={{ fontSize: '0.85rem' }}>{t.label}</MenuItem>)}
              </TextField>
            </Grid>

            {/* Select Direction */}
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block', color: 'text.secondary' }}>Select Direction *</Typography>
              <TextField
                select fullWidth size="small"
                value={formFields.direction}
                onChange={e => handleInputChange('direction', e.target.value)}
                SelectProps={{ displayEmpty: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: '0.85rem' } }}
              >
                <MenuItem value="" disabled sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>Select Direction</MenuItem>
                {DIRECTIONS.map(d => <MenuItem key={d} value={d} sx={{ fontSize: '0.85rem' }}>{d}</MenuItem>)}
              </TextField>
            </Grid>

            {/* Search By Transaction Group */}
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block', color: 'text.secondary' }}>Search By Transaction Group *</Typography>
              <TextField
                select fullWidth size="small"
                value={formFields.transaction_group}
                onChange={e => handleInputChange('transaction_group', e.target.value)}
                SelectProps={{ displayEmpty: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: '0.85rem' } }}
              >
                <MenuItem value="" disabled sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>Select Transaction Group</MenuItem>
                {transactionCategories.map(c => <MenuItem key={c.value} value={c.value} sx={{ fontSize: '0.85rem' }}>{c.label}</MenuItem>)}
              </TextField>
            </Grid>

          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, gap: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            variant="outlined"
            onClick={() => setDialogOpen(false)}
            sx={{ borderRadius: 1.5, px: 3, height: 36, textTransform: 'none', fontWeight: 600, color: 'text.secondary', borderColor: 'divider' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!isFormValid || createMutation.isPending || updateMutation.isPending}
            sx={{ borderRadius: 1.5, px: 3, height: 36, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
          >
            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : selectedRecord ? 'Save Changes' : 'Add Rule'}
          </Button>
        </DialogActions>
      </Dialog>



      {/* ── Delete Confirmation Dialog ── */}
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
          Delete Narration Rule?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Are you sure you want to delete this narration rule? This action is permanent and cannot be undone.
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
            disabled={deleteMutation.isPending}
            sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
