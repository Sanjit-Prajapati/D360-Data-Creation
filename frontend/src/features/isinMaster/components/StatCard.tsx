import { Box, Typography } from '@mui/material';

export interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bg: string;
  border: string;
}

export const StatCard = ({ icon, label, value, color, bg, border }: StatCardProps) => (
  <Box
    sx={{
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
    }}
  >
    <Box
      sx={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color,
        color: '#fff',
        boxShadow: `0 4px 14px ${color}55`,
      }}
    >
      {icon}
    </Box>
    <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}>
      {value.toLocaleString()}
    </Typography>
    <Typography
      sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'text.secondary', textAlign: 'center', lineHeight: 1.3 }}
    >
      {label}
    </Typography>
  </Box>
);
