import { TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { debounce } from '@/utils/helpers';
import { useMemo } from 'react';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  delay?: number;
}

export const SearchBar = ({ placeholder = 'Search...', onSearch, delay = 300 }: SearchBarProps) => {
  const debouncedSearch = useMemo(() => debounce(onSearch, delay), [onSearch, delay]);

  return (
    <TextField
      fullWidth
      size="small"
      placeholder={placeholder}
      onChange={(e) => debouncedSearch(e.target.value)}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
      }}
    />
  );
};
