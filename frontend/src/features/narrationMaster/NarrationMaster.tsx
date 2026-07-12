import {
  Box,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  MenuItem,
  FormControlLabel,
  Typography,
  Alert,
} from '@mui/material';
import { Clear as ClearIcon } from '@mui/icons-material';
import { Button } from '@/components/ui/Button';
import { FormInput } from '@/components/ui/FormInput';
import { AxiosError } from 'axios';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, ColumnDef } from '@/components/common/DataTable';
import { NarrationRecord, NarrationRecordFormData } from '@/types';
import { narrationService } from '@/services/narrationService';
import { formatEnumLabel } from '@/utils/helpers';
import { DIRECTIONS, INITIAL_FORM } from './constants';

// ── Batch create payload (Add mode sends multiple FIP IDs at once)
interface BatchCreatePayload extends NarrationRecordFormData {
  fipIds: string[];
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const NarrationMaster = () => {
  const queryClient = useQueryClient();

  // ── Dialog & selection state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<NarrationRecord | null>(null);

  // ── Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  // ── Error state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Multi-FIP checkbox state (Add mode only)
  const [selectedFipIds, setSelectedFipIds] = useState<string[]>([]);

  // ── Form fields state — typed with NarrationRecordFormData
  const [formFields, setFormFields] = useState<NarrationRecordFormData>(INITIAL_FORM);

  // ── Server state
  const { data: narrations = [], isLoading } = useQuery<NarrationRecord[]>({
    queryKey: ['narrations'],
    queryFn: () => narrationService.getAll(),
  });

  // Enum options — staleTime: Infinity because enums don't change at runtime
  const { data: fipIds = [] } = useQuery<{ value: string; label: string }[]>({
    queryKey: ['narration-fip-ids'],
    queryFn: () => narrationService.getFipIds(),
    staleTime: Infinity,
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

  // ── Mutations
  const createMutation = useMutation({
    mutationFn: (payload: BatchCreatePayload) => narrationService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['narrations'] });
      handleCloseDialog();
    },
    onError: (err: unknown) => {
      const e = err as AxiosError<{ message?: string }>;
      setErrorMsg(e?.response?.data?.message || e?.message || 'Failed to create narration rule');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: NarrationRecordFormData }) =>
      narrationService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['narrations'] });
      handleCloseDialog();
    },
    onError: (err: unknown) => {
      const e = err as AxiosError<{ message?: string }>;
      setErrorMsg(e?.response?.data?.message || e?.message || 'Failed to update narration rule');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => narrationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['narrations'] });
      handleCloseDelete();
    },
    onError: (err: unknown) => {
      const e = err as AxiosError<{ message?: string }>;
      setErrorMsg(e?.response?.data?.message || e?.message || 'Failed to delete narration rule');
    },
  });

  // ── Dialog handlers — always reset full state on close
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedRecord(null);
    setFormFields(INITIAL_FORM);
    setSelectedFipIds([]);
    setErrorMsg(null);
  };

  const handleCloseDelete = () => {
    setDeleteConfirmOpen(false);
    setRecordToDelete(null);
  };

  const handleOpenAdd = () => {
    setSelectedRecord(null);
    setFormFields(INITIAL_FORM);
    setSelectedFipIds([]);
    setErrorMsg(null);
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

  const handleInputChange = (field: keyof NarrationRecordFormData, value: string) => {
    setFormFields(prev => ({ ...prev, [field]: value }));
  };

  const handleToggleFipId = (fipId: string) => {
    setSelectedFipIds(prev =>
      prev.includes(fipId) ? prev.filter(f => f !== fipId) : [...prev, fipId],
    );
  };

  const handleSave = () => {
    setErrorMsg(null);

    if (selectedRecord) {
      // Edit mode — single FIP ID update
      updateMutation.mutate({ id: selectedRecord.id, data: formFields });
    } else {
      // Add mode — client-side duplicate check before batch create
      const duplicateFips = selectedFipIds.filter(fipId =>
        narrations.some(
          n =>
            n.fip_id === fipId &&
            n.transaction_type === formFields.transaction_type &&
            n.narration_regex.trim() === formFields.narration_regex.trim(),
        ),
      );

      if (duplicateFips.length > 0) {
        setErrorMsg(
          `A narration rule with the given type and regex already exists for FIP ID(s): ${duplicateFips.join(', ')}`,
        );
        return;
      }

      createMutation.mutate({ ...formFields, fipIds: selectedFipIds });
    }
  };

  const handleOpenDelete = (id: string) => {
    setRecordToDelete(id);
    setErrorMsg(null);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (recordToDelete) {
      deleteMutation.mutate(recordToDelete);
      // state reset happens in handleCloseDelete via onSuccess
    }
  };

  // ── Form validation
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

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Column definitions — transactionTypes and transactionCategories in dep array
  // to prevent stale cell renderers when async enum data loads
  const columns: ColumnDef<NarrationRecord>[] = useMemo(
    () => [
      {
        field: 'fip_id',
        headerName: 'FIP ID',
        minWidth: 130,
        sortable: true,
        renderCell: row => (
          <Typography
            sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.8125rem', letterSpacing: '0.3px' }}
          >
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
          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'text.primary' }}>
            {row.narration_regex}
          </Typography>
        ),
      },
      {
        field: 'transaction_type',
        headerName: 'Transaction Type',
        minWidth: 160,
        sortable: true,
        renderCell: row => {
          const match = transactionTypes.find(t => t.value === row.transaction_type);
          return match ? match.label : formatEnumLabel(row.transaction_type);
        },
      },
      {
        field: 'transaction_group',
        headerName: 'Transaction Category',
        minWidth: 170,
        sortable: true,
        renderCell: row => {
          const match = transactionCategories.find(c => c.value === row.transaction_group);
          return match ? match.label : formatEnumLabel(row.transaction_group);
        },
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
    ],
    [transactionTypes, transactionCategories], // ← fixed: was empty []
  );

  // ─────────────────────────────────────────────────────────────────────────────

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
          {
            key: 'fip_id',
            label: 'FIP ID',
            options: fipIds.map(f => f.value),
            labelFn: val => fipIds.find(f => f.value.toLowerCase() === val.toLowerCase())?.label ?? val,
          },
          {
            key: 'transaction_type',
            label: 'Transaction Type',
            options: transactionTypes.map(t => t.value),
            width: '240px',
            labelFn: val =>
              transactionTypes.find(t => t.value.toLowerCase() === val.toLowerCase())?.label ??
              formatEnumLabel(val),
          },
          {
            key: 'transaction_group',
            label: 'Transaction Category',
            options: transactionCategories.map(c => c.value),
            width: '220px',
            labelFn: val =>
              transactionCategories.find(c => c.value.toLowerCase() === val.toLowerCase())?.label ??
              formatEnumLabel(val),
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
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            backgroundColor: 'background.paper',
            backgroundImage: 'none',
            border: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <DialogTitle
          sx={{
            m: 0, p: 2.5,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid', borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
              {selectedRecord ? 'Edit Narration Details' : 'Add New Narration'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
              {selectedRecord
                ? 'Modify the selected narration rule'
                : 'Fill in the details to add a new narration rule'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleCloseDialog} sx={{ color: 'text.secondary' }}>
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

            {/* FIP ID — Checkbox (Add) / Dropdown (Edit) */}
            <Grid item xs={12}>
              {selectedRecord ? (
                // Edit mode — single dropdown
                <FormInput
                  select
                  label="FIP ID"
                  required
                  value={formFields.fip_id}
                  onChange={e => handleInputChange('fip_id', e.target.value)}
                  SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value="" disabled sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                    Select FIP ID
                  </MenuItem>
                  {fipIds.map(f => (
                    <MenuItem key={f.value} value={f.value} sx={{ fontSize: '0.85rem' }}>
                      {f.label}
                    </MenuItem>
                  ))}
                </FormInput>
              ) : (
                // Add mode — multi-select checkboxes
                <>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 600, mb: 0.5, display: 'block', color: 'text.secondary' }}
                  >
                    Select FIP ID(s) *
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex', flexWrap: 'wrap', gap: 1,
                      p: 1.5, border: '1px solid', borderColor: 'divider',
                      borderRadius: 1.5, backgroundColor: 'action.hover',
                    }}
                  >
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
                        label={
                          <Typography sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                            {f.label}
                          </Typography>
                        }
                      />
                    ))}
                  </Box>
                </>
              )}
            </Grid>

            {/* Narration Regex */}
            <Grid item xs={12}>
              <FormInput
                label="Narration Regex"
                required
                placeholder="e.g. ^BUY.*NSE.*"
                value={formFields.narration_regex}
                onChange={e => handleInputChange('narration_regex', e.target.value)}
                inputProps={{ style: { fontFamily: 'monospace' } }}
              />
            </Grid>

            {/* Transaction Type */}
            <Grid item xs={12}>
              <FormInput
                select
                label="Transaction Type"
                required
                value={formFields.transaction_type}
                onChange={e => handleInputChange('transaction_type', e.target.value)}
                SelectProps={{ displayEmpty: true, MenuProps: { PaperProps: { sx: { maxHeight: 250 } } } }}
              >
                <MenuItem value="" disabled sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                  Select Transaction Type
                </MenuItem>
                {transactionTypes.map(t => (
                  <MenuItem key={t.value} value={t.value} sx={{ fontSize: '0.85rem' }}>
                    {t.label}
                  </MenuItem>
                ))}
              </FormInput>
            </Grid>

            {/* Direction */}
            <Grid item xs={12}>
              <FormInput
                select
                label="Direction"
                required
                value={formFields.direction}
                onChange={e => handleInputChange('direction', e.target.value)}
                SelectProps={{ displayEmpty: true }}
              >
                <MenuItem value="" disabled sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                  Select Direction
                </MenuItem>
                {DIRECTIONS.map(d => (
                  <MenuItem key={d} value={d} sx={{ fontSize: '0.85rem' }}>
                    {d}
                  </MenuItem>
                ))}
              </FormInput>
            </Grid>

            {/* Transaction Group */}
            <Grid item xs={12}>
              <FormInput
                select
                label="Transaction Group"
                required
                value={formFields.transaction_group}
                onChange={e => handleInputChange('transaction_group', e.target.value)}
                SelectProps={{ displayEmpty: true }}
              >
                <MenuItem value="" disabled sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                  Select Transaction Group
                </MenuItem>
                {transactionCategories.map(c => (
                  <MenuItem key={c.value} value={c.value} sx={{ fontSize: '0.85rem' }}>
                    {c.label}
                  </MenuItem>
                ))}
              </FormInput>
            </Grid>

          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, gap: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            variant="outlined"
            onClick={handleCloseDialog}
            disabled={isSaving}
            sx={{ color: 'text.secondary', borderColor: 'divider' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            loading={isSaving}
            disabled={!isFormValid}
          >
            {selectedRecord ? 'Save Changes' : 'Add Rule'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCloseDelete}
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            backgroundColor: 'background.paper',
            backgroundImage: 'none',
            border: '1px solid',
            borderColor: 'divider',
            maxWidth: 400,
          },
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
            onClick={handleCloseDelete}
            disabled={deleteMutation.isPending}
            sx={{ color: 'text.secondary', borderColor: 'divider' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            loading={deleteMutation.isPending}
            onClick={handleConfirmDelete}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
