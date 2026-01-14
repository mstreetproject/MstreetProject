"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestUserPage() {
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        phone: "",
        address: "",
        password_hash: "mock_hash_for_test",
        is_creditor: false,
        is_debtor: false,
        is_internal: true,
    });

    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        const { error } = await supabase
            .from("users")
            .insert([formData]);

        if (error) {
            setStatus({ type: "error", message: error.message });
        } else {
            setStatus({ type: "success", message: "User created successfully!" });
            setFormData({
                full_name: "",
                email: "",
                phone: "",
                address: "",
                password_hash: "mock_hash_for_test",
                is_creditor: false,
                is_debtor: false,
                is_internal: true,
            });
        }
        setLoading(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>Test User Creation</h1>
                <p style={styles.subtitle}>Verify your custom `users` table</p>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Full Name</label>
                        <input
                            style={styles.input}
                            name="full_name"
                            value={formData.full_name}
                            onChange={handleChange}
                            placeholder="John Doe"
                            required
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Email Address</label>
                        <input
                            style={styles.input}
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="john@example.com"
                            required
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Phone</label>
                        <input
                            style={styles.input}
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="+234..."
                        />
                    </div>

                    <div style={styles.checkboxGroup}>
                        <label style={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                name="is_creditor"
                                checked={formData.is_creditor}
                                onChange={handleChange}
                            />
                            Creditor
                        </label>
                        <label style={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                name="is_debtor"
                                checked={formData.is_debtor}
                                onChange={handleChange}
                            />
                            Debtor
                        </label>
                        <label style={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                name="is_internal"
                                checked={formData.is_internal}
                                onChange={handleChange}
                            />
                            Internal Staff
                        </label>
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
                        {loading ? "Creating..." : "Create User"}
                    </button>
                </form>

                {status && (
                    <div
                        style={{
                            ...styles.status,
                            backgroundColor: status.type === "success" ? "#0a5d2e" : "#5d0a0a",
                            borderColor: status.type === "success" ? "#B8DB0F" : "#ff4d4d",
                        }}
                    >
                        {status.message}
                    </div>
                )}
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
        fontFamily: "system-ui, sans-serif",
        padding: "20px",
        color: "white",
    },
    card: {
        background: "rgba(255, 255, 255, 0.05)",
        backdropFilter: "blur(10px)",
        borderRadius: "20px",
        padding: "40px",
        width: "100%",
        maxWidth: "500px",
        border: "1px solid rgba(2, 179, 255, 0.2)",
    },
    title: {
        fontSize: "2rem",
        margin: "0 0 8px 0",
        color: "#02B3FF",
    },
    subtitle: {
        color: "#94a3b8",
        marginBottom: "32px",
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: "20px",
    },
    inputGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    label: {
        fontSize: "0.9rem",
        fontWeight: "bold",
        color: "#B8DB0F",
    },
    input: {
        padding: "12px",
        borderRadius: "8px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        background: "rgba(255, 255, 255, 0.05)",
        color: "white",
        fontSize: "1rem",
    },
    checkboxGroup: {
        display: "flex",
        gap: "16px",
        margin: "10px 0",
        flexWrap: "wrap",
    },
    checkboxLabel: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "0.9rem",
        cursor: "pointer",
    },
    button: {
        padding: "14px",
        borderRadius: "8px",
        border: "none",
        background: "linear-gradient(135deg, #02B3FF, #B8DB0F)",
        color: "#070757",
        fontWeight: "bold",
        fontSize: "1rem",
        transition: "transform 0.1s",
    },
    status: {
        marginTop: "24px",
        padding: "16px",
        borderRadius: "8px",
        border: "1px solid",
        fontSize: "0.9rem",
    }
};
