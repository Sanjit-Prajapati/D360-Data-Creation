import { Box } from '@mui/material';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: 'ACTIVE', color: '#2e7d32', bg: 'rgba(46,125,50,0.10)' },
  INACTIVE: { label: 'INACTIVE', color: '#616161', bg: 'rgba(97,97,97,0.10)' },
};

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const normalizedStatus = (status || '').toUpperCase();
  const cfg = STATUS_MAP[normalizedStatus] ?? STATUS_MAP.ACTIVE;

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1.25,
        py: 0.25,
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: cfg.color,
        backgroundColor: cfg.bg,
        whiteSpace: 'nowrap',
        letterSpacing: '0.2px',
      }}
    >
      <Box
        component="span"
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: cfg.color,
          mr: 0.75,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </Box>
  );
};
