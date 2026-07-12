import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Paper,
  TextField,
  MenuItem,
  InputAdornment,
  IconButton,
  Tooltip,
  useTheme,
  Typography,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Menu,
  Popover,
  Dialog,
  Zoom,
  Skeleton,
} from '@mui/material';
import {
  Add as AddIcon,
  IosShare as ShareExportIcon,
  Search as SearchIcon,
  DriveFileRenameOutline as EditIcon,
  DeleteOutlineRounded as DeleteIcon,
  Clear as ClearIcon,
  ArrowUpward as SortAscIcon,
  ArrowDownward as SortDescIcon,
  UnfoldMore as SortDefaultIcon,
  DragIndicator as DragIndicatorIcon,
  MoreVert as MoreVertIcon,
  ViewColumn as ViewColumnIcon,
  FilterAlt as FilterAltIcon,
  FileUpload as ImportIcon,
  WarningAmberRounded as WarningIcon,
} from '@mui/icons-material';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface ColumnDef<T> {
  field: string;
  headerName: string;
  minWidth?: number;
  width?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  renderCell?: (row: T) => React.ReactNode;
}

export interface DropdownFilterConfig {
  key: string;
  label: string;
  options: string[];
  width?: string | number;
  /** Optional formatter — converts raw option value to a display label */
  labelFn?: (value: string) => string;
}

interface SortState {
  field: string | null;
  direction: 'asc' | 'desc' | null;
}

interface ColumnFilterConfig {
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'isEmpty' | 'isNotEmpty';
  value: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  idField?: keyof T;
  searchPlaceholder?: string;
  searchFields?: (keyof T)[];
  dropdownFilters?: DropdownFilterConfig[];
  addLabel?: string;
  onAdd?: () => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  renderActions?: (row: T) => React.ReactNode;
  initialHiddenColumns?: string[];
  exportFilename?: string;
  onExport?: () => void;
  disableSearch?: boolean;
  disableColumnFilters?: boolean;
  importLabel?: string;
  onImport?: (file: File) => void | Promise<void>;
  loading?: boolean;
  customToolbarActions?: React.ReactNode;
}

