import {
  Box,
  Typography,
  Dialog,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import {
  Clear as ClearIcon,
  CheckCircle,
  ContentCopy,
  AddCircle,
} from '@mui/icons-material';
import { IsinImportStats } from '@/types';
import { Button } from '@/components/ui/Button';
import { StatCard } from './StatCard';

export interface ImportStatsDialogProps {
  open: boolean;
  stats: IsinImportStats | null;
  onClose: () => void;
}

export const ImportStatsDialog = ({ open, stats, onClose }: ImportStatsDialogProps) => (
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
      },
    }}
  >
    {/* Header */}
    <Box
      sx={{
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        px: 3,
        py: 2.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
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
      <IconButton
        size="small"
        onClick={onClose}
        sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.15)' } }}
      >
        <ClearIcon sx={{ fontSize: 20 }} />
      </IconButton>
    </Box>

    <DialogContent sx={{ p: 3 }}>
      {stats && (
        <>
          <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 2.5, textAlign: 'center' }}>
            Here's a summary of what was imported from your file
          </Typography>

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

          {stats.duplicateRecords > 0 && (
            <Box
              sx={{
                mt: 2.5,
                px: 2,
                py: 1.5,
                borderRadius: 2,
                backgroundColor: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.25)',
                display: 'flex',
                gap: 1,
                alignItems: 'flex-start',
              }}
            >
              <Typography sx={{ fontSize: '1rem', lineHeight: 1 }}>⚠️</Typography>
              <Typography sx={{ fontSize: '0.8rem', color: '#92400e', lineHeight: 1.5 }}>
                <strong>{stats.duplicateRecords} duplicate</strong>{' '}
                {stats.duplicateRecords === 1 ? 'record was' : 'records were'} found and updated
                with the latest values from your file.
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
          height: 42,
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
