import {
  Box,
  MenuItem,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Clear as ClearIcon } from '@mui/icons-material';
import { useState, useMemo } from 'react';
import { AxiosError } from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, ColumnDef } from '@/components/common/DataTable';
import { IsinMaster as IsinType, IsinMasterFormData } from '@/types';
import { isinService } from '@/services/isinService';
import { Button } from '@/components/ui/Button';
import { FormInput } from '@/components/ui/FormInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ImportStatsDialog } from './components/ImportStatsDialog';
import { SECURITY_TYPES, STATUS_OPTIONS, INITIAL_FORM } from './constants';

// ─── Main Component ───────────────────────────────────────────────────────────

export const IsinMaster = () => {
  const queryClient = useQueryClient();

  // ── Dialog & selection state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIsin, setSelectedIsin] = useState<IsinType | null>(null);

  // ── Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isinToDelete, setIsinToDelete] = useState<string | null>(null);

  // ── Import state
  const [importStatsOpen, setImportStatsOpen] = useState(false);
  const [importStats, setImportStats] = useState<import('@/types').IsinImportStats | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // ── Form fields state
  const [formFields, setFormFields] = useState<IsinMasterFormData>(INITIAL_FORM);

  // ── Server state
  const { data: isins = [], isLoading } = useQuery<IsinType[]>({
    queryKey: ['isins'],
    queryFn: () => isinService.getAll(),
  });

  // ── Mutations — dialog closes in onSuccess so it only closes on confirmed save
  const createMutation = useMutation({
    mutationFn: (newRecord: IsinMasterFormData) => isinService.create(newRecord),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isins'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: IsinMasterFormData }) =>
      isinService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isins'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => isinService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isins'] });
    },
  });

  // ── Dialog handlers
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedIsin(null);
    setFormFields(INITIAL_FORM); // always reset — prevents stale data on next open
  };

  const handleOpenAdd = () => {
    setSelectedIsin(null);
    setFormFields(INITIAL_FORM);
    setDialogOpen(true);
  };

  const handleOpenEdit = (record: IsinType) => {
    setSelectedIsin(record);
    setFormFields({
      isin: record.isin,
      instrument_name: record.instrument_name,
      symbol: record.symbol,
      security_type: record.security_type,
      status: record.status,
    });
    setDialogOpen(true);
  };

  const handleInputChange = (field: keyof IsinMasterFormData, value: string) => {
    setFormFields(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const payload: IsinMasterFormData = {
      ...formFields,
      isin: formFields.isin.trim().toUpperCase(),
    };
    if (selectedIsin) {
      updateMutation.mutate({ id: selectedIsin.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
    // dialog closes via onSuccess — not here
  };

  // ── Delete handlers
  const handleOpenDelete = (id: string) => {
    setIsinToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (isinToDelete) {
      deleteMutation.mutate(isinToDelete);
    }
    setIsinToDelete(null);
    setDeleteConfirmOpen(false);
  };

  // ── CSV Import
  const handleImport = async (file: File) => {
    setImporting(true);
    setImportError(null);
    try {
      const stats = await isinService.importCsv(file);
      setImportStats(stats);
      setImportStatsOpen(true);
      queryClient.invalidateQueries({ queryKey: ['isins'] });
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string; error?: string }>;
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Failed to import CSV. Please check the file and try again.';
      setImportError(msg);
    } finally {
      setImporting(false);
    }
  };

  // ── Form validation
  const isFormValid = useMemo(
    () =>
      formFields.isin.trim().length > 0 &&
      formFields.instrument_name.trim().length > 0 &&
      formFields.symbol.trim().length > 0 &&
      formFields.security_type.length > 0 &&
      formFields.status.length > 0,
    [formFields],
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Column definitions
  const columns: ColumnDef<IsinType>[] = useMemo(
    () => [
      {
        field: 'isin',
        headerName: 'ISIN',
        minWidth: 110,
        sortable: true,
        renderCell: row => (
          <Typography
            sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.8125rem', letterSpacing: '0.3px' }}
          >
            {row.isin}
          </Typography>
        ),
      },
      { field: 'instrument_name', headerName: 'Instrument Name', minWidth: 180, sortable: true },
      { field: 'symbol', headerName: 'Symbol', minWidth: 90, sortable: true },
      { field: 'security_type', headerName: 'Security Type', minWidth: 110, sortable: true },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 100,
        sortable: true,
        renderCell: row => <StatusBadge status={row.status} />,
      },
      { field: 'created_at', headerName: 'Created At', minWidth: 145, sortable: true },
      { field: 'updated_at', headerName: 'Updated At', minWidth: 145, sortable: true },
    ],
    [],
  );

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Import error alert */}
      {importError && (
        <Box
          sx={{
            position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
            zIndex: 9998, minWidth: 360, maxWidth: 520,
          }}
        >
          <Alert
            severity="error"
            onClose={() => setImportError(null)}
            sx={{ borderRadius: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', fontWeight: 500 }}
          >
            <strong>Import Failed:</strong> {importError}
          </Alert>
        </Box>
      )}

      {/* Full-screen importing overlay */}
      {importing && (
        <Box
          sx={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(4px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
          }}
        >
          <CircularProgress sx={{ color: '#6366f1' }} size={48} thickness={4} />
          <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>
            Importing CSV file…
          </Typography>
        </Box>
      )}

      {/* Data table */}
      <DataTable<IsinType>
        data={isins}
        columns={columns}
        idField="id"
        loading={isLoading}
        disableSearch={false}
        disableColumnFilters={true}
        searchPlaceholder="Search by ISIN or Name..."
        searchFields={['isin', 'instrument_name']}
        dropdownFilters={[
          { key: 'security_type', label: 'Security Type', options: [...SECURITY_TYPES] },
        ]}
        addLabel="Add ISIN"
        onAdd={handleOpenAdd}
        onEdit={handleOpenEdit}
        onDelete={row => handleOpenDelete(row.id)}
        onImport={handleImport}
        importLabel="Import ISIN"
        exportFilename="isin_master.csv"
      />

      {/* ── Import Stats Dialog ── */}
      <ImportStatsDialog
        open={importStatsOpen}
        stats={importStats}
        onClose={() => setImportStatsOpen(false)}
      />

      {/* ── Add / Edit Dialog ── */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="xs"
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
              {selectedIsin ? 'Edit ISIN Details' : 'Add New ISIN'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
              {selectedIsin
                ? 'Modify the selected ISIN information'
                : 'Fill in the details to add a new ISIN record'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleCloseDialog} sx={{ color: 'text.secondary' }}>
            <ClearIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 1.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormInput
                label="ISIN"
                required
                placeholder="e.g. INE001A01036"
                value={formFields.isin}
                onChange={e => handleInputChange('isin', e.target.value)}
                inputProps={{ style: { textTransform: 'uppercase' } }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormInput
                label="Instrument Name"
                required
                placeholder="e.g. Reliance Industries Limited"
                value={formFields.instrument_name}
                onChange={e => handleInputChange('instrument_name', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <FormInput
                label="Symbol"
                required
                placeholder="e.g. RELIANCE"
                value={formFields.symbol}
                onChange={e => handleInputChange('symbol', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <FormInput
                select
                label="Security Type"
                required
                value={formFields.security_type}
                onChange={e => handleInputChange('security_type', e.target.value)}
              >
                {SECURITY_TYPES.map(type => (
                  <MenuItem key={type} value={type} sx={{ fontSize: '0.85rem' }}>
                    {type}
                  </MenuItem>
                ))}
              </FormInput>
            </Grid>

            <Grid item xs={12}>
              <FormInput
                select
                label="Status"
                required
                value={formFields.status}
                onChange={e => handleInputChange('status', e.target.value)}
              >
                {STATUS_OPTIONS.map(status => (
                  <MenuItem key={status} value={status} sx={{ fontSize: '0.85rem' }}>
                    {status}
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
            {selectedIsin ? 'Save Changes' : 'Add ISIN'}
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
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem', pb: 1 }}>
          Delete ISIN Record?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Are you sure you want to delete this ISIN record? This action is permanent and cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteConfirmOpen(false)}
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
