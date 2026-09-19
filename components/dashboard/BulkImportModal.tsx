'use client';

import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, Coins, CreditCard } from 'lucide-react';
import * as XLSX from 'xlsx';
import MStreetLoader from '@/components/ui/MStreetLoader';
import styles from './BulkImportModal.module.css';

interface BulkImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    defaultTab?: 'placements' | 'loans';
}

export default function BulkImportModal({ isOpen, onClose, onSuccess, defaultTab = 'placements' }: BulkImportModalProps) {
    const [importType, setImportType] = useState<'placements' | 'loans'>(defaultTab);
    const [fileName, setFileName] = useState<string | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    React.useEffect(() => {
        if (isOpen) {
            setImportType(defaultTab);
        }
    }, [isOpen, defaultTab]);

    if (!isOpen) return null;

    const resetState = () => {
        setFileName(null);
        setParsedData([]);
        setError(null);
        setSuccessMsg(null);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleTabChange = (tab: 'placements' | 'loans') => {
        setImportType(tab);
        resetState();
    };

    // Helper: Normalize header keys (lowercase, trim, replace spaces/dashes with underscores)
    const normalizeKey = (key: string): string => {
        return key.toLowerCase().trim().replace(/[\s\-]+/g, '_');
    };

    // File Upload Handler using SheetJS
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setSuccessMsg(null);
        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const buffer = evt.target?.result;
                const workbook = XLSX.read(buffer, { type: 'binary', cellDates: true });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                if (rawRows.length === 0) {
                    throw new Error('Spreadsheet appears to be empty');
                }

                // Normalize keys for every row
                const normalizedRows = rawRows.map(row => {
                    const normalizedRow: Record<string, any> = {};
                    Object.keys(row).forEach(key => {
                        const cleanKey = normalizeKey(key);
                        let val = row[key];

                        // Convert JS Date objects to YYYY-MM-DD
                        if (val instanceof Date) {
                            val = val.toISOString().split('T')[0];
                        }
                        normalizedRow[cleanKey] = val;
                    });
                    return normalizedRow;
                });

                setParsedData(normalizedRows);
            } catch (err: any) {
                console.error('Spreadsheet parse error:', err);
                setError(`Failed to read file: ${err.message}`);
                setParsedData([]);
            }
        };

        reader.readAsBinaryString(file);
    };

    // Download Sample Template (CSV)
    const downloadSampleTemplate = () => {
        let headers: string[];
        let sampleRow: Record<string, any>;
        let filename: string;

        if (importType === 'placements') {
            filename = 'sample_placements_import.csv';
            headers = ['creditor_name', 'email', 'phone', 'principal', 'interest_rate', 'tenure_months', 'start_date', 'status'];
            sampleRow = {
                creditor_name: 'John Doe',
                email: 'john@example.com',
                phone: '+1234567890',
                principal: 50000,
                interest_rate: 10.5,
                tenure_months: 12,
                start_date: new Date().toISOString().split('T')[0],
                status: 'active'
            };
        } else {
            filename = 'sample_loans_import.csv';
            headers = ['debtor_name', 'email', 'phone', 'principal', 'interest_rate', 'tenure_months', 'start_date', 'status', 'repayment_cycle'];
            sampleRow = {
                debtor_name: 'Jane Smith',
                email: 'jane@example.com',
                phone: '+1987654321',
                principal: 25000,
                interest_rate: 15.0,
                tenure_months: 6,
                start_date: new Date().toISOString().split('T')[0],
                status: 'performing',
                repayment_cycle: 'monthly'
            };
        }

        const worksheet = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
        const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

        const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Submit parsed data to import API
    const handleImportSubmit = async () => {
        if (parsedData.length === 0) return;

        setLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            // Map parsed row data to API payload schema
            const getStr = (val: any): string | null => {
                if (val === undefined || val === null || val === '') return null;
                return String(val).trim();
            };

            const mappedRows = parsedData.map(r => {
                if (importType === 'placements') {
                    return {
                        creditor_name: getStr(r.creditor_name || r.creditor || r.name || r.full_name) || '',
                        email: getStr(r.email || r.email_address),
                        phone: getStr(r.phone || r.phone_number || r.mobile || r.telephone),
                        principal: parseFloat(r.principal || r.amount || 0),
                        interest_rate: parseFloat(r.interest_rate || r.rate || 0),
                        tenure_months: parseInt(r.tenure_months || r.tenure || r.tenor || 0),
                        start_date: getStr(r.start_date || r.date) || new Date().toISOString().split('T')[0],
                        status: getStr(r.status) || 'active'
                    };
                } else {
                    return {
                        debtor_name: getStr(r.debtor_name || r.debtor || r.name || r.full_name) || '',
                        email: getStr(r.email || r.email_address),
                        phone: getStr(r.phone || r.phone_number || r.mobile || r.telephone),
                        principal: parseFloat(r.principal || r.amount || 0),
                        interest_rate: parseFloat(r.interest_rate || r.rate || 0),
                        tenure_months: parseInt(r.tenure_months || r.tenure || r.tenor || 0),
                        start_date: getStr(r.start_date || r.date) || new Date().toISOString().split('T')[0],
                        status: getStr(r.status) || 'performing',
                        repayment_cycle: getStr(r.repayment_cycle || r.cycle) || 'monthly'
                    };
                }
            });

            const response = await fetch('/api/admin/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ importType, rows: mappedRows })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to process import');
            }

            setSuccessMsg(`Successfully imported ${result.importedCount} out of ${result.totalRows} ${importType}!`);
            
            setTimeout(() => {
                resetState();
                onSuccess();
                onClose();
            }, 2000);

        } catch (err: any) {
            console.error('Import error:', err);
            setError(err.message || 'Failed to complete import');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>Bulk Data Import</h2>
                        <p className={styles.subtitle}>Upload Excel or CSV spreadsheets to batch migrate historical or current records</p>
                    </div>
                    <button onClick={handleClose} className={styles.closeBtn} type="button">
                        <X size={24} />
                    </button>
                </div>

                <div className={styles.body}>
                    {/* Tab Selection */}
                    <div className={styles.tabToggle}>
                        <button
                            type="button"
                            className={`${styles.tabBtn} ${importType === 'placements' ? styles.tabBtnActive : ''}`}
                            onClick={() => handleTabChange('placements')}
                        >
                            <Coins size={18} />
                            <span>Placements (Credits)</span>
                        </button>
                        <button
                            type="button"
                            className={`${styles.tabBtn} ${importType === 'loans' ? styles.tabBtnActive : ''}`}
                            onClick={() => handleTabChange('loans')}
                        >
                            <CreditCard size={18} />
                            <span>Loans & Advances</span>
                        </button>
                    </div>

                    {/* Template Banner */}
                    <div className={styles.templateSection}>
                        <p className={styles.templateText}>
                            Need the required file format? Download the sample CSV template.
                        </p>
                        <button
                            type="button"
                            className={styles.downloadBtn}
                            onClick={downloadSampleTemplate}
                        >
                            <Download size={14} />
                            <span>Download Template</span>
                        </button>
                    </div>

                    {/* Notifications */}
                    {error && (
                        <div className={styles.errorMessage}>
                            <AlertCircle size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                            {error}
                        </div>
                    )}

                    {successMsg && (
                        <div className={styles.successMessage}>
                            <CheckCircle size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                            {successMsg}
                        </div>
                    )}

                    {/* Dropzone */}
                    <div
                        className={styles.dropzone}
                        onClick={() => document.getElementById('bulk-file-input')?.click()}
                    >
                        <input
                            id="bulk-file-input"
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                        />
                        <FileSpreadsheet size={40} className={styles.dropzoneIcon} />
                        <p className={styles.dropzoneTitle}>
                            {fileName ? fileName : 'Click to select or drag and drop an Excel / CSV file'}
                        </p>
                        <p className={styles.dropzoneDesc}>
                            Supports .xlsx, .xls, and .csv formats
                        </p>
                    </div>

                    {/* Preview Table */}
                    {parsedData.length > 0 && (
                        <div className={styles.previewSection}>
                            <div className={styles.previewHeader}>
                                <h4 className={styles.previewTitle}>
                                    Data Preview ({parsedData.length} records found)
                                </h4>
                            </div>
                            <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Principal</th>
                                            <th>Rate (%)</th>
                                            <th>Tenure (M)</th>
                                            <th>Start Date</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedData.slice(0, 10).map((row, idx) => {
                                            const name = row.creditor_name || row.debtor_name || row.name || row.full_name || 'N/A';
                                            const email = row.email || row.email_address || '—';
                                            const principal = row.principal || row.amount || '0';
                                            const rate = row.interest_rate || row.rate || '0';
                                            const tenure = row.tenure_months || row.tenure || row.tenor || '0';
                                            const date = row.start_date || row.date || '—';
                                            const status = row.status || (importType === 'placements' ? 'active' : 'performing');

                                            return (
                                                <tr key={idx}>
                                                    <td>{idx + 1}</td>
                                                    <td style={{ fontWeight: 600 }}>{name}</td>
                                                    <td>{email}</td>
                                                    <td>${Number(principal).toLocaleString()}</td>
                                                    <td>{rate}%</td>
                                                    <td>{tenure} mos</td>
                                                    <td>{String(date)}</td>
                                                    <td>
                                                        <span className={styles.badgeSuccess}>
                                                            {String(status)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {parsedData.length > 10 && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'right' }}>
                                    Showing first 10 of {parsedData.length} rows...
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <button
                        type="button"
                        onClick={handleClose}
                        className={styles.cancelBtn}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleImportSubmit}
                        className={styles.submitBtn}
                        disabled={loading || parsedData.length === 0 || !!successMsg}
                    >
                        {loading && <MStreetLoader size={18} color="#ffffff" />}
                        {loading ? 'Importing Data...' : `Confirm & Import ${parsedData.length} Records`}
                    </button>
                </div>
            </div>
        </div>
    );
}
