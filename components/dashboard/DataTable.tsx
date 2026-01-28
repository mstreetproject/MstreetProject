'use client';

import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';
import styles from './DataTable.module.css';
import SmartDropdown, { DropdownAction } from '../ui/SmartDropdown';

export interface Column {
    key: string;
    label: string;
    render?: (value: any, row: any) => React.ReactNode;
    width?: string;
    align?: 'left' | 'center' | 'right';
}

export interface RowAction {
    label: string;
    icon?: React.ReactNode;
    onClick: (row: any) => void;
    variant?: 'default' | 'danger';
    disabled?: boolean | ((row: any) => boolean);
    hidden?: (row: any) => boolean;
}

type DatePreset = 'all' | 'today' | 'week' | 'month' | 'custom';

interface DataTableProps {
    columns: Column[];
    data: any[];
    loading?: boolean;
    emptyMessage?: string;
    onRowClick?: (row: any) => void;
    actions?: RowAction[];
    actionsLabel?: string;
    // Search
    searchable?: boolean;
    searchPlaceholder?: string;
    searchKeys?: string[];
    // Pagination
    paginated?: boolean;
    defaultPageSize?: number;
    pageSizeOptions?: number[];
    // Date Filter
    dateFilterable?: boolean;
    dateFilterKey?: string;
}

