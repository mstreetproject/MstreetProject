"use client";

import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const [count, setCount] = useState(0);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>MStreet Financial</h1>
        <p style={styles.subtitle}>Your Next.js + React setup is working!</p>

        <div style={styles.testSection}>
          <h2 style={styles.sectionTitle}>React State Test</h2>
          <p style={styles.counter}>Count: <span style={styles.countValue}>{count}</span></p>
          <div style={styles.buttonGroup}>
            <button
              style={styles.button}
              onClick={() => setCount(count - 1)}
            >
              − Decrease
            </button>
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={() => setCount(count + 1)}
            >
              + Increase
            </button>
          </div>
        </div>

        <div style={styles.infoBox}>
          <p>✅ Next.js App Router is configured</p>
          <p>✅ React is rendering components</p>
          <p>✅ useState hook is functional</p>
        </div>

        <Link href="/about" style={styles.link}>
          Go to About Page →
        </Link>

        <p style={styles.hint}>
          Edit <code style={styles.code}>app/page.tsx</code> to customize this page
        </p>
      </div>
    </div>
  );
}

// MStreet Financial Brand Tokens
const brandColors = {
  navy: "#070757",
  skyline: "#02B3FF",
  lime: "#B8DB0F",
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: `linear-gradient(135deg, ${brandColors.navy} 0%, #0a0a6b 50%, #101080 100%)`,
    fontFamily: "'Clash Grotesk', system-ui, -apple-system, sans-serif",
    padding: "20px",
  },
  card: {
    background: "rgba(255, 255, 255, 0.05)",
    backdropFilter: "blur(10px)",
    borderRadius: "20px",
    padding: "40px",
    textAlign: "center",
    border: `1px solid ${brandColors.skyline}30`,
    maxWidth: "500px",
    width: "100%",
    boxShadow: `0 0 40px ${brandColors.skyline}15`,
  },
  title: {
    fontSize: "2.5rem",
    margin: "0 0 10px 0",
    color: "#fff",
    background: `linear-gradient(135deg, ${brandColors.skyline}, ${brandColors.lime})`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  subtitle: {
    fontSize: "1.1rem",
    color: "#94a3b8",
    margin: "0 0 30px 0",
  },
  testSection: {
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
    border: `1px solid ${brandColors.skyline}20`,
  },
  sectionTitle: {
    fontSize: "1rem",
    color: brandColors.skyline,
    margin: "0 0 16px 0",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  counter: {
    fontSize: "1.5rem",
    color: "#fff",
    margin: "0 0 20px 0",
  },
  countValue: {
    color: brandColors.lime,
    fontWeight: "bold",
    fontSize: "2rem",
  },
  buttonGroup: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
  },
  button: {
    padding: "12px 24px",
    fontSize: "1rem",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    background: "rgba(255, 255, 255, 0.1)",
    color: "#fff",
    transition: "all 0.2s ease",
  },
  primaryButton: {
    background: `linear-gradient(135deg, ${brandColors.skyline}, ${brandColors.lime})`,
    color: brandColors.navy,
    fontWeight: "600",
  },
  infoBox: {
    textAlign: "left",
    background: `${brandColors.lime}15`,
    borderRadius: "12px",
    padding: "16px 20px",
    marginBottom: "24px",
    color: brandColors.lime,
    fontSize: "0.95rem",
    lineHeight: "1.8",
    border: `1px solid ${brandColors.lime}30`,
  },
  link: {
    display: "inline-block",
    color: brandColors.skyline,
    textDecoration: "none",
    fontSize: "1rem",
    padding: "12px 24px",
    background: `${brandColors.skyline}15`,
    borderRadius: "8px",
    marginBottom: "20px",
    border: `1px solid ${brandColors.skyline}30`,
    transition: "all 0.2s ease",
  },
  hint: {
    color: "#64748b",
    fontSize: "0.9rem",
  },
  code: {
    background: "rgba(255, 255, 255, 0.1)",
    padding: "4px 8px",
    borderRadius: "4px",
    fontFamily: "monospace",
  },
};
