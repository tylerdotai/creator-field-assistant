"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map,
  ListTodo,
  Backpack,
  MapPin,
  Settings,
  ChevronLeft,
  WifiOff,
  ClipboardList,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/projects", icon: ListTodo, label: "Shots" },
  { href: "/gear", icon: Backpack, label: "Gear" },
  { href: "/checklists", icon: ClipboardList, label: "Check" },
  { href: "/map", icon: Map, label: "Map" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOffline, setIsOffline] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const onOffline = () => setIsOffline(true);
    const onOnline = () => setIsOffline(false);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    setIsOffline(!navigator.onLine);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const current = NAV_ITEMS.find((i) => pathname.startsWith(i.href));
  const isMap = pathname.startsWith("/map");

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        paddingBottom: isMap ? "0" : "80px",
      }}
    >
      {/* Offline Banner */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{
              background: "rgba(245,158,11,0.15)",
              borderBottom: "1px solid var(--warning)",
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              color: "var(--warning)",
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              overflow: "hidden",
            }}
          >
            <WifiOff size={14} />
            Offline Mode — All data saved locally
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: "auto" }}>{children}</div>

      {/* Bottom Nav — hidden on map */}
      {!isMap && (
        <nav
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: "72px",
            background: "rgba(20,20,20,0.95)",
            backdropFilter: "blur(20px)",
            borderTop: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
            zIndex: 40,
          }}
        >
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => window.location.href = item.href}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                  padding: "8px 20px",
                  color: active ? "var(--accent)" : "var(--text-secondary)",
                  transition: "color 200ms ease",
                }}
              >
                <motion.div
                  animate={{ scale: active ? 1.1 : 1 }}
                  transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
                >
                  <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
                </motion.div>
                <span
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}

// ─── Page Header ───────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  backHref,
  rightAction,
}: {
  title: string;
  backHref?: string;
  rightAction?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <div
      style={{
        height: "56px",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: "12px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg)",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      {backHref ? (
        <button
          onClick={() => router.push(backHref)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--accent)",
            padding: "4px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <ChevronLeft size={22} />
        </button>
      ) : (
        <div style={{ width: "30px" }} />
      )}

      <h1
        style={{
          flex: 1,
          fontSize: "18px",
          fontFamily: "var(--font-heading)",
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--text)",
          margin: 0,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {title}
      </h1>

      {rightAction && <div style={{ flexShrink: 0 }}>{rightAction}</div>}
    </div>
  );
}

// ─── Sheet ────────────────────────────────────────────────────────────────────

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const [closed, setClosed] = useState(!open);

  useEffect(() => {
    if (open) setClosed(false);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              zIndex: 60,
              backdropFilter: "blur(4px)",
            }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) onClose();
            }}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "var(--surface)",
              borderTop: "1px solid var(--border)",
              borderRadius: "16px 16px 0 0",
              padding: "16px",
              paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
              zIndex: 70,
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            {/* Drag handle */}
            <div
              style={{
                width: "36px",
                height: "4px",
                background: "var(--border)",
                borderRadius: "2px",
                margin: "0 auto 16px",
              }}
            />
            {title && (
              <h2
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "14px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "var(--text)",
                  margin: "0 0 16px",
                }}
              >
                {title}
              </h2>
            )}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