export default function DataTable({
    columns,
    data,
    loading = false,
    emptyMessage = 'No data available',
    onRowClick,
    actions,
    actionsLabel = 'Actions',
    searchable = false,
    searchPlaceholder = 'Search...',
    searchKeys,
    paginated = false,
    defaultPageSize = 10,
    pageSizeOptions = [10, 25, 50],
    dateFilterable = false,
    dateFilterKey = 'created_at',
}: DataTableProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(defaultPageSize);
    const [datePreset, setDatePreset] = useState<DatePreset>('all');
    const [customDateStart, setCustomDateStart] = useState('');
    const [customDateEnd, setCustomDateEnd] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Get date range based on preset
    const getDateRange = (): { start: Date | null; end: Date | null } => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (datePreset) {
            case 'today':
                return { start: today, end: new Date(today.getTime() + 86400000) };
            case 'week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - 7);
                return { start: weekStart, end: now };
            case 'month':
                const monthStart = new Date(today);
                monthStart.setMonth(today.getMonth() - 1);
                return { start: monthStart, end: now };
            case 'custom':
                return {
                    start: customDateStart ? new Date(customDateStart) : null,
                    end: customDateEnd ? new Date(customDateEnd + 'T23:59:59') : null,
                };
            default:
                return { start: null, end: null };
        }
    };

    // Filter data
    const filteredData = useMemo(() => {
        let result = [...data];

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const keysToSearch = searchKeys || columns.map(c => c.key);
            result = result.filter(row =>
                keysToSearch.some(key => {
                    const value = row[key];
                    if (value == null) return false;
                    return String(value).toLowerCase().includes(query);
                })
            );
        }

        // Apply date filter
        if (dateFilterable && datePreset !== 'all') {
            const { start, end } = getDateRange();
            if (start || end) {
                result = result.filter(row => {
                    const dateValue = row[dateFilterKey];
                    if (!dateValue) return false;
                    const rowDate = new Date(dateValue);
                    if (start && rowDate < start) return false;
                    if (end && rowDate > end) return false;
                    return true;
                });
            }
        }

        return result;
    }, [data, searchQuery, datePreset, customDateStart, customDateEnd, searchKeys, columns, dateFilterKey, dateFilterable]);

    // Pagination
    const totalPages = Math.ceil(filteredData.length / pageSize);
    const paginatedData = paginated
        ? filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
        : filteredData;

    // Reset to page 1 when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, datePreset, customDateStart, customDateEnd, pageSize]);

    // Helper to generate dropdown actions for a specific row
    const getRowActions = (row: any): DropdownAction[] => {
        if (!actions) return [];
        return actions
            .filter((action) => !action.hidden || !action.hidden(row))
            .map((action) => ({
                label: action.label,
                icon: action.icon,
                onClick: () => action.onClick(row),
                variant: action.variant,
                disabled:
                    typeof action.disabled === 'function'
                        ? action.disabled(row)
                        : action.disabled,
            }));
    };

    const getDatePresetLabel = () => {
        switch (datePreset) {
            case 'today': return 'Today';
            case 'week': return 'This Week';
            case 'month': return 'This Month';
            case 'custom': return 'Custom';
            default: return 'All Time';
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingSkeleton}>
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className={styles.skeletonRow}>
                            {columns.map((col) => (
                                <div key={col.key} className={styles.skeletonCell}></div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Toolbar */}
            {(searchable || dateFilterable) && (
                <div className={styles.toolbar}>
                    {searchable && (
                        <div className={styles.searchWrapper}>
                            <Search size={16} className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder={searchPlaceholder}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={styles.searchInput}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className={styles.clearSearch}
                                    type="button"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    )}

                    {dateFilterable && (
                        <div className={styles.dateFilterWrapper}>
                            <button
                                onClick={() => setShowDatePicker(!showDatePicker)}
                                className={styles.dateFilterBtn}
                                type="button"
                            >
                                <Calendar size={14} />
                                <span>{getDatePresetLabel()}</span>
                            </button>

                            {showDatePicker && (
                                <div className={styles.dateDropdown}>
                                    <button
                                        className={`${styles.dateOption} ${datePreset === 'all' ? styles.active : ''}`}
                                        onClick={() => { setDatePreset('all'); setShowDatePicker(false); }}
                                        type="button"
                                    >
                                        All Time
                                    </button>
                                    <button
                                        className={`${styles.dateOption} ${datePreset === 'today' ? styles.active : ''}`}
                                        onClick={() => { setDatePreset('today'); setShowDatePicker(false); }}
                                        type="button"
                                    >
                                        Today
                                    </button>
                                    <button
                                        className={`${styles.dateOption} ${datePreset === 'week' ? styles.active : ''}`}
                                        onClick={() => { setDatePreset('week'); setShowDatePicker(false); }}
                                        type="button"
                                    >
                                        This Week
                                    </button>
                                    <button
                                        className={`${styles.dateOption} ${datePreset === 'month' ? styles.active : ''}`}
                                        onClick={() => { setDatePreset('month'); setShowDatePicker(false); }}
                                        type="button"
                                    >
                                        This Month
                                    </button>
                                    <div className={styles.customDateSection}>
                                        <span className={styles.customLabel}>Custom Range</span>
                                        <div className={styles.customInputs}>
                                            <input
                                                type="date"
                                                value={customDateStart}
                                                onChange={(e) => {
                                                    setCustomDateStart(e.target.value);
                                                    setDatePreset('custom');
                                                }}
                                                className={styles.dateInput}
                                            />
                                            <span>to</span>
                                            <input
                                                type="date"
                                                value={customDateEnd}
                                                onChange={(e) => {
                                                    setCustomDateEnd(e.target.value);
                                                    setDatePreset('custom');
                                                }}
                                                className={styles.dateInput}
                                            />
                                        </div>
                                        <button
                                            onClick={() => setShowDatePicker(false)}
                                            className={styles.applyBtn}
                                            type="button"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Table */}
            {paginatedData.length === 0 ? (
                <div className={styles.empty}>{emptyMessage}</div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                {columns.map((column) => (
                                    <th
                                        key={column.key}
                                        className={styles.th}
                                        style={{
                                            width: column.width,
                                            minWidth: column.width,
                                            textAlign: column.align || 'left'
                                        }}
                                    >
                                        {column.label}
                                    </th>
                                ))}
                                {actions && actions.length > 0 && (
                                    <th key="actions" className={`${styles.th} ${styles.actionsHeader}`}>
                                        {actionsLabel}
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((row, index) => (
                                <tr
                                    key={index}
                                    className={`${styles.tr} ${onRowClick ? styles.clickable : ''}`}
                                    onClick={() => onRowClick?.(row)}
                                >
                                    {columns.map((column) => (
                                        <td
                                            key={column.key}
                                            className={styles.td}
                                            data-label={column.label}
                                            style={{
                                                width: column.width,
                                                minWidth: column.width,
                                                textAlign: column.align || 'left'
                                            }}
                                        >
                                            {column.render ? column.render(row[column.key], row) : row[column.key]}
                                        </td>
                                    ))}
                                    {actions && actions.length > 0 && (
                                        <td key="actions" className={`${styles.td} ${styles.actionsCell}`}>
                                            <SmartDropdown actions={getRowActions(row)} />
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {paginated && filteredData.length > 0 && (
                <div className={styles.pagination}>
                    <div className={styles.pageInfo}>
                        <span className={styles.pageInfoText}>
                            {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length}
                        </span>
                    </div>

                    <div className={styles.pageControls}>
                        <select
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                            className={styles.pageSizeSelect}
                        >
                            {pageSizeOptions.map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>

                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className={styles.pageBtn}
                            type="button"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <span className={styles.pageNumber}>{currentPage} / {totalPages || 1}</span>

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
                            className={styles.pageBtn}
                            type="button"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
