import { Chip, ChipProps } from '@mui/material';

type Status = string;

interface StatusChipProps extends Omit<ChipProps, 'color'> {
  status: Status;
  variant?: 'filled' | 'outlined';
}

const getStatusColor = (
  status: Status
): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
  const normalizedStatus = status?.toLowerCase().replace(/[_\s-]/g, '');

  // General status colors
  if (normalizedStatus.includes('active')) return 'success';
  if (normalizedStatus.includes('inactive') || normalizedStatus.includes('disabled')) return 'default';
  if (normalizedStatus.includes('pending')) return 'warning';
  if (normalizedStatus.includes('completed') || normalizedStatus.includes('success')) return 'success';
  if (normalizedStatus.includes('error') || normalizedStatus.includes('failed')) return 'error';
  if (normalizedStatus.includes('processing') || normalizedStatus.includes('progress')) return 'primary';
  if (normalizedStatus.includes('suspended') || normalizedStatus.includes('blocked')) return 'error';

  // Transaction specific statuses
  if (normalizedStatus.includes('credit')) return 'success';
  if (normalizedStatus.includes('debit')) return 'info';
  if (normalizedStatus.includes('buy')) return 'primary';
  if (normalizedStatus.includes('sell')) return 'secondary';

  // Security types
  if (normalizedStatus.includes('equity')) return 'primary';
  if (normalizedStatus.includes('debt')) return 'info';
  if (normalizedStatus.includes('bond')) return 'secondary';

  return 'default';
};

export const StatusChip = ({ status, variant = 'filled', ...props }: StatusChipProps) => {
  const color = getStatusColor(status);
  const displayLabel = status?.replace(/_/g, ' ') || '';

  return (
    <Chip
      label={displayLabel}
      color={color}
      variant={variant}
      size="small"
      {...props}
      sx={{
        fontWeight: 500,
        textTransform: 'uppercase',
        fontSize: '0.75rem',
        ...props.sx,
      }}
    />
  );
};
