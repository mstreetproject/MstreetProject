"use client";

import Link from "next/link";

export default function WelcomePage() {
    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.logoContainer}>
                    <img src="/mstreets-logo-transparent.png" alt="MStreet Financial" style={styles.logo} />
                </div>
                <div style={styles.iconContainer}>
                    <div style={styles.checkIcon}>✓</div>
                </div>
                <h1 style={styles.title}>Email Confirmed!</h1>
                <p style={styles.subtitle}>
                    Welcome to **MStreet Financial**. Your account has been successfully verified.
                </p>
                <div style={styles.infoBox}>
                    <p style={styles.infoText}>
                        You can now access your dashboard and complete your profile details.
                    </p>
                </div>
                <Link href="/login" style={styles.button}>
                    Continue to Login
                </Link>
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
        fontFamily: "Inter, sans-serif",
        padding: "20px",
    },
    card: {
        background: "rgba(255, 255, 255, 0.03)",
        backdropFilter: "blur(12px)",
        borderRadius: "32px",
        padding: "60px 40px",
        width: "100%",
        maxWidth: "480px",
        border: "1px solid rgba(2, 179, 255, 0.2)",
        textAlign: "center",
    },
    iconContainer: {
        width: "80px",
        height: "80px",
        background: "rgba(184, 219, 15, 0.1)",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 24px",
        border: "2px solid #B8DB0F",
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
    checkIcon: {
        fontSize: "40px",
        color: "#B8DB0F",
        fontWeight: "bold",
    },
    title: {
        fontSize: "2.5rem",
        fontWeight: "800",
        color: "#fff",
        marginBottom: "16px",
        letterSpacing: "-0.025em",
    },
    subtitle: {
        color: "#cbd5e1",
        fontSize: "1.1rem",
        lineHeight: "1.6",
        marginBottom: "32px",
    },
    infoBox: {
        background: "rgba(2, 179, 255, 0.05)",
        padding: "20px",
        borderRadius: "16px",
        border: "1px solid rgba(2, 179, 255, 0.1)",
        marginBottom: "40px",
    },
    infoText: {
        color: "#94a3b8",
        fontSize: "0.95rem",
        margin: 0,
    },
    button: {
        display: "block",
        padding: "18px",
        borderRadius: "16px",
        background: "linear-gradient(135deg, #02B3FF, #B8DB0F)",
        color: "#070757",
        fontWeight: "700",
        fontSize: "1.1rem",
        textDecoration: "none",
        transition: "transform 0.2s",
    },
};
