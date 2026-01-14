"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        const { error } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
        });

        if (error) {
            setStatus({ type: "error", message: error.message });
            setLoading(false);
        } else {
            setStatus({ type: "success", message: "Login successful! Redirecting..." });
            // Redirect to dashboard or profile
            router.push("/");
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.logoContainer}>
                    <img src="/secondary logo2.png" alt="MStreet Financial" style={styles.logo} />
                </div>
                <div style={styles.header}>
                    <h1 style={styles.title}>Welcome Back</h1>
                    <p style={styles.subtitle}>Log in to your MStreet account</p>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Email Address</label>
                        <input
                            style={styles.input}
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="name@company.com"
                            required
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <label style={styles.label}>Password</label>
                            <Link href="/forgot-password" style={styles.forgotLink}>Forgot Password?</Link>
                        </div>
                        <input
                            style={styles.input}
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
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
                        {loading ? "Logging in..." : "Log In"}
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
                    <p>Don't have an account? <Link href="/signup" style={styles.link}>Sign Up</Link></p>
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
        padding: "40px 50px",
        width: "100%",
        maxWidth: "550px",
        border: "1px solid rgba(2, 179, 255, 0.2)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
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
    header: {
        textAlign: "center",
        marginBottom: "32px",
    },
    title: {
        fontSize: "2rem",
        fontWeight: "800",
        margin: "0 0 8px 0",
        background: "linear-gradient(135deg, #02B3FF, #B8DB0F)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        letterSpacing: "-0.025em",
    },
    subtitle: {
        color: "#94a3b8",
        fontSize: "1.1rem",
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
        fontWeight: "600",
        color: "#e2e8f0",
    },
    forgotLink: {
        fontSize: "0.75rem",
        color: "#02B3FF",
        textDecoration: "none",
    },
    input: {
        padding: "14px 16px",
        borderRadius: "12px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        background: "rgba(255, 255, 255, 0.05)",
        color: "white",
        fontSize: "1rem",
        outline: "none",
    },
    button: {
        padding: "16px",
        borderRadius: "12px",
        border: "none",
        background: "linear-gradient(135deg, #02B3FF, #B8DB0F)",
        color: "#070757",
        fontWeight: "700",
        fontSize: "1rem",
        marginTop: "12px",
    },
    status: {
        marginTop: "32px",
        padding: "16px",
        borderRadius: "12px",
        border: "1px solid",
        fontSize: "0.875rem",
        textAlign: "center",
    },
    footer: {
        marginTop: "32px",
        textAlign: "center",
        color: "#94a3b8",
        fontSize: "0.95rem",
    },
    link: {
        color: "#02B3FF",
        textDecoration: "none",
        fontWeight: "600",
    }
};
