"use client";

import Link from "next/link";

export default function About() {
    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>About Page</h1>
                <p style={styles.subtitle}>This is your new /about route!</p>

                <div style={styles.infoBox}>
                    <h2 style={styles.sectionTitle}>How This Works</h2>
                    <p style={styles.text}>
                        This page was created by adding a folder named <code style={styles.code}>about</code> inside
                        the <code style={styles.code}>app</code> directory, with a <code style={styles.code}>page.tsx</code> file inside it.
                    </p>
                    <div style={styles.structure}>
                        <pre style={styles.pre}>
                            {`app/
├── page.tsx        → /
└── about/
    └── page.tsx    → /about  ← You are here!`}
                        </pre>
                    </div>
                </div>

                <div style={styles.brandSection}>
                    <h2 style={styles.sectionTitle}>Brand Colors</h2>
                    <div style={styles.colorRow}>
                        <div style={{ ...styles.colorBox, background: brandColors.navy }}>
                            <span style={styles.colorLabel}>Navy</span>
                            <span style={styles.colorHex}>#070757</span>
                        </div>
                        <div style={{ ...styles.colorBox, background: brandColors.skyline }}>
                            <span style={{ ...styles.colorLabel, color: brandColors.navy }}>Skyline</span>
                            <span style={{ ...styles.colorHex, color: brandColors.navy }}>#02B3FF</span>
                        </div>
                        <div style={{ ...styles.colorBox, background: brandColors.lime }}>
                            <span style={{ ...styles.colorLabel, color: brandColors.navy }}>Lime</span>
                            <span style={{ ...styles.colorHex, color: brandColors.navy }}>#B8DB0F</span>
                        </div>
                    </div>
                </div>

                <Link href="/" style={styles.link}>
                    ← Back to Home
                </Link>
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
        maxWidth: "600px",
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
    infoBox: {
        textAlign: "left",
        background: `${brandColors.skyline}10`,
        borderRadius: "12px",
        padding: "20px 24px",
        marginBottom: "24px",
        border: `1px solid ${brandColors.skyline}30`,
    },
    sectionTitle: {
        fontSize: "1.1rem",
        color: brandColors.skyline,
        margin: "0 0 12px 0",
    },
    text: {
        color: "#cbd5e1",
        fontSize: "0.95rem",
        lineHeight: "1.7",
        margin: "0 0 16px 0",
    },
    structure: {
        background: `${brandColors.navy}`,
        borderRadius: "8px",
        padding: "16px",
        border: `1px solid ${brandColors.skyline}20`,
    },
    pre: {
        margin: 0,
        color: brandColors.lime,
        fontSize: "0.9rem",
        fontFamily: "monospace",
        lineHeight: "1.6",
    },
    code: {
        background: "rgba(255, 255, 255, 0.15)",
        padding: "2px 6px",
        borderRadius: "4px",
        fontFamily: "monospace",
        fontSize: "0.9rem",
    },
    brandSection: {
        background: `${brandColors.lime}10`,
        borderRadius: "12px",
        padding: "20px 24px",
        marginBottom: "24px",
        border: `1px solid ${brandColors.lime}30`,
    },
    colorRow: {
        display: "flex",
        gap: "12px",
        justifyContent: "center",
        flexWrap: "wrap",
    },
    colorBox: {
        width: "100px",
        height: "80px",
        borderRadius: "10px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
    },
    colorLabel: {
        fontSize: "0.85rem",
        fontWeight: "600",
        color: "#fff",
    },
    colorHex: {
        fontSize: "0.75rem",
        color: "#fff",
        opacity: 0.8,
    },
    link: {
        display: "inline-block",
        color: brandColors.skyline,
        textDecoration: "none",
        fontSize: "1rem",
        padding: "12px 24px",
        background: `${brandColors.skyline}15`,
        borderRadius: "8px",
        border: `1px solid ${brandColors.skyline}30`,
        transition: "all 0.2s ease",
    },
};
