"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import MStreetLoader from "@/components/ui/MStreetLoader";

import { Eye, EyeOff } from "lucide-react";

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [showPassword, setShowPassword] = useState(false);
    const [sessionLoading, setSessionLoading] = useState(true);
    const [existingSession, setExistingSession] = useState<any>(null);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const supabase = createClient();
        
        // Check for session expired message
        if (searchParams.get('message') === 'session_expired') {
            setStatus({ type: "error", message: "Your session has expired due to inactivity. Please log in again." });
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setExistingSession(session);
            }
            setSessionLoading(false);
        });
    }, [searchParams]);

    const handleGoToDashboard = () => {
        router.push('/portal');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
        });

        if (error) {
            setStatus({ type: "error", message: error.message });
            setLoading(false);
        } else {
            setStatus({ type: "success", message: "Login successful! Redirecting..." });

            if (data.user) {
                try {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('is_internal, is_creditor, is_debtor')
                        .eq('id', data.user.id)
                        .single();

                    const params = new URLSearchParams(window.location.search);
                    const redirectTo = params.get('redirectTo');

                    if (redirectTo) {
                        window.location.href = redirectTo;
                        return;
                    }

                    const roleCount = [
                        userData?.is_internal,
                        userData?.is_creditor,
                        userData?.is_debtor
                    ].filter(Boolean).length;

                    if (roleCount > 1) {
                        window.location.href = '/portal';
                    } else if (userData?.is_internal) {
                        window.location.href = '/dashboard/internal';
                    } else if (userData?.is_creditor) {
                        window.location.href = '/dashboard/creditor';
                    } else if (userData?.is_debtor) {
                        window.location.href = '/dashboard/debtor';
                    } else {
                        window.location.href = '/portal';
                    }
                } catch (err) {
                    console.error("Error determining redirect route:", err);
                    window.location.href = '/portal';
                }
            } else {
                window.location.href = '/portal';
            }
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
                    <p style={styles.subtitle}>Log in to your MStreets account</p>
                </div>

                {status && (
                    <div
                        style={{
                            ...styles.status,
                            marginBottom: '24px',
                            padding: '16px 20px',
                            background: status.type === "success" ? "rgba(184, 219, 15, 0.15)" : "rgba(255, 77, 77, 0.15)",
                            borderColor: status.type === "success" ? "#B8DB0F" : "#ff4d4d",
                            color: status.type === "success" ? "#fff" : "#ff9494",
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            borderRadius: '12px',
                            fontSize: '0.9rem',
                            textAlign: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            fontWeight: '600',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }}
                    >
                        {status.type === 'error' ? '⚠️' : '✅'} {status.message}
                    </div>
                )}

                {existingSession && !sessionLoading && (
                    <div style={{
                        marginBottom: '32px',
                        padding: '20px',
                        background: 'rgba(2, 179, 255, 0.1)',
                        border: '1px solid rgba(2, 179, 255, 0.3)',
                        borderRadius: '16px',
                        textAlign: 'center'
                    }}>
                        <p style={{ color: '#e2e8f0', marginBottom: '16px', fontSize: '0.95rem' }}>
                            You are already logged in as <strong style={{ color: '#02B3FF' }}>{existingSession.user.email}</strong>
                        </p>
                        <button
                            onClick={handleGoToDashboard}
                            style={{
                                ...styles.button,
                                marginTop: 0,
                                width: '100%'
                            }}
                        >
                            Go to Dashboard
                        </button>
                        <div style={{ marginTop: '12px' }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>or sign in with another account below</span>
                        </div>
                    </div>
                )}

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
                        <div style={{ position: 'relative' }}>
                            <input
                                style={{ ...styles.input, width: '100%', paddingRight: '45px' }}
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '4px'
                                }}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
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
                        {loading ? "Logging in..." : "Log In"}
                    </button>
                </form>

                <div style={styles.footer}>
                    <p>Don't have an account? <Link href="/signup" style={styles.link}>Sign Up</Link></p>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div style={styles.container}><MStreetLoader size={50} color="#02B3FF" /></div>}>
            <LoginContent />
        </Suspense>
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
