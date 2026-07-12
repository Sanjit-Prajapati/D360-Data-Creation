import { useRef } from 'react';
import { FormInput, FormInputProps } from './FormInput';

export type DateInputProps = Omit<FormInputProps, 'type'> & {
  minDate?: string;
};

export const DateInput = ({ minDate, inputProps, sx, ...props }: DateInputProps) => {
  const dateRef = useRef<HTMLInputElement>(null);

  return (
    <FormInput
      type="date"
      inputRef={dateRef}
      onClick={() => dateRef.current?.showPicker?.()}
      inputProps={{
        min: minDate,
        ...inputProps,
      }}
      sx={{
        '& input::-webkit-calendar-picker-indicator': {
          cursor: 'pointer',
          opacity: 0.6,
        },
        ...sx,
      }}
      {...props}
    />
  );
};
