"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div style={styles.container}>
      <div style={styles.heroSection}>
        <div style={styles.logoContainer}>
          <img src="/secondary logo2.png" alt="MStreet Financial" style={styles.logo} />
        </div>

        <h1 style={styles.title}>Welcome to MStreets Finance</h1>
        <p style={styles.tagline}>
          Secure Financial Asset & Credit Management Platform
        </p>

        <p style={styles.description}>
          Helping people and businesses grow by giving
          them the financial tools they need to grow.</p>

        <div style={styles.buttonGroup}>
          <Link href="/login" style={styles.primaryButton}>
            Sign In
          </Link>
          <Link href="/signup" style={styles.secondaryButton}>
            Create Account
          </Link>
        </div>

        <div style={styles.features}>
          <div style={styles.feature}>
            <div style={styles.featureIcon}>🔒</div>
            <h3 style={styles.featureTitle}>Accessibility</h3>
            <p style={styles.featureText}>Flexibility</p>
          </div>
          <div style={styles.feature}>
            <div style={styles.featureIcon}>📊</div>
            <h3 style={styles.featureTitle}>Real-Time Analytics</h3>
            <p style={styles.featureText}>Track credits, loans, and financial operations</p>
          </div>
          <div style={styles.feature}>
            <div style={styles.featureIcon}>⚡</div>
            <h3 style={styles.featureTitle}>Fast & Reliable</h3>
            <p style={styles.featureText}>Built on modern cloud infrastructure</p>
          </div>
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
  heroSection: {
    textAlign: "center",
    maxWidth: "900px",
    width: "100%",
  },
  logoContainer: {
    marginBottom: "32px",
  },
  logo: {
    height: "80px",
    width: "auto",
    filter: "brightness(1.2)",
  },
  title: {
    fontSize: "3rem",
    fontWeight: "800",
    margin: "0 0 16px 0",
    background: "linear-gradient(135deg, #02B3FF, #B8DB0F)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-0.02em",
    lineHeight: "1.2",
  },
  tagline: {
    fontSize: "1.5rem",
    color: "#cbd5e1",
    margin: "0 0 24px 0",
    fontWeight: "500",
  },
  description: {
    fontSize: "1.1rem",
    color: "#94a3b8",
    lineHeight: "1.7",
    margin: "0 0 48px 0",
    maxWidth: "700px",
    marginLeft: "auto",
    marginRight: "auto",
  },
  buttonGroup: {
    display: "flex",
    gap: "16px",
    justifyContent: "center",
    marginBottom: "64px",
    flexWrap: "wrap",
  },
  primaryButton: {
    padding: "16px 40px",
    fontSize: "1.1rem",
    fontWeight: "700",
    borderRadius: "12px",
    textDecoration: "none",
    background: "linear-gradient(135deg, #02B3FF, #B8DB0F)",
    color: "#070757",
    transition: "transform 0.2s, box-shadow 0.2s",
    display: "inline-block",
    boxShadow: "0 4px 20px rgba(2, 179, 255, 0.3)",
  },
  secondaryButton: {
    padding: "16px 40px",
    fontSize: "1.1rem",
    fontWeight: "700",
    borderRadius: "12px",
    textDecoration: "none",
    background: "rgba(255, 255, 255, 0.05)",
    color: "#fff",
    border: "2px solid rgba(2, 179, 255, 0.3)",
    transition: "all 0.2s",
    display: "inline-block",
  },
  features: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "24px",
    marginTop: "48px",
  },
  feature: {
    background: "rgba(255, 255, 255, 0.03)",
    backdropFilter: "blur(10px)",
    borderRadius: "16px",
    padding: "32px 24px",
    border: "1px solid rgba(2, 179, 255, 0.15)",
  },
  featureIcon: {
    fontSize: "2.5rem",
    marginBottom: "16px",
  },
  featureTitle: {
    fontSize: "1.2rem",
    fontWeight: "700",
    color: "#fff",
    margin: "0 0 8px 0",
  },
  featureText: {
    fontSize: "0.95rem",
    color: "#94a3b8",
    margin: 0,
    lineHeight: "1.6",
  },
};
