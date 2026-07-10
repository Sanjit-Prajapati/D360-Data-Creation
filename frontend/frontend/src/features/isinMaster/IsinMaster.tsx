import {
  Box,
  Button,
  TextField,
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
import { Clear as ClearIcon, CheckCircle, ContentCopy, AddCircle } from '@mui/icons-material';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, ColumnDef } from '@/components/common/DataTable';
import { IsinMaster as IsinType, IsinImportStats } from '@/types';
import { isinService } from '@/services/isinService';

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: 'ACTIVE', color: '#2e7d32', bg: 'rgba(46,125,50,0.10)' },
  INACTIVE: { label: 'INACTIVE', color: '#616161', bg: 'rgba(97,97,97,0.10)' },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.ACTIVE;
  return (
    <Box component="span" sx={{
      display: 'inline-flex', alignItems: 'center',
      px: 1.25, py: 0.25,
      borderRadius: '20px',
      fontSize: '0.75rem', fontWeight: 600,
      color: cfg.color,
      backgroundColor: cfg.bg,
      whiteSpace: 'nowrap',
      letterSpacing: '0.2px',
    }}>
      <Box component="span" sx={{
        width: 6, height: 6, borderRadius: '50%',
        backgroundColor: cfg.color, mr: 0.75, flexShrink: 0,
      }} />
      {cfg.label}
    </Box>
  );
};

// ─── Import Stats Card ────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bg: string;
  border: string;
}

const StatCard = ({ icon, label, value, color, bg, border }: StatCardProps) => (
  <Box sx={{
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
    py: 2.5,
    px: 2,
    borderRadius: 3,
    backgroundColor: bg,
    border: `1.5px solid ${border}`,
    transition: 'transform 0.2s ease',
    '&:hover': { transform: 'translateY(-2px)' },
  }}>
    <Box sx={{
      width: 48, height: 48,
      borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: color,
      color: '#fff',
      boxShadow: `0 4px 14px ${color}55`,
    }}>
      {icon}
    </Box>
    <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: '#1a1a2e', lineHeight: 1.1 }}>
      {value.toLocaleString()}
    </Typography>
    <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#666', textAlign: 'center', lineHeight: 1.3 }}>
      {label}
    </Typography>
  </Box>
);

// ─── Import Stats Dialog ──────────────────────────────────────────────────────

interface ImportStatsDialogProps {
  open: boolean;
  stats: IsinImportStats | null;
  onClose: () => void;
}

