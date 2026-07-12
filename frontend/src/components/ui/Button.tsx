import { Button as MuiButton, ButtonProps as MuiButtonProps, CircularProgress } from '@mui/material';

export interface ButtonProps extends MuiButtonProps {
  loading?: boolean;
}

export const Button = ({ children, loading, disabled, sx, ...props }: ButtonProps) => {
  return (
    <MuiButton
      disabled={disabled || loading}
      sx={{
        borderRadius: 1.5,
        textTransform: 'none',
        fontWeight: 600,
        boxShadow: 'none',
        height: 36,
        '&:hover': {
          boxShadow: 'none',
        },
        ...sx,
      }}
      {...props}
    >
      {loading ? <CircularProgress size={20} color="inherit" /> : children}
    </MuiButton>
  );
};