const PAGE_SIZE_OPTIONS = [50, 100, 200, 500];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  idField = 'id' as keyof T,
  searchPlaceholder = 'Search...',
  searchFields,
  dropdownFilters = [],
  addLabel = 'Add',
  onAdd,
  onEdit,
  onDelete,
  renderActions,
  initialHiddenColumns = [],
  exportFilename = 'export.csv',
  onExport,
  disableSearch = false,
  disableColumnFilters = false,
  importLabel = 'Import',
  onImport,
  loading = false,
  customToolbarActions,
}: DataTableProps<T>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // ─── States ─────────────────────────────────────────────────────────────────
  const [exportErrorOpen, setExportErrorOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownFilterValues, setDropdownFilterValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    dropdownFilters.forEach(f => {
      initial[f.key] = '';
    });
    return initial;
  });

  const [sort, setSort] = useState<SortState>({ field: null, direction: null });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const [hiddenColumns, setHiddenColumns] = useState<string[]>(initialHiddenColumns);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  // Column reordering
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [dragOverField, setDragOverField] = useState<string | null>(null);
  const dragCounter = useRef(0);

  // Synced columns order if columns props changes
  const prevColumnsRef = useRef<string>('');
  const colsKey = columns.map(c => c.field).join(',');
  if (colsKey !== prevColumnsRef.current) {
    prevColumnsRef.current = colsKey;
    setColumnOrder(columns.map(c => c.field));
  }

  // Header menus
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [activeMenuField, setActiveMenuField] = useState<string | null>(null);
  const [colMenuAnchorEl, setColMenuAnchorEl] = useState<null | HTMLElement>(null);

  // Column specific filters
  const [columnFilters, setColumnFilters] = useState<Record<string, ColumnFilterConfig>>({});
  const [filterPopoverAnchorEl, setFilterPopoverAnchorEl] = useState<null | HTMLElement>(null);
  const [activeFilterField, setActiveFilterField] = useState<string | null>(null);

  // Reset pagination on search/filter changes
  const resetPage = useCallback(() => setPage(0), []);

  const handleClearDropdownFilter = useCallback((key: string) => {
    setDropdownFilterValues(prev => ({ ...prev, [key]: '' }));
    resetPage();
  }, [resetPage]);

  // ─── Sort Helper ────────────────────────────────────────────────────────────

  const handleSort = useCallback((field: string) => {
    setSort(prev => {
      if (prev.field !== field) return { field, direction: 'asc' };
      if (prev.direction === 'asc') return { field, direction: 'desc' };
      return { field: null, direction: null };
    });
    resetPage();
  }, [resetPage]);

  // ─── Columns Menu / Actions ─────────────────────────────────────────────────

  const handleMenuOpen = (field: string) => (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setMenuAnchorEl(e.currentTarget);
    setActiveMenuField(field);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setActiveMenuField(null);
  };

  const handleSortFromMenu = (direction: 'asc' | 'desc') => {
    if (activeMenuField) {
      setSort({ field: activeMenuField, direction });
      resetPage();
    }
    handleMenuClose();
  };

  const handleHideFromMenu = () => {
    if (activeMenuField) {
      setHiddenColumns(prev => [...prev, activeMenuField]);
    }
    handleMenuClose();
  };

  const handleColMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    setColMenuAnchorEl(e.currentTarget);
  };

  const handleColMenuClose = () => {
    setColMenuAnchorEl(null);
  };

  const toggleColumnVisibility = (field: string) => {
    setHiddenColumns(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  // ─── Popover Column Filters ─────────────────────────────────────────────────

  const handleOpenFilterPopover = () => {
    setFilterPopoverAnchorEl(menuAnchorEl);
    setActiveFilterField(activeMenuField);
    handleMenuClose();
  };

  const handleCloseFilterPopover = () => {
    setFilterPopoverAnchorEl(null);
    setActiveFilterField(null);
  };

  const handleClearColumnFilter = (field: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setColumnFilters(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const isFilterActive = (field: string) => {
    const filter = columnFilters[field];
    if (!filter) return false;
    if (filter.operator === 'isEmpty' || filter.operator === 'isNotEmpty') return true;
    return filter.value.trim() !== '';
  };

  // ─── Column Width Resizing ──────────────────────────────────────────────────

  const handleResizeStart = (field: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = columnWidths[field] ?? columns.find(c => c.field === field)?.minWidth ?? 120;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(60, startWidth + deltaX);
      setColumnWidths(prev => ({
        ...prev,
        [field]: newWidth
      }));
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // ─── Drag and Drop Columns ──────────────────────────────────────────────────

  const handleDragStart = useCallback((field: string) => (e: React.DragEvent) => {
    setDraggedField(field);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      if (e.currentTarget instanceof HTMLElement) {
        e.currentTarget.style.opacity = '0.4';
      }
    }, 0);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedField(null);
    setDragOverField(null);
    dragCounter.current = 0;
  }, []);

  const handleDragEnter = useCallback((field: string) => (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (field !== draggedField) setDragOverField(field);
  }, [draggedField]);

  const handleDragLeave = useCallback((_field: string) => () => {
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setDragOverField(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((targetField: string) => (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    if (!draggedField || draggedField === targetField) {
      setDraggedField(null);
      setDragOverField(null);
      return;
    }
    setColumnOrder(prev => {
      const next = [...prev];
      const from = next.indexOf(draggedField);
      const to = next.indexOf(targetField);
      next.splice(from, 1);
      next.splice(to, 0, draggedField);
      return next;
    });
    setDraggedField(null);
    setDragOverField(null);
  }, [draggedField]);

  // ─── Filtering & Sorting Logic ──────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const fieldsToSearch = searchFields ?? (columns.map(c => c.field).filter(f => f !== 'actions') as (keyof T)[]);

    return data.filter(row => {
      // 1. Global Search
      if (q && fieldsToSearch.length > 0) {
        const matchesGlobal = fieldsToSearch.some(field => {
          const val = row[field as string];
          return val !== undefined && val !== null && String(val).toLowerCase().includes(q);
        });
        if (!matchesGlobal) return false;
      }

      // 2. Dropdown Filters
      for (const [key, filterValue] of Object.entries(dropdownFilterValues)) {
        if (!filterValue) continue;
        const val = row[key];
        if (val === undefined || val === null || String(val).toLowerCase() !== filterValue.toLowerCase()) {
          return false;
        }
      }

      // 3. Column-specific filters
      for (const [field, filterCfg] of Object.entries(columnFilters)) {
        if (!filterCfg) continue;
        const { operator, value } = filterCfg;
        const val = String(row[field] ?? '').toLowerCase();
        const searchVal = value.trim().toLowerCase();

        if (operator === 'contains') {
          if (!val.includes(searchVal)) return false;
        } else if (operator === 'equals') {
          if (val !== searchVal) return false;
        } else if (operator === 'startsWith') {
          if (!val.startsWith(searchVal)) return false;
        } else if (operator === 'endsWith') {
          if (!val.endsWith(searchVal)) return false;
        } else if (operator === 'isEmpty') {
          if (val.trim() !== '') return false;
        } else if (operator === 'isNotEmpty') {
          if (val.trim() === '') return false;
        }
      }

      return true;
    });
  }, [data, searchQuery, searchFields, columns, dropdownFilterValues, columnFilters]);

  const sorted = useMemo(() => {
    if (!sort.field || !sort.direction) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sort.field!];
      const bv = b[sort.field!];
      const cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true });
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sort]);

  const totalRows = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePageIndex = Math.min(page, totalPages - 1);
  const pageRows = sorted.slice(safePageIndex * pageSize, (safePageIndex + 1) * pageSize);

  // ─── Export CSV ─────────────────────────────────────────────────────────────

  const handleExport = useCallback(() => {
    // If custom onExport is provided, use it
    if (onExport) {
      onExport();
      return;
    }

    // Otherwise, use default export behavior
    if (sorted.length === 0) {
      setExportErrorOpen(true);
      setTimeout(() => {
        setExportErrorOpen(false);
      }, 1000);
      return;
    }
    const exportCols = columns.filter(c => c.field !== 'actions');
    const headers = exportCols.map(c => `"${c.headerName.replace(/"/g, '""')}"`).join(',');
    const rows = sorted.map(row => {
      return exportCols.map(c => {
        const val = row[c.field];
        const str = val === undefined || val === null ? '' : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(',');
    }).join('\n');

    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', exportFilename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [sorted, columns, exportFilename, onExport]);

  // ─── Render Helper Constants ────────────────────────────────────────────────

  const hasActiveFilters = searchQuery !== '' || Object.values(dropdownFilterValues).some(v => v !== '') || Object.keys(columnFilters).length > 0;

  const handleResetAllFilters = () => {
    setSearchQuery('');
    setDropdownFilterValues(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        next[k] = '';
      });
      return next;
    });
    setColumnFilters({});
    resetPage();
  };

  const orderedColumns = useMemo(
    () => columnOrder.map(f => columns.find(c => c.field === f)!).filter(Boolean),
    [columnOrder, columns]
  );

  const visibleColumns = useMemo(
    () => orderedColumns.filter(c => !hiddenColumns.includes(c.field)),
    [orderedColumns, hiddenColumns]
  );

  const headerBg = isDark ? '#1e1e2e' : '#f4f6f8';
  const borderColor = theme.palette.divider;
  const cellPx = '14px';
  const hasActions = !!onEdit || !!onDelete || !!renderActions;

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Toolbar / Filter Panel ── */}
      <Paper elevation={0} sx={{
        p: 1.25, mb: 1.5, flexShrink: 0,
        border: '1px solid', borderColor: 'divider', borderRadius: 2.5,
        backgroundColor: 'background.paper',
      }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 1.5, alignItems: { xs: 'stretch', lg: 'center' } }}>

          {/* Search and selectors */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1.25, flexGrow: 1, alignItems: 'center' }}>
            
            {/* Search Input */}
            {!disableSearch && (
              <TextField
                fullWidth size="small"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); resetPage(); }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment>,
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => { setSearchQuery(''); resetPage(); }}><ClearIcon sx={{ fontSize: 14 }} /></IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: { xs: '100%', md: '240px' },
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    fontSize: '0.8125rem',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f5f5f5',
                    '& fieldset': { borderColor: 'transparent' },
                    '&:hover fieldset': { borderColor: 'divider' },
                    '&.Mui-focused': { backgroundColor: 'background.paper', '& fieldset': { borderColor: 'primary.main', borderWidth: '1.5px' } },
                  },
                  '& .MuiOutlinedInput-input': {
                    py: '7.5px',
                  }
                }}
              />
            )}

            {/* Custom Dropdown Filters */}
            {dropdownFilters.map(({ key, label, options, width, labelFn }) => (
              <TextField
                key={key} select fullWidth size="small" label={label}
                value={dropdownFilterValues[key] ?? ''}
                onChange={e => {
                  setDropdownFilterValues(prev => ({ ...prev, [key]: e.target.value }));
                  resetPage();
                }}
                InputProps={{
                  endAdornment: dropdownFilterValues[key] && (
                    <InputAdornment position="end" sx={{ position: 'absolute', right: 28 }}>
                      <IconButton size="small" onClick={e => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleClearDropdownFilter(key);
                        if (document.activeElement instanceof HTMLElement) {
                          document.activeElement.blur();
                        }
                      }}>
                        <ClearIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                SelectProps={{
                  MenuProps: {
                    PaperProps: {
                      sx: {
                        borderRadius: 2,
                        mt: 0.5,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        border: '1px solid',
                        borderColor: 'divider',
                        maxHeight: 250,
                        overflowY: 'auto',
                      }
                    }
                  }
                }}
                sx={{
                  width: { xs: '100%', md: width ?? '140px' },
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    fontSize: '0.8125rem',
                    backgroundColor: dropdownFilterValues[key] ? (isDark ? 'rgba(144,202,249,0.15)' : 'rgba(25,118,210,0.06)') : 'transparent',
                    '& fieldset': { borderColor: dropdownFilterValues[key] ? 'primary.main' : 'divider' },
                    '&:hover fieldset': { borderColor: 'primary.main' },
                  },
                  '& .MuiInputLabel-root': {
                    color: dropdownFilterValues[key] ? 'primary.main' : 'text.secondary',
                    fontWeight: 500,
                    fontSize: '0.8125rem',
                  },
                  '& .MuiSelect-select': {
                    py: '7.5px',
                  }
                }}
              >
                {options.map(o => <MenuItem key={o} value={o.toLowerCase()} sx={{ fontSize: '0.8125rem' }}>{labelFn ? labelFn(o) : o}</MenuItem>)}
              </TextField>
            ))}

            {/* Dynamic Reset Button */}
            {hasActiveFilters && (
              <Button
                variant="text"
                color="secondary"
                onClick={handleResetAllFilters}
                startIcon={<ClearIcon sx={{ fontSize: 14 }} />}
                sx={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                  px: 1.5,
                  minWidth: 'auto',
                  height: 32,
                  borderRadius: 1.5,
                  color: isDark ? '#b0bec5' : '#607d8b',
                  '&:hover': {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    color: theme.palette.error.main,
                  }
                }}
              >
                Reset
              </Button>
            )}
          </Box>

          {/* CTA actions */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0, justifyContent: { xs: 'flex-end', lg: 'flex-start' } }}>
            {onAdd && (
              <Button
                variant="contained" startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                onClick={onAdd}
                sx={{
                  fontWeight: 700, height: 34, borderRadius: 1.5, boxShadow: 'none', transition: 'all 0.2s', fontSize: '0.8125rem', px: 2,
                  '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(25,118,210,0.25)' }
                }}
              >
                {addLabel}
              </Button>
            )}
            {onImport && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  style={{ display: 'none' }}
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await onImport(file);
                    }
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                />
                <Button
                  variant="outlined"
                  startIcon={<ImportIcon sx={{ fontSize: 18 }} />}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    fontWeight: 700, height: 34, borderRadius: 1.5, transition: 'all 0.2s', fontSize: '0.8125rem', px: 2,
                    borderColor: 'divider', color: 'text.secondary',
                    '&:hover': { borderColor: 'primary.main', color: 'primary.main', backgroundColor: isDark ? 'rgba(144,202,249,0.08)' : 'rgba(25,118,210,0.06)', transform: 'translateY(-1px)' }
                  }}
                >
                  {importLabel}
                </Button>
              </>
            )}
            {customToolbarActions}
            <Tooltip title="Manage Columns" arrow placement="bottom">
              <IconButton onClick={handleColMenuOpen} sx={{
                width: 34, height: 34, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', color: 'text.secondary',
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'primary.main', color: 'primary.main', backgroundColor: isDark ? 'rgba(144,202,249,0.1)' : 'rgba(25,118,210,0.06)', transform: 'translateY(-1px)' },
              }}>
                <ViewColumnIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export CSV" arrow placement="bottom">
              <IconButton onClick={handleExport} sx={{
                width: 34, height: 34, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', color: 'text.secondary',
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'primary.main', color: 'primary.main', backgroundColor: isDark ? 'rgba(144,202,249,0.1)' : 'rgba(25,118,210,0.06)', transform: 'translateY(-1px)' },
              }}>
                <ShareExportIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>

        </Box>
      </Paper>

      {/* ── Table Container ── */}
      <Paper elevation={0} sx={{
        flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
        border: '1px solid', borderColor: 'divider', borderRadius: 3,
        backgroundColor: 'background.paper', overflow: 'hidden',
      }}>

        {/* Scroll wrapper */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', minHeight: 0 }}>
          <Box
            component="table"
            sx={{
              width: '100%', borderCollapse: 'collapse', tableLayout: 'auto',
            }}
          >
            <colgroup>
              {hasActions && <col style={{ width: 90 }} />}
            </colgroup>

            {/* Table Head */}
            <Box component="thead" sx={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <Box component="tr" sx={{ backgroundColor: headerBg }}>

                {/* Sticky Action header */}
                {hasActions && (
                  <Box component="th" sx={{
                    px: cellPx, py: '12px', textAlign: 'center',
                    fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px',
                    color: 'text.secondary',
                    borderBottom: `2px solid ${borderColor}`,
                    backgroundColor: headerBg,
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    left: 0,
                    zIndex: 3,
                    boxShadow: `2px 0 6px -2px rgba(0,0,0,${isDark ? '0.4' : '0.12'})`,
                  }}>
                    Actions
                  </Box>
                )}

                {/* Dynamic Columns headers */}
                {visibleColumns.map(col => (
                  <Box
                    component="th" key={col.field}
                    draggable
                    onDragStart={handleDragStart(col.field)}
                    onDragEnd={handleDragEnd}
                    onDragEnter={handleDragEnter(col.field)}
                    onDragLeave={handleDragLeave(col.field)}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop(col.field)}
                    onClick={() => col.sortable !== false && handleSort(col.field)}
                    sx={{
                      px: cellPx, py: '12px',
                      textAlign: col.align ?? 'center',
                      fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px',
                      color: sort.field === col.field ? 'primary.main' : 'text.secondary',
                      borderBottom: `2px solid ${borderColor}`,
                      backgroundColor: headerBg,
                      whiteSpace: 'nowrap',
                      userSelect: 'none',
                      cursor: 'grab',
                      position: 'relative',
                      transition: 'color 0.15s, border-left 0.1s, opacity 0.15s',
                      opacity: draggedField === col.field ? 0.4 : 1,
                      borderLeft: dragOverField === col.field && draggedField !== col.field
                        ? `2px solid ${theme.palette.primary.main}`
                        : '2px solid transparent',
                      '&:hover': { color: 'primary.main' },
                      '&:hover .col-menu-btn': { opacity: 1 },
                      '&:active': { cursor: 'grabbing' },
                      width: columnWidths[col.field] ?? col.minWidth ?? 120,
                      minWidth: columnWidths[col.field] ?? col.minWidth ?? 120,
                    }}
                  >
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, width: '100%', pr: 1.5 }}>
                      <DragIndicatorIcon sx={{ fontSize: 13, opacity: 0.35, flexShrink: 0 }} />
                      {col.headerName}
                      {col.sortable !== false && (
                        <Box sx={{ display: 'inline-flex', ml: 0.5 }}>
                          {sort.field !== col.field ? (
                            <SortDefaultIcon sx={{ fontSize: 14, opacity: 0.35 }} />
                          ) : sort.direction === 'asc' ? (
                            <SortAscIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                          ) : (
                            <SortDescIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                          )}
                        </Box>
                      )}
                      {!disableColumnFilters && isFilterActive(col.field) && (
                        <Tooltip title="Clear Filter" arrow>
                          <IconButton
                            size="small"
                            onClick={handleClearColumnFilter(col.field)}
                            sx={{
                              p: 0,
                              ml: 0.5,
                              color: 'primary.main',
                              '&:hover': { color: 'error.main' },
                            }}
                          >
                            <ClearIcon sx={{ fontSize: 13 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>

                    {/* Column menu trigger button */}
                    {!disableColumnFilters && (
                      <IconButton
                        className="col-menu-btn"
                        size="small"
                        onClick={handleMenuOpen(col.field)}
                        sx={{
                          position: 'absolute',
                          right: 4,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          opacity: 0,
                          transition: 'opacity 0.15s',
                          width: 20,
                          height: 20,
                          p: 0,
                          color: 'text.secondary',
                        }}
                      >
                        <MoreVertIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    )}

                    {/* Drag resize handle */}
                    <Box
                      onMouseDown={handleResizeStart(col.field)}
                      onClick={e => e.stopPropagation()}
                      sx={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: '4px',
                        cursor: 'col-resize',
                        zIndex: 10,
                        transition: 'background-color 0.15s',
                        '&:hover': {
                          backgroundColor: 'primary.main',
                        },
                        '&:active': {
                          backgroundColor: 'primary.main',
                          width: '2px',
                        }
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Table Body */}
            <Box component="tbody">
              {loading ? (
                // ── Skeleton loader rows ──────────────────────────────────────
                Array.from({ length: 8 }).map((_, idx) => (
                  <Box
                    component="tr" key={`skeleton-${idx}`}
                    sx={{
                      backgroundColor: idx % 2 === 0
                        ? 'background.paper'
                        : (isDark ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.012)'),
                    }}
                  >
                    {hasActions && (
                      <Box component="td" sx={{ px: cellPx, py: '10px', textAlign: 'center' }}>
                        <Box sx={{ display: 'inline-flex', gap: 0.75 }}>
                          <Skeleton variant="rounded" width={28} height={28} />
                          <Skeleton variant="rounded" width={28} height={28} />
                        </Box>
                      </Box>
                    )}
                    {visibleColumns.map(col => (
                      <Box component="td" key={col.field} sx={{ px: cellPx, py: '12px' }}>
                        <Skeleton
                          variant="text"
                          width={`${55 + (idx * 13 + col.field.length * 7) % 35}%`}
                          height={16}
                          sx={{ borderRadius: 1 }}
                        />
                      </Box>
                    ))}
                  </Box>
                ))
              ) : pageRows.length === 0 ? (
                <Box component="tr">
                  <Box component="td" colSpan={visibleColumns.length + (hasActions ? 1 : 0)} sx={{ textAlign: 'center', py: 6, color: 'text.secondary', fontSize: '0.875rem' }}>
                    No records found matching your criteria.
                  </Box>
                </Box>
              ) : (
                pageRows.map((row, idx) => {
                  const idValue = row[idField];
                  return (
                    <Box
                      component="tr" key={String(idValue)}
                      sx={{
                        backgroundColor: idx % 2 === 0
                          ? 'background.paper'
                          : (isDark ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.012)'),
                        transition: 'background-color 0.12s',
                        '&:hover': { backgroundColor: isDark ? 'rgba(144,202,249,0.07)' : 'rgba(25,118,210,0.04)', cursor: 'pointer' },
                        '&:not(:last-child) td, &:not(:last-child) th': { borderBottom: `1px solid ${borderColor}` },
                      }}
                    >
                      {/* Sticky Actions Cell */}
                      {hasActions && (
                        <Box component="td" sx={{
                          px: cellPx, py: '10px', textAlign: 'center', whiteSpace: 'nowrap',
                          position: 'sticky',
                          left: 0,
                          zIndex: 1,
                          backgroundColor: idx % 2 === 0
                            ? 'background.paper'
                            : (isDark ? 'rgba(30,30,46,1)' : 'rgba(248,249,250,1)'),
                          boxShadow: `2px 0 6px -2px rgba(0,0,0,${isDark ? '0.4' : '0.1'})`,
                        }}>
                          <Box sx={{ display: 'inline-flex', gap: 0.75 }}>
                            {renderActions ? (
                              renderActions(row)
                            ) : (
                              <>
                                {onEdit && (
                                  <Tooltip title="Edit" arrow placement="top">
                                    <IconButton size="small" onClick={e => { e.stopPropagation(); onEdit(row); }} sx={{
                                      width: 28, height: 28, borderRadius: 1.5,
                                      border: '1.5px solid', borderColor: isDark ? 'rgba(144,202,249,0.3)' : 'rgba(25,118,210,0.3)',
                                      color: 'primary.main', transition: 'all 0.16s',
                                      '&:hover': { backgroundColor: 'primary.main', borderColor: 'primary.main', color: '#fff', transform: 'scale(1.1)', boxShadow: '0 2px 8px rgba(25,118,210,0.4)' },
                                    }}>
                                      <EditIcon sx={{ fontSize: 13 }} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                {onDelete && (
                                  <Tooltip title="Delete" arrow placement="top">
                                    <IconButton size="small" onClick={e => { e.stopPropagation(); onDelete(row); }} sx={{
                                      width: 28, height: 28, borderRadius: 1.5,
                                      border: '1.5px solid', borderColor: isDark ? 'rgba(244,67,54,0.3)' : 'rgba(211,47,47,0.3)',
                                      color: 'error.main', transition: 'all 0.16s',
                                      '&:hover': { backgroundColor: 'error.main', borderColor: 'error.main', color: '#fff', transform: 'scale(1.1)', boxShadow: '0 2px 8px rgba(211,47,47,0.4)' },
                                    }}>
                                      <DeleteIcon sx={{ fontSize: 13 }} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </>
                            )}
                          </Box>
                        </Box>
                      )}

                      {/* Visible Data Cells */}
                      {visibleColumns.map(col => (
                        <Box component="td" key={col.field} sx={{
                          px: cellPx, py: '10px',
                          textAlign: col.align ?? 'center',
                          fontSize: '0.8125rem',
                          color: 'text.primary',
                          whiteSpace: 'nowrap',
                        }}>
                          {col.renderCell
                            ? col.renderCell(row)
                            : String(row[col.field] ?? '—')
                          }
                        </Box>
                      ))}
                    </Box>
                  );
                })
              )}
            </Box>
          </Box>
        </Box>

        {/* ── Pagination Footer ── */}
        <Box sx={{
          flexShrink: 0, px: 2, py: 1.5,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: `2px solid ${borderColor}`,
          backgroundColor: headerBg,
          gap: 2, flexWrap: 'wrap',
        }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            {totalRows === 0
              ? 'No results'
              : hasActiveFilters
                ? `Showing ${safePageIndex * pageSize + 1}–${Math.min((safePageIndex + 1) * pageSize, totalRows)} of ${totalRows} records`
                : `Total Records: ${totalRows.toLocaleString()}`
            }
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Rows Per Page */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>Rows per page:</Typography>
              <FormControl size="small" variant="outlined" sx={{ minWidth: 64 }}>
                <Select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); resetPage(); }}
                  sx={{ fontSize: '0.8125rem', height: 30, borderRadius: 1.5 }}
                >
                  {PAGE_SIZE_OPTIONS.map(n => <MenuItem key={n} value={n} sx={{ fontSize: '0.8125rem' }}>{n}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>

            {/* Navigator buttons */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {[
                { label: '«', action: () => setPage(0), disabled: safePageIndex === 0 },
                { label: '‹', action: () => setPage(p => Math.max(0, p - 1)), disabled: safePageIndex === 0 },
                { label: '›', action: () => setPage(p => Math.min(totalPages - 1, p + 1)), disabled: safePageIndex >= totalPages - 1 },
                { label: '»', action: () => setPage(totalPages - 1), disabled: safePageIndex >= totalPages - 1 },
              ].map(({ label, action, disabled }) => (
                <Box
                  key={label}
                  component="button"
                  onClick={action}
                  disabled={disabled}
                  sx={{
                    width: 30, height: 30, borderRadius: 1,
                    border: '1px solid', borderColor: 'divider',
                    backgroundColor: 'background.paper',
                    color: disabled ? 'text.disabled' : 'text.primary',
                    cursor: disabled ? 'default' : 'pointer',
                    fontSize: '0.85rem', fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                    '&:not(:disabled):hover': { borderColor: 'primary.main', color: 'primary.main', backgroundColor: isDark ? 'rgba(144,202,249,0.08)' : 'rgba(25,118,210,0.06)' },
                  }}
                >
                  {label}
                </Box>
              ))}
            </Box>

            <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
              Page {safePageIndex + 1} of {totalPages}
            </Typography>
          </Box>
        </Box>

      </Paper>

      {/* ── Column Header Context Menu (Sort, Hide, Filter trigger) ── */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            borderRadius: 1.5,
            minWidth: 150,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }
        }}
      >
        {!disableColumnFilters && (
          <MenuItem onClick={handleOpenFilterPopover} sx={{ fontSize: '0.8125rem', gap: 1 }}>
            <FilterAltIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            Filter
          </MenuItem>
        )}
        <MenuItem onClick={() => handleSortFromMenu('asc')} sx={{ fontSize: '0.8125rem', gap: 1 }}>
          <SortAscIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          Sort Ascending
        </MenuItem>
        <MenuItem onClick={() => handleSortFromMenu('desc')} sx={{ fontSize: '0.8125rem', gap: 1 }}>
          <SortDescIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          Sort Descending
        </MenuItem>
        <MenuItem onClick={handleHideFromMenu} sx={{ fontSize: '0.8125rem', gap: 1 }}>
          <ClearIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          Hide Column
        </MenuItem>
      </Menu>

      {/* ── Manage Columns Visibility Menu ── */}
      <Menu
        anchorEl={colMenuAnchorEl}
        open={Boolean(colMenuAnchorEl)}
        onClose={handleColMenuClose}
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: 300,
            width: 200,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            p: 1,
          }
        }}
      >
        <Typography variant="caption" sx={{ px: 1.5, py: 0.5, display: 'block', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.5px' }}>
          Show / Hide Columns
        </Typography>
        {columns.map(col => {
          const isHidden = hiddenColumns.includes(col.field);
          return (
            <MenuItem
              key={col.field}
              onClick={() => toggleColumnVisibility(col.field)}
              sx={{
                fontSize: '0.8125rem',
                py: 0.5,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <input
                type="checkbox"
                checked={!isHidden}
                readOnly
                style={{
                  cursor: 'pointer',
                  accentColor: theme.palette.primary.main,
                }}
              />
              {col.headerName}
            </MenuItem>
          );
        })}
      </Menu>

      {/* ── Column Filter Popover (Operators + input filter value) ── */}
      <Popover
        open={Boolean(filterPopoverAnchorEl) && !!activeFilterField}
        anchorEl={filterPopoverAnchorEl}
        onClose={handleCloseFilterPopover}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        PaperProps={{
          sx: {
            p: 2,
            width: 540,
            borderRadius: 2.5,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            backgroundColor: 'background.paper',
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.875rem' }}>Filters</Typography>
          <IconButton size="small" onClick={handleCloseFilterPopover} sx={{ color: 'text.secondary', p: 0.5 }}>
            <ClearIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>

        {(() => {
          const hasValueInput = activeFilterField && !['isEmpty', 'isNotEmpty'].includes(columnFilters[activeFilterField]?.operator);
          return (
            <Grid container spacing={1.25} sx={{ mb: 1.5 }}>
              {/* Target column select */}
              <Grid item xs={hasValueInput ? 4 : 6}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: '0.75rem' }}>Columns</InputLabel>
                  <Select
                    value={activeFilterField ?? ''}
                    onChange={e => setActiveFilterField(e.target.value)}
                    label="Columns"
                    sx={{ borderRadius: 1.5, fontSize: '0.8125rem', height: 32 }}
                  >
                    {columns.map(col => (
                      <MenuItem key={col.field} value={col.field} sx={{ fontSize: '0.8125rem' }}>
                        {col.headerName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Operator select */}
              <Grid item xs={hasValueInput ? 4 : 6}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: '0.75rem' }}>Operators</InputLabel>
                  <Select
                    value={columnFilters[activeFilterField ?? '']?.operator ?? 'contains'}
                    onChange={e => {
                      const op = e.target.value as ColumnFilterConfig['operator'];
                      setColumnFilters(prev => ({
                        ...prev,
                        [activeFilterField!]: {
                          operator: op,
                          value: (op === 'isEmpty' || op === 'isNotEmpty') ? '' : (prev[activeFilterField!]?.value ?? ''),
                        }
                      }));
                    }}
                    label="Operators"
                    sx={{ borderRadius: 1.5, fontSize: '0.8125rem', height: 32 }}
                  >
                    <MenuItem value="contains" sx={{ fontSize: '0.8125rem' }}>contains</MenuItem>
                    <MenuItem value="equals" sx={{ fontSize: '0.8125rem' }}>equals</MenuItem>
                    <MenuItem value="startsWith" sx={{ fontSize: '0.8125rem' }}>starts with</MenuItem>
                    <MenuItem value="endsWith" sx={{ fontSize: '0.8125rem' }}>ends with</MenuItem>
                    <MenuItem value="isEmpty" sx={{ fontSize: '0.8125rem' }}>is empty</MenuItem>
                    <MenuItem value="isNotEmpty" sx={{ fontSize: '0.8125rem' }}>is not empty</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Value field */}
              {hasValueInput && (
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Filter value..."
                    value={columnFilters[activeFilterField]?.value ?? ''}
                    onChange={e => setColumnFilters(prev => ({
                      ...prev,
                      [activeFilterField!]: {
                        operator: prev[activeFilterField!]?.operator ?? 'contains',
                        value: e.target.value,
                      }
                    }))}
                    InputProps={{
                      endAdornment: (columnFilters[activeFilterField]?.value) && (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setColumnFilters(prev => ({
                              ...prev,
                              [activeFilterField!]: {
                                operator: prev[activeFilterField!]?.operator ?? 'contains',
                                value: '',
                              }
                            }))}
                            sx={{ p: 0.5 }}
                          >
                            <ClearIcon sx={{ fontSize: 12 }} />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                        fontSize: '0.8125rem',
                        height: 32,
                      }
                    }}
                  />
                </Grid>
              )}
            </Grid>
          );
        })()}

        {/* Popover Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              if (activeFilterField) {
                setColumnFilters(prev => {
                  const next = { ...prev };
                  delete next[activeFilterField];
                  return next;
                });
              }
              handleCloseFilterPopover();
            }}
            sx={{ fontSize: '0.72rem', py: 0.5, borderRadius: 1.25, textTransform: 'none', height: 28 }}
          >
            Clear
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleCloseFilterPopover}
            sx={{ fontSize: '0.72rem', py: 0.5, borderRadius: 1.25, textTransform: 'none', boxShadow: 'none', height: 28 }}
          >
            Apply
          </Button>
        </Box>
      </Popover>

      {/* Export Error Alert Dialog */}
      <Dialog
        open={exportErrorOpen}
        onClose={() => setExportErrorOpen(false)}
        TransitionComponent={Zoom}
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              backdropFilter: 'blur(4px)',
            }
          }
        }}
        PaperProps={{
          sx: {
            borderRadius: 4,
            p: 3.5,
            textAlign: 'center',
            maxWidth: '320px',
            backgroundColor: 'background.paper',
            backgroundImage: 'none',
            border: '1px solid',
            borderColor: 'error.light',
            boxShadow: '0 24px 48px -12px rgba(0,0,0,0.16)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2.2,
          }
        }}
      >
        <Box sx={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(239, 68, 68, 0.16)',
        }}>
          <WarningIcon sx={{ fontSize: 28, color: '#ef4444' }} />
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5, fontSize: '1.05rem', letterSpacing: '-0.2px' }}>
            Export Failed
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, lineHeight: 1.4, fontSize: '0.85rem' }}>
            No records are available for export
          </Typography>
        </Box>
      </Dialog>
    </Box>
  );
}