const ImportStatsDialog = ({ open, stats, onClose }: ImportStatsDialogProps) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth="sm"
    fullWidth
    PaperProps={{
      sx: {
        borderRadius: 4,
        backgroundImage: 'linear-gradient(135deg, #f8faff 0%, #ffffff 100%)',
        border: '1px solid rgba(99,102,241,0.15)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.12)',
        overflow: 'hidden',
      }
    }}
  >
    {/* Header */}
    <Box sx={{
      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      px: 3, py: 2.5,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{
          width: 40, height: 40, borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CheckCircle sx={{ color: '#fff', fontSize: 22 }} />
        </Box>
        <Box>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>
            Import Complete
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem' }}>
            CSV file processed successfully
          </Typography>
        </Box>
      </Box>
      <IconButton size="small" onClick={onClose} sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.15)' } }}>
        <ClearIcon sx={{ fontSize: 20 }} />
      </IconButton>
    </Box>

    <DialogContent sx={{ p: 3 }}>
      {stats && (
        <>
          <Typography sx={{ fontSize: '0.82rem', color: '#888', mb: 2.5, textAlign: 'center' }}>
            Here's a summary of what was imported from your file
          </Typography>

          {/* 3 Cards */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <StatCard
              icon={<ContentCopy sx={{ fontSize: 22 }} />}
              label="Total Records in File"
              value={stats.totalRecords}
              color="#6366f1"
              bg="rgba(99,102,241,0.06)"
              border="rgba(99,102,241,0.2)"
            />
            <StatCard
              icon={<AddCircle sx={{ fontSize: 22 }} />}
              label="Records Created"
              value={stats.recordsCreated}
              color="#10b981"
              bg="rgba(16,185,129,0.06)"
              border="rgba(16,185,129,0.2)"
            />
            <StatCard
              icon={<ContentCopy sx={{ fontSize: 22 }} />}
              label="Duplicate Records"
              value={stats.duplicateRecords}
              color="#f59e0b"
              bg="rgba(245,158,11,0.06)"
              border="rgba(245,158,11,0.2)"
            />
          </Box>

          {/* Info note */}
          {stats.duplicateRecords > 0 && (
            <Box sx={{
              mt: 2.5, px: 2, py: 1.5,
              borderRadius: 2,
              backgroundColor: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.25)',
              display: 'flex', gap: 1, alignItems: 'flex-start',
            }}>
              <Typography sx={{ fontSize: '1rem', lineHeight: 1 }}>⚠️</Typography>
              <Typography sx={{ fontSize: '0.8rem', color: '#92400e', lineHeight: 1.5 }}>
                <strong>{stats.duplicateRecords} duplicate</strong> {stats.duplicateRecords === 1 ? 'record was' : 'records were'} found and updated with the latest values from your file.
              </Typography>
            </Box>
          )}
        </>
      )}
    </DialogContent>

    <DialogActions sx={{ px: 3, pb: 2.5 }}>
      <Button
        variant="contained"
        fullWidth
        onClick={onClose}
        sx={{
          borderRadius: 2,
          height: 42,
          textTransform: 'none',
          fontWeight: 700,
          fontSize: '0.9rem',
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
          '&:hover': { boxShadow: '0 6px 20px rgba(99,102,241,0.5)' },
        }}
      >
        Done
      </Button>
    </DialogActions>
  </Dialog>
);

// ─── Main IsinMaster Component ───────────────────────────────────────────────

export const IsinMaster = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIsin, setSelectedIsin] = useState<IsinType | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isinToDelete, setIsinToDelete] = useState<string | null>(null);
  const [importStatsOpen, setImportStatsOpen] = useState(false);
  const [importStats, setImportStats] = useState<IsinImportStats | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);


  // Form fields state
  const [formFields, setFormFields] = useState({
    isin: '',
    instrument_name: '',
    symbol: '',
    security_type: 'EQUITY',
    status: 'ACTIVE',
  });

  // 1. Fetch live records from the backend database
  const { data: isins = [], isLoading } = useQuery<IsinType[]>({
    queryKey: ['isins'],
    queryFn: () => isinService.getAll(),
  });

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: (newRecord: any) => isinService.create(newRecord),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isins'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => isinService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isins'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => isinService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isins'] });
    },
  });

  const handleOpenAdd = () => {
    setSelectedIsin(null);
    setFormFields({
      isin: '',
      instrument_name: '',
      symbol: '',
      security_type: 'EQUITY',
      status: 'ACTIVE',
    });
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

  const handleInputChange = (field: keyof typeof formFields, value: string) => {
    setFormFields(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (selectedIsin) {
      updateMutation.mutate({
        id: selectedIsin.id,
        data: {
          ...formFields,
          isin: formFields.isin.toUpperCase(),
        },
      });
    } else {
      createMutation.mutate({
        ...formFields,
        isin: formFields.isin.toUpperCase(),
      });
    }
    setDialogOpen(false);
  };

  // ── Import handler — sends file to backend, shows stats modal ────────────────
  const handleImport = async (file: File) => {
    setImporting(true);
    setImportError(null);
    try {
      const stats = await isinService.importCsv(file);
      setImportStats(stats);
      setImportStatsOpen(true);
      queryClient.invalidateQueries({ queryKey: ['isins'] });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to import CSV. Please check the file and try again.';
      setImportError(msg);
    } finally {
      setImporting(false);
    }
  };

  const handleOpenDelete = (id: string) => {
    setIsinToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (isinToDelete !== null) {
      deleteMutation.mutate(isinToDelete);
      setIsinToDelete(null);
    }
    setDeleteConfirmOpen(false);
  };

  // Form Validation
  const isFormValid = useMemo(() => {
    return (
      formFields.isin.trim().length > 0 &&
      formFields.instrument_name.trim().length > 0 &&
      formFields.symbol.trim().length > 0 &&
      formFields.security_type.trim().length > 0 &&
      formFields.status.trim().length > 0
    );
  }, [formFields]);

  // ── Column definitions ───────────────────────────────────────────────────────

  const columns: ColumnDef<IsinType>[] = useMemo(() => [
    {
      field: 'isin',
      headerName: 'ISIN',
      minWidth: 110,
      sortable: true,
      renderCell: row => (
        <Typography sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.8125rem', letterSpacing: '0.3px' }}>
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
  ], []);

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Error Alert */}
      {importError && (
        <Box sx={{
          position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9998, minWidth: 360, maxWidth: 520,
        }}>
          <Alert
            severity="error"
            onClose={() => setImportError(null)}
            sx={{ borderRadius: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', fontWeight: 500 }}
          >
            <strong>Import Failed:</strong> {importError}
          </Alert>
        </Box>
      )}

      {/* Importing overlay */}
      {importing && (
        <Box sx={{
          position: 'fixed', inset: 0, zIndex: 9999,
          backgroundColor: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
        }}>
          <CircularProgress sx={{ color: '#6366f1' }} size={48} thickness={4} />
          <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>
            Importing CSV file…
          </Typography>
        </Box>
      )}

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
          { key: 'security_type', label: 'Security Type', options: ['EQUITY', 'REIT', 'INVIT'] }
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

      {/* ── Add/Edit ISIN Dialog ── */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="xs"
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
              {selectedIsin ? 'Edit ISIN Details' : 'Add New ISIN'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
              {selectedIsin ? 'Modify the selected ISIN information' : 'Fill in the details to add a new ISIN record'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setDialogOpen(false)} sx={{ color: 'text.secondary' }}>
            <ClearIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 1.5 }}>
          <Grid container spacing={2}>
            {/* ISIN */}
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block', color: 'text.secondary' }}>ISIN *</Typography>
              <TextField
                fullWidth size="small"
                placeholder="e.g. INE001A01036"
                value={formFields.isin}
                onChange={e => handleInputChange('isin', e.target.value)}
                inputProps={{ style: { textTransform: 'uppercase' } }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: '0.85rem' } }}
              />
            </Grid>

            {/* Instrument Name */}
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block', color: 'text.secondary' }}>Instrument Name *</Typography>
              <TextField
                fullWidth size="small"
                placeholder="e.g. Reliance Industries Limited"
                value={formFields.instrument_name}
                onChange={e => handleInputChange('instrument_name', e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: '0.85rem' } }}
              />
            </Grid>

            {/* Symbol */}
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block', color: 'text.secondary' }}>Symbol *</Typography>
              <TextField
                fullWidth size="small"
                placeholder="e.g. RELIANCE"
                value={formFields.symbol}
                onChange={e => handleInputChange('symbol', e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: '0.85rem' } }}
              />
            </Grid>

            {/* Security Type */}
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block', color: 'text.secondary' }}>Security Type *</Typography>
              <TextField
                select fullWidth size="small"
                value={formFields.security_type}
                onChange={e => handleInputChange('security_type', e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: '0.85rem' } }}
              >
                {['EQUITY', 'REIT', 'INVIT'].map(type => (
                  <MenuItem key={type} value={type} sx={{ fontSize: '0.85rem' }}>{type}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Status */}
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block', color: 'text.secondary' }}>Status *</Typography>
              <TextField
                select fullWidth size="small"
                value={formFields.status}
                onChange={e => handleInputChange('status', e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: '0.85rem' } }}
              >
                {['ACTIVE', 'INACTIVE'].map(st => (
                  <MenuItem key={st} value={st} sx={{ fontSize: '0.85rem' }}>{st}</MenuItem>
                ))}
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
            disabled={!isFormValid}
            sx={{ borderRadius: 1.5, px: 3, height: 36, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
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
          }
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
    </Box>
  );
};
