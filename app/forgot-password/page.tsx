"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        // Use Supabase native reset flow to leverage custom SMTP and templates
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
            setStatus({ type: "error", message: error.message });
        } else {
            setStatus({
                type: "success",
                message: "A reset link has been sent to your email! Please check your inbox (and spam folder)."
            });
        }
        setLoading(false);
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.logoContainer}>
                    <img src="/secondary logo2.png" alt="MStreet Financial" style={styles.logo} />
                </div>
                <h1 style={styles.title}>Forgot Password?</h1>
                <p style={styles.subtitle}>Enter your email to receive a reset link</p>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Email Address</label>
                        <input
                            style={styles.input}
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            required
                        />
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
                        {loading ? "Processing..." : "Send Reset Link"}
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
                    <Link href="/login" style={styles.link}>← Back to Log In</Link>
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
        padding: "40px",
        width: "100%",
        maxWidth: "480px",
        border: "1px solid rgba(2, 179, 255, 0.2)",
    },
    logoContainer: {
        textAlign: "center",
        marginBottom: "24px",
    },
    logo: {
        height: "70px",
        width: "auto",
        filter: "brightness(1.1)",
    },
    title: {
        fontSize: "1.75rem",
        fontWeight: "700",
        color: "#fff",
        margin: "0 0 8px 0",
    },
    subtitle: {
        color: "#94a3b8",
        fontSize: "0.95rem",
        marginBottom: "32px",
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: "24px",
    },
    inputGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    label: {
        fontSize: "0.875rem",
        color: "#e2e8f0",
    },
    input: {
        padding: "12px 16px",
        borderRadius: "8px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        background: "rgba(255, 255, 255, 0.05)",
        color: "white",
    },
    button: {
        padding: "14px",
        borderRadius: "8px",
        border: "none",
        background: "linear-gradient(135deg, #02B3FF, #B8DB0F)",
        color: "#070757",
        fontWeight: "600",
    },
    status: {
        marginTop: "24px",
        padding: "16px",
        borderRadius: "8px",
        border: "1px solid",
    },
    demoBox: {
        marginTop: "16px",
        wordBreak: "break-all",
        textAlign: "left",
    },
    demoLink: {
        fontSize: "0.8rem",
        color: "#02B3FF",
        textDecoration: "underline",
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
