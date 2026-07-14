"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Download,
  Upload,
  LogOut,
  Cloud,
  CloudOff,
  Smartphone,
  Info,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  Database,
  RefreshCw,
} from "lucide-react";
import { AppShell, PageHeader, Sheet } from "@/components/app-shell";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import * as db from "@/lib/db";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [syncStatus, setSyncStatus] = useState<"synced" | "offline" | "error">("synced");
  const [isInstalling, setIsInstalling] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Listen for PWA install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Monitor online/offline for sync status
  useEffect(() => {
    const onOffline = () => setSyncStatus("offline");
    const onOnline = () => setSyncStatus("synced");
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    setSyncStatus(navigator.onLine ? "synced" : "offline");
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const handleSignOut = () => {
    logout();
    window.location.href = "/login";
  };

  const handleExport = async () => {
    try {
      const data = await db.exportAllData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `field-assistant-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.version || !data.data) {
        alert("Invalid backup file.");
        return;
      }
      await db.importAllData(data);
      alert("Data imported successfully! Reloading...");
      window.location.reload();
    } catch (err) {
      console.error("Import failed:", err);
      alert("Import failed. Check the file and try again.");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalling(true);
    }
    setDeferredPrompt(null);
  };

  const handleClearData = async () => {
    if (!confirm("This will delete ALL local data. Are you sure?")) return;
    if (!confirm("Really delete everything? This cannot be undone.")) return;
    const dbs = await indexedDB.databases();
    for (const dbInfo of dbs) {
      if (dbInfo.name) indexedDB.deleteDatabase(dbInfo.name);
    }
    window.location.href = "/login";
  };

  return (
    <AppShell>
      <PageHeader title="Settings" backHref="/projects" />

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Account */}
        <section>
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-secondary)",
              marginBottom: "8px",
            }}
          >
            Account
          </h2>
          <Card style={{ padding: "16px" }}>
            {user ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)", margin: 0 }}>
                    {user.email}
                  </p>
                  <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                    Signed in · Data syncing to cloud
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "none",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    cursor: "pointer",
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-heading)",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  <LogOut size={13} />
                  Sign Out
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "12px" }}>
                  Not signed in. Create an account to sync data across devices.
                </p>
                <Button onClick={() => (window.location.href = "/login")}>
                  Sign In / Create Account
                </Button>
              </div>
            )}
          </Card>
        </section>

        {/* Sync Status */}
        <section>
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-secondary)",
              marginBottom: "8px",
            }}
          >
            Sync Status
          </h2>
          <Card style={{ padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {syncStatus === "synced" ? (
                <>
                  <Cloud size={20} style={{ color: "var(--success)" }} />
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)", margin: 0 }}>All changes synced</p>
                    <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      Your data is backed up to the cloud
                    </p>
                  </div>
                  <CheckCircle size={16} style={{ color: "var(--success)", marginLeft: "auto" }} />
                </>
              ) : syncStatus === "offline" ? (
                <>
                  <CloudOff size={20} style={{ color: "var(--warning)" }} />
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)", margin: 0 }}>Offline</p>
                    <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      Changes saved locally · will sync when online
                    </p>
                  </div>
                  <AlertCircle size={16} style={{ color: "var(--warning)", marginLeft: "auto" }} />
                </>
              ) : (
                <>
                  <AlertCircle size={20} style={{ color: "var(--danger)" }} />
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)", margin: 0 }}>Sync error</p>
                    <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      Retrying automatically
                    </p>
                  </div>
                </>
              )}
            </div>
          </Card>
        </section>

        {/* Data Management */}
        <section>
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-secondary)",
              marginBottom: "8px",
            }}
          >
            Data Management
          </h2>
          <Card style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "rgba(0,210,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Download size={16} style={{ color: "var(--accent)" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)", margin: 0 }}>Export Backup</p>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Download all data as a JSON file
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleExport}>
                Export
              </Button>
            </div>

            <div style={{ height: "1px", background: "var(--border)" }} />

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "rgba(16,185,129,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Upload size={16} style={{ color: "var(--success)" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)", margin: 0 }}>Import Backup</p>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Restore from a previous JSON export
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: "none" }}
              />
              <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                Import
              </Button>
            </div>

            <div style={{ height: "1px", background: "var(--border)" }} />

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "rgba(239,68,68,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Database size={16} style={{ color: "var(--danger)" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)", margin: 0 }}>Clear All Data</p>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Permanently delete all local data
                </p>
              </div>
              <Button variant="danger" size="sm" onClick={handleClearData}>
                Clear
              </Button>
            </div>
          </Card>
        </section>

        {/* PWA Install */}
        <section>
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-secondary)",
              marginBottom: "8px",
            }}
          >
            App
          </h2>
          <Card style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "rgba(0,210,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Smartphone size={16} style={{ color: "var(--accent)" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)", margin: 0 }}>Install App</p>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  {deferredPrompt
                    ? "Add to home screen for the best experience"
                    : "Use your browser's share menu to install"}
                </p>
              </div>
              {deferredPrompt ? (
                <Button variant="secondary" size="sm" onClick={handleInstall}>
                  Install
                </Button>
              ) : null}
            </div>

            <div style={{ height: "1px", background: "var(--border)" }} />

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "rgba(160,160,160,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Info size={16} style={{ color: "var(--text-secondary)" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)", margin: 0 }}>
                  Creator Field Assistant
                </p>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Version 1.0.0 · Built with Next.js + Cloudflare Workers
                </p>
              </div>
            </div>
          </Card>
        </section>

        <div style={{ height: "40px" }} />
      </div>
    </AppShell>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
