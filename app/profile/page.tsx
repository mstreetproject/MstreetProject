"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [profileData, setProfileData] = useState({
        full_name: "",
        phone: "",
        address: "",
        is_creditor: false,
        is_debtor: false,
    });

    useEffect(() => {
        async function loadProfile() {
            // 1. Get current authenticated user
            const { data: { user: authUser } } = await supabase.auth.getUser();

            if (!authUser) {
                router.push("/login");
                return;
            }

            setUser(authUser);

            // 2. Load custom profile data from 'public.users'
            const { data, error } = await supabase
                .from("users")
                .select("*")
                .eq("id", authUser.id)
                .single();

            if (data) {
                setProfileData({
                    full_name: data.full_name || "",
                    phone: data.phone || "",
                    address: data.address || "",
                    is_creditor: data.is_creditor || false,
                    is_debtor: data.is_debtor || false,
                });
            }
            setLoading(false);
        }
        loadProfile();
    }, [router]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus(null);

        const { error } = await supabase
            .from("users")
            .update(profileData)
            .eq("id", user.id);

        if (error) {
            setStatus({ type: "error", message: error.message });
        } else {
            setStatus({ type: "success", message: "Profile updated successfully!" });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
        setProfileData((prev) => ({ ...prev, [name]: val }));
    };

    if (loading) return <div style={styles.loading}>Loading your profile...</div>;

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>Your Profile</h1>
                <p style={styles.subtitle}>{user.email}</p>

                <form onSubmit={handleUpdate} style={styles.form}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Full Name</label>
                        <input
                            style={styles.input}
                            name="full_name"
                            value={profileData.full_name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Phone Number</label>
                        <input
                            style={styles.input}
                            name="phone"
                            value={profileData.phone}
                            onChange={handleChange}
                            placeholder="+1 (555) 000-0000"
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Business Address</label>
                        <textarea
                            style={styles.textarea}
                            name="address"
                            value={profileData.address}
                            onChange={handleChange}
                            placeholder="Enter your street address"
                        />
                    </div>

                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Account Type</h3>
                        <div style={styles.checkboxGroup}>
                            <label style={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    name="is_creditor"
                                    checked={profileData.is_creditor}
                                    onChange={handleChange}
                                />
                                I am a Creditor
                            </label>
                            <label style={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    name="is_debtor"
                                    checked={profileData.is_debtor}
                                    onChange={handleChange}
                                />
                                I am a Debtor
                            </label>
                        </div>
                    </div>

                    <button type="submit" style={styles.button}>Save Changes</button>
                </form>

                {status && (
                    <div style={{
                        ...styles.status,
                        color: status.type === "success" ? "#B8DB0F" : "#ff4d4d",
                        borderColor: status.type === "success" ? "#B8DB0F" : "#ff4d4d"
                    }}>
                        {status.message}
                    </div>
                )}

                <div style={styles.footer}>
                    <button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} style={styles.logoutBtn}>
                        Log Out
                    </button>
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
        fontFamily: "Inter, sans-serif",
        padding: "20px",
    },
    card: {
        background: "rgba(255, 255, 255, 0.03)",
        backdropFilter: "blur(12px)",
        borderRadius: "24px",
        padding: "40px",
        width: "100%",
        maxWidth: "500px",
        border: "1px solid rgba(2, 179, 255, 0.2)",
    },
    title: { fontSize: "1.75rem", fontWeight: "700", color: "#fff", marginBottom: "4px" },
    subtitle: { color: "#02B3FF", fontSize: "0.9rem", marginBottom: "32px" },
    form: { display: "flex", flexDirection: "column", gap: "20px" },
    inputGroup: { display: "flex", flexDirection: "column", gap: "8px" },
    label: { fontSize: "0.875rem", fontWeight: "600", color: "#e2e8f0" },
    input: { padding: "12px 16px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(255, 255, 255, 0.05)", color: "white" },
    textarea: { padding: "12px 16px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(255, 255, 255, 0.05)", color: "white", minHeight: "100px", resize: "none" },
    section: { marginTop: "10px" },
    sectionTitle: { fontSize: "0.8rem", textTransform: "uppercase", color: "#94a3b8", marginBottom: "12px", letterSpacing: "1px" },
    checkboxGroup: { display: "flex", flexDirection: "column", gap: "10px" },
    checkboxLabel: { display: "flex", alignItems: "center", gap: "10px", color: "#cbd5e1", fontSize: "0.9rem", cursor: "pointer" },
    button: { padding: "14px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #02B3FF, #B8DB0F)", color: "#070757", fontWeight: "700", fontSize: "1rem", cursor: "pointer", marginTop: "10px" },
    status: { marginTop: "20px", padding: "12px", borderRadius: "10px", border: "1px solid", textAlign: "center", fontSize: "0.875rem" },
    footer: { marginTop: "32px", textAlign: "center", borderTop: "1px solid rgba(255, 255, 255, 0.1)", paddingTop: "24px" },
    logoutBtn: { background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "0.9rem", textDecoration: "underline" },
    loading: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#070757", color: "white" }
};
