"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface TestRecord {
    id: number;
    name: string;
    created_at: string;
}

export default function TestSupabase() {
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("");
    const [data, setData] = useState<TestRecord[]>([]);

    useEffect(() => {
        testConnection();
    }, []);

    async function testConnection() {
        try {
            // Try to fetch from the test_connection table
            const { data, error } = await supabase
                .from("test_connection")
                .select("*")
                .limit(10);

            if (error) {
                // If table doesn't exist, that's expected - check if we can connect at all
                if (error.code === "PGRST116" || error.message.includes("does not exist")) {
                    setStatus("error");
                    setMessage("Connection works, but the 'test_connection' table doesn't exist. Create it in Supabase!");
                } else {
                    setStatus("error");
                    setMessage(`Error: ${error.message}`);
                }
                return;
            }

            setStatus("success");
            setMessage(`Connected successfully! Found ${data.length} record(s).`);
            setData(data || []);
        } catch (err) {
            setStatus("error");
            setMessage(`Connection failed: ${err}`);
        }
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>🔌 Supabase Connection Test</h1>

                <div style={{
                    ...styles.statusBox,
                    background: status === "loading" ? "#3b82f620" :
                        status === "success" ? `${brandColors.lime}20` :
                            "#ef444420",
                    borderColor: status === "loading" ? "#3b82f6" :
                        status === "success" ? brandColors.lime :
                            "#ef4444",
                }}>
                    <div style={styles.statusHeader}>
                        <span style={styles.statusIcon}>
                            {status === "loading" ? "⏳" : status === "success" ? "✅" : "❌"}
                        </span>
                        <span style={{
                            ...styles.statusText,
                            color: status === "loading" ? "#3b82f6" :
                                status === "success" ? brandColors.lime :
                                    "#ef4444",
                        }}>
                            {status === "loading" ? "Testing connection..." :
                                status === "success" ? "Connected!" :
                                    "Connection Issue"}
                        </span>
                    </div>
                    <p style={styles.message}>{message}</p>
                </div>

                {status === "success" && data.length > 0 && (
                    <div style={styles.dataSection}>
                        <h2 style={styles.sectionTitle}>Records Found:</h2>
                        <div style={styles.dataList}>
                            {data.map((record) => (
                                <div key={record.id} style={styles.dataItem}>
                                    <span style={styles.dataId}>#{record.id}</span>
                                    <span style={styles.dataName}>{record.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {status === "error" && (
                    <div style={styles.helpSection}>
                        <h2 style={styles.sectionTitle}>📋 Quick Setup</h2>
                        <p style={styles.helpText}>
                            Create this table in your Supabase SQL Editor:
                        </p>
                        <pre style={styles.sqlCode}>
                            {`CREATE TABLE test_connection (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO test_connection (name)
VALUES ('Hello from Supabase!');`}
                        </pre>
                    </div>
                )}

                <div style={styles.buttonRow}>
                    <button style={styles.retryButton} onClick={testConnection}>
                        🔄 Retry Connection
                    </button>
                    <Link href="/" style={styles.link}>
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}

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
        fontSize: "2rem",
        margin: "0 0 24px 0",
        color: "#fff",
    },
    statusBox: {
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "24px",
        border: "1px solid",
    },
    statusHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        marginBottom: "8px",
    },
    statusIcon: {
        fontSize: "1.5rem",
    },
    statusText: {
        fontSize: "1.2rem",
        fontWeight: "600",
    },
    message: {
        color: "#94a3b8",
        margin: 0,
        fontSize: "0.95rem",
    },
    dataSection: {
        background: `${brandColors.lime}10`,
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "24px",
        textAlign: "left",
    },
    sectionTitle: {
        fontSize: "1rem",
        color: brandColors.skyline,
        margin: "0 0 12px 0",
    },
    dataList: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    dataItem: {
        display: "flex",
        gap: "12px",
        padding: "10px 14px",
        background: "rgba(0,0,0,0.2)",
        borderRadius: "8px",
    },
    dataId: {
        color: brandColors.skyline,
        fontFamily: "monospace",
    },
    dataName: {
        color: "#fff",
    },
    helpSection: {
        background: `${brandColors.skyline}10`,
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "24px",
        textAlign: "left",
    },
    helpText: {
        color: "#cbd5e1",
        margin: "0 0 12px 0",
    },
    sqlCode: {
        background: brandColors.navy,
        borderRadius: "8px",
        padding: "16px",
        margin: 0,
        color: brandColors.lime,
        fontSize: "0.85rem",
        fontFamily: "monospace",
        whiteSpace: "pre-wrap",
        textAlign: "left",
        border: `1px solid ${brandColors.skyline}30`,
    },
    buttonRow: {
        display: "flex",
        gap: "12px",
        justifyContent: "center",
        flexWrap: "wrap",
    },
    retryButton: {
        padding: "12px 24px",
        fontSize: "1rem",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        background: `linear-gradient(135deg, ${brandColors.skyline}, ${brandColors.lime})`,
        color: brandColors.navy,
        fontWeight: "600",
    },
    link: {
        display: "inline-block",
        color: brandColors.skyline,
        textDecoration: "none",
        padding: "12px 24px",
        background: `${brandColors.skyline}15`,
        borderRadius: "8px",
        border: `1px solid ${brandColors.skyline}30`,
    },
};
