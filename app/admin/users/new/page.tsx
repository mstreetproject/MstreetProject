"use client";

import { useState } from "react";
import { createStaffUser } from "@/lib/actions/auth";
import Link from "next/link";

export default function AdminNewUserPage() {
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        role: "viewer",
        is_internal: true,
        is_creditor: false,
        is_debtor: false,
    });

    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        const result = await createStaffUser(formData);

        if (result.success) {
            setStatus({
                type: "success",
                message: `Staff member created! They can now use the Forgot Password flow to set their password.`
            });
            setFormData({
                full_name: "",
                email: "",
                role: "viewer",
                is_internal: true,
                is_creditor: false,
                is_debtor: false,
            });
        } else {
            setStatus({ type: "error", message: result.error || "Failed to create staff member." });
        }
        setLoading(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
        setFormData((prev) => ({ ...prev, [name]: val }));
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h1 style={styles.title}>Onboard New Staff</h1>
                    <p style={styles.subtitle}>Admin Console: Internal User Management</p>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.row}>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Full Name</label>
                            <input
                                style={styles.input}
                                name="full_name"
                                value={formData.full_name}
                                onChange={handleChange}
                                placeholder="Staff Member Name"
                                required
                            />
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Email Address</label>
                            <input
                                style={styles.input}
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="staff@mstreet.com"
                                required
                            />
                        </div>
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Organizational Role</label>
                        <select
                            style={styles.select}
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                        >
                            <option value="super_admin">Super Admin</option>
                            <option value="finance_manager">Finance Manager</option>
                            <option value="ops_officer">Ops Officer</option>
                            <option value="risk_officer">Risk Officer</option>
                            <option value="viewer">Standard Viewer</option>
                        </select>
                    </div>

                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Access Flags</h3>
                        <div style={styles.checkboxGrid}>
                            <label style={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    name="is_internal"
                                    checked={formData.is_internal}
                                    onChange={handleChange}
                                />
                                Internal Staff Access
                            </label>
                            <label style={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    name="is_creditor"
                                    checked={formData.is_creditor}
                                    onChange={handleChange}
                                />
                                Creditor Permission
                            </label>
                            <label style={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    name="is_debtor"
                                    checked={formData.is_debtor}
                                    onChange={handleChange}
                                />
                                Debtor Permission
                            </label>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            ...styles.button,
                            opacity: loading ? 0.7 : 1,
                            cursor: loading ? "not-allowed" : "pointer"
                        }}
                    >
                        {loading ? "Processing..." : "Create Staff Account"}
                    </button>
                </form>

                {status && (
                    <div
                        style={{
                            ...styles.status,
                            backgroundColor: status.type === "success" ? "rgba(184, 219, 15, 0.1)" : "rgba(255, 77, 77, 0.1)",
                            borderColor: status.type === "success" ? "#B8DB0F" : "#ff4d4d",
                            color: status.type === "success" ? "#B8DB0F" : "#ff4d4d",
                        }}
                    >
                        {status.message}
                    </div>
                )}

                <div style={styles.footer}>
                    <Link href="/" style={styles.link}>Return to Dashboard</Link>
                </div>
            </div>
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#070757",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: "20px",
    },
    card: {
        background: "rgba(255, 255, 255, 0.03)",
        backdropFilter: "blur(12px)",
        borderRadius: "24px",
        padding: "48px",
        width: "100%",
        maxWidth: "600px",
        border: "1px solid rgba(2, 179, 255, 0.2)",
    },
    header: {
        marginBottom: "32px",
    },
    title: {
        fontSize: "1.75rem",
        fontWeight: "700",
        color: "#fff",
        margin: "0 0 8px 0",
    },
    subtitle: {
        color: "#02B3FF",
        fontSize: "0.9rem",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: "1px",
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: "24px",
    },
    row: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "20px",
    },
    inputGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    label: {
        fontSize: "0.875rem",
        fontWeight: "600",
        color: "#e2e8f0",
    },
    input: {
        padding: "12px 16px",
        borderRadius: "10px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        background: "rgba(255, 255, 255, 0.05)",
        color: "white",
        fontSize: "0.95rem",
    },
    select: {
        padding: "12px 16px",
        borderRadius: "10px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        background: "#101080",
        color: "white",
        fontSize: "0.95rem",
        cursor: "pointer",
    },
    section: {
        background: "rgba(255, 255, 255, 0.02)",
        padding: "20px",
        borderRadius: "16px",
        border: "1px solid rgba(255, 255, 255, 0.05)",
    },
    sectionTitle: {
        fontSize: "0.875rem",
        fontWeight: "700",
        color: "#B8DB0F",
        marginBottom: "16px",
        textTransform: "uppercase",
    },
    checkboxGrid: {
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "12px",
    },
    checkboxLabel: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "0.9rem",
        color: "#cbd5e1",
        cursor: "pointer",
    },
    button: {
        padding: "16px",
        borderRadius: "12px",
        border: "none",
        background: "linear-gradient(135deg, #02B3FF, #B8DB0F)",
        color: "#070757",
        fontWeight: "700",
        fontSize: "1rem",
        marginTop: "8px",
    },
    status: {
        marginTop: "24px",
        padding: "16px",
        borderRadius: "12px",
        border: "1px solid",
        textAlign: "center",
        fontSize: "0.9rem",
    },
    footer: {
        marginTop: "24px",
        textAlign: "center",
    },
    link: {
        color: "#94a3b8",
        textDecoration: "none",
        fontSize: "0.875rem",
    }
};
