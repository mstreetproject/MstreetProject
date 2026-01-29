"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import MStreetLoader from "@/components/ui/MStreetLoader";

export default function SignUpPage() {
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        password: "",
    });

    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const router = useRouter();
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        // 1. Sign up user via Supabase Auth
        // Note: The trigger we added to the database will automatically 
        // create the row in our custom 'public.users' table with is_debtor = TRUE
        const { data, error } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    full_name: formData.full_name,
                },
                emailRedirectTo: `${window.location.origin}/dashboard/debtor`,
            },
        });

        if (error) {
            setStatus({ type: "error", message: error.message });
        } else if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
            setStatus({
                type: "error",
                message: "An account with this email already exists. Please log in or use forgot password."
            });
        } else {
            // SUCCESS
            setStatus({
                type: "success",
                message: "Sign up successful!"
            });

            // If we have a session (email confirmation off or auto-sign-in enabled), redirect immediately
            if (data.session) {
                // Double ensure the user is marked as a debtor locally if needed, 
                // but mainly just redirect.
                router.push("/dashboard/debtor");
                return;
            }

            // Otherwise show verification message
            setStatus({
                type: "success",
                message: "Sign up successful! Please check your email for a verification link."
            });
            setFormData({ full_name: "", email: "", password: "" });
        }
        setLoading(false);
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
                    <h1 style={styles.title}>Join MStreets</h1>
                    <p style={styles.subtitle}>Create your secure account today</p>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Full Name</label>
                        <input
                            style={styles.input}
                            name="full_name"
                            value={formData.full_name}
                            onChange={handleChange}
                            placeholder="Enter your full name"
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
                            placeholder="name@company.com"
                            required
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Password</label>
                        <input
                            style={styles.input}
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Create a strong password"
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            ...styles.button,
                            opacity: loading ? 0.7 : 1,
                            cursor: loading ? "not-allowed" : "pointer",
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        {loading && <MStreetLoader size={20} color="#070757" />}
                        {loading ? "Signing up..." : "Create Account"}
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
                    <p>Already have an account? <Link href="/login" style={styles.link}>Log In</Link></p>
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
        background: "linear-gradient(135deg, #070757 0%, #0a0a6b 100%)",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: "20px",
    },
    card: {
        background: "rgba(255, 255, 255, 0.03)",
        backdropFilter: "blur(12px)",
        borderRadius: "24px",
        padding: "40px 50px",
        width: "100%",
        maxWidth: "600px",
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
        fontSize: "1rem",
    },
    form: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "20px",
    },
    inputGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        gridColumn: "span 2",
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
        fontSize: "1rem",
        outline: "none",
        transition: "border-color 0.2s",
    },
    button: {
        padding: "14px",
        borderRadius: "10px",
        border: "none",
        background: "linear-gradient(135deg, #02B3FF, #B8DB0F)",
        color: "#070757",
        fontWeight: "700",
        fontSize: "1rem",
        marginTop: "8px",
        transition: "transform 0.1s, opacity 0.2s",
        gridColumn: "span 2",
    },
    status: {
        marginTop: "24px",
        padding: "14px",
        borderRadius: "10px",
        border: "1px solid",
        fontSize: "0.875rem",
        textAlign: "center",
        lineHeight: "1.5",
    },
    footer: {
        marginTop: "24px",
        textAlign: "center",
        color: "#94a3b8",
        fontSize: "0.875rem",
    },
    link: {
        color: "#02B3FF",
        textDecoration: "none",
        fontWeight: "600",
    }
};
