'use client'

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Filter,
  Loader2,
  MoreHorizontal,
  Search,
  X,
} from 'lucide-react';
import { useState } from 'react';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  accessor: (item: T) => React.ReactNode;
  /** Plain-text value for this column when exporting to CSV. Falls back to
   * the accessor's output if omitted, but that only works when the accessor
   * returns a plain string/number rather than JSX. */
  exportValue?: (item: T) => string | number;
  /** Plain-text column label for the CSV header row, when `header` is JSX
   * (e.g. a label plus an info tooltip) rather than a plain string. */
  exportHeader?: string;
  sortable?: boolean;
  width?: string;
  className?: string;
}

export interface FilterOption {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchKey?: string;
  filters?: FilterOption[];
  onRowClick?: (item: T) => void;
  rowActions?: (item: T) => React.ReactNode;
  selectable?: boolean;
  onSelectionChange?: (selectedItems: T[]) => void;
  pageSize?: number;
  totalItems?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onSearch?: (query: string) => void;
  onFilterChange?: (filters: Record<string, string>) => void;
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  isLoading?: boolean;
  emptyMessage?: string;
  rowClassName?: (item: T) => string;
  /** Overrides the built-in "export the current page as CSV" behavior with
   * a full-result-set export (e.g. an async backend export job) for tables
   * that have one — the caller closes over its own current filter state so
   * the export matches what's on screen. The button shows a spinner while
   * this promise is pending. */
  onExport?: () => Promise<void>;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  searchPlaceholder = 'Search...',
  filters = [],
  onRowClick,
  rowActions,
  selectable = false,
  onSelectionChange,
  pageSize = 10,
  totalItems,
  currentPage = 1,
  onPageChange,
  onPageSizeChange,
  onSearch,
  onFilterChange,
  onSort,
  isLoading = false,
  emptyMessage = 'No data found',
  rowClassName,
  onExport,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; order: 'asc' | 'desc' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pageSizeState, setPageSizeState] = useState(pageSize);
  // Internal page for client-side (uncontrolled) mode — used when onPageChange is not provided.
  const [internalPage, setInternalPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const isControlled = !!onPageChange;
  const effectivePage = isControlled ? currentPage : internalPage;

  // Client-side search: filter data when no onSearch handler is wired up.
  const filteredData = (!onSearch && search)
    ? data.filter((item) =>
        Object.values(item as any).some(
          (v) => typeof v === 'string' && v.toLowerCase().includes(search.toLowerCase())
        )
      )
    : data;

  const total = totalItems ?? filteredData.length;
  const totalPages = Math.ceil(total / pageSizeState);

  const handlePageChange = (page: number) => {
    if (isControlled) {
      onPageChange!(page);
    } else {
      setInternalPage(page);
    }
  };

  // Client-side pagination slice — only applied in uncontrolled mode.
  const displayData = isControlled
    ? filteredData
    : filteredData.slice((effectivePage - 1) * pageSizeState, effectivePage * pageSizeState);

  const handleSearch = (value: string) => {
    setSearch(value);
    if (!onSearch) {
      setInternalPage(1); // reset to first page when the local filter changes
    }
    onSearch?.(value);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...activeFilters, [key]: value };
    if (value === 'all') {
      delete newFilters[key];
    }
    setActiveFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const handleSort = (key: string) => {
    const newOrder = sortConfig?.key === key && sortConfig.order === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, order: newOrder });
    onSort?.(key, newOrder);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(displayData.map(item => item.id)));
    } else {
      setSelectedIds(new Set());
    }
    onSelectionChange?.(checked ? displayData : []);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
    onSelectionChange?.(data.filter(item => newSelected.has(item.id)));
  };

  const clearFilters = () => {
    setActiveFilters({});
    setSearch('');
    onFilterChange?.({});
    onSearch?.('');
  };

  const hasActiveFilters = Object.keys(activeFilters).length > 0 || search.length > 0;

  // Falls back to exporting only what's currently rendered (this page, after
  // search/filters) when the caller has no real full-result-set export
  // endpoint wired up via `onExport`.
  const handleExport = async () => {
    if (onExport) {
      setIsExporting(true);
      try {
        await onExport();
      } finally {
        setIsExporting(false);
      }
      return;
    }
    const escapeCell = (value: string) =>
      /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
    const headerRow = columns.map((c) => escapeCell(c.exportHeader ?? (typeof c.header === 'string' ? c.header : c.key)));
    const rows = displayData.map((item) =>
      columns.map((c) => {
        const raw = c.exportValue ? c.exportValue(item) : c.accessor(item);
        return escapeCell(typeof raw === 'string' || typeof raw === 'number' ? String(raw) : '');
      })
    );
    const csv = [headerRow, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          {filters.map((filter) => (
            <Select
              key={filter.key}
              value={activeFilters[filter.key] || 'all'}
              onValueChange={(value) => handleFilterChange(filter.key, value)}
            >
              <SelectTrigger className="w-[150px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder={filter.label} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || (!onExport && displayData.length === 0)}
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isExporting ? 'Exporting…' : 'Export'}
          </Button>
        </div>
      </div>

      {/* Selection info */}
      {selectable && selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
          <span className="text-sm font-medium">
            {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <Button variant="ghost" size="sm" onClick={() => handleSelectAll(false)}>
            Clear selection
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl shadow-card overflow-x-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow className="data-table-header">
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={displayData.length > 0 && displayData.every(item => selectedIds.has(item.id))}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  style={{ width: column.width }}
                  className={cn(column.sortable && 'cursor-pointer select-none', column.className)}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && (
                      <span className="text-muted-foreground">
                        {sortConfig?.key === column.key ? (
                          sortConfig.order === 'asc' ? (
                            <ArrowUp className="w-4 h-4" />
                          ) : (
                            <ArrowDown className="w-4 h-4" />
                          )
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-50" />
                        )}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
              {rowActions && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, rowIndex) => (
                <TableRow key={`skeleton-row-${rowIndex}`}>
                  {selectable && (
                    <TableCell>
                      <Skeleton className="h-4 w-4 rounded-sm" />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      <Skeleton className="h-4 w-full max-w-[140px]" />
                    </TableCell>
                  ))}
                  {rowActions && (
                    <TableCell>
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : displayData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}
                  className="h-32 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              displayData.map((item) => (
                <TableRow
                  key={String(item.id)}
                  className={cn(
                    'data-table-row',
                    onRowClick && 'cursor-pointer',
                    selectedIds.has(item.id) && 'bg-primary/5',
                    rowClassName?.(item)
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {selectable && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={(checked) =>
                          handleSelectRow(item.id, checked as boolean)
                        }
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>{column.accessor(item)}</TableCell>
                  ))}
                  {rowActions && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {rowActions(item)}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page:</span>
          <Select
            value={pageSizeState.toString()}
            onValueChange={(value) => {
              const size = parseInt(value)
              setPageSizeState(size)
              onPageSizeChange?.(size)
              onPageChange?.(1)
            }}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span>
            Showing {Math.min((effectivePage - 1) * pageSizeState + 1, total)} to{' '}
            {Math.min(effectivePage * pageSizeState, total)} of {total} entries
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(1)}
            disabled={effectivePage === 1}
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(effectivePage - 1)}
            disabled={effectivePage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (effectivePage <= 3) {
                pageNum = i + 1;
              } else if (effectivePage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = effectivePage - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={effectivePage === pageNum ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(effectivePage + 1)}
            disabled={effectivePage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(totalPages)}
            disabled={effectivePage === totalPages}
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
