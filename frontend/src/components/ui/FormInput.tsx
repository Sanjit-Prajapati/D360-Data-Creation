import { TextField, TextFieldProps, Typography, Box } from '@mui/material';

export type FormInputProps = TextFieldProps & {
  label?: string;
  required?: boolean;
};

export const FormInput = ({
  label,
  required,
  fullWidth = true,
  size = 'small',
  sx,
  children,
  ...props
}: FormInputProps) => {
  return (
    <Box sx={{ width: '100%' }}>
      {label && (
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            mb: 0.5,
            display: 'block',
            color: props.error ? 'error.main' : 'text.secondary',
          }}
        >
          {label} {required && <span style={{ color: 'inherit' }}>*</span>}
        </Typography>
      )}
      <TextField
        fullWidth={fullWidth}
        size={size}
        required={required}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 1.5,
            fontSize: '0.85rem',
          },
          ...sx,
        }}
        {...props}
      >
        {children}
      </TextField>
    </Box>
  );
};
