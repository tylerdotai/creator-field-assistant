"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui";
import type { Shot } from "@/lib/db";

const TYPE_ICONS: Record<Shot["type"], React.ReactNode> = {
  vlog: null,
  broll: null,
  interview: null,
  aerial: null,
};

const TYPE_BADGE_VARIANT = (t: Shot["type"]): "accent" | "success" | "warning" | "outline" => {
  const map: Record<Shot["type"], "accent" | "success" | "warning" | "outline"> = {
    vlog: "accent",
    broll: "success",
    interview: "warning",
    aerial: "outline",
  };
  return map[t];
};

export const ShotCard = memo(function ShotCard({
  shot,
  onToggle,
  onEdit,
  onDelete,
}: {
  shot: Shot;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      style={{
        background: "var(--surface)",
        border: `1px solid ${shot.completed ? "rgba(16,185,129,0.3)" : "var(--border)"}`,
        borderRadius: "10px",
        padding: "12px 14px",
        opacity: shot.completed ? 0.65 : 1,
        transition: "opacity 300ms ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        {/* Complete toggle */}
        <button
          onClick={onToggle}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            flexShrink: 0,
            marginTop: "2px",
            color: shot.completed ? "var(--success)" : "var(--text-secondary)",
            transition: "color 200ms ease",
          }}
        >
          <motion.div
            animate={shot.completed ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.2 }}
          >
            {shot.completed ? (
              <CheckCircle2 size={22} strokeWidth={1.5} />
            ) : (
              <Circle size={22} strokeWidth={1.5} />
            )}
          </motion.div>
        </button>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }} onClick={onEdit}>
          <div style={{ display: "flex", gap: "6px", marginBottom: "4px", flexWrap: "wrap" }}>
            <Badge variant={TYPE_BADGE_VARIANT(shot.type)}>
              {shot.type}
            </Badge>
            <Badge variant="outline" style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}>
              {shot.lens}
            </Badge>
            <Badge variant="outline" style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}>
              {shot.format}
            </Badge>
          </div>
          <p
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "var(--text)",
              margin: "0 0 4px",
              textDecoration: shot.completed ? "line-through" : "none",
            }}
          >
            {shot.description || "No description"}
          </p>
          {shot.notes && (
            <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: 0 }}>
              {shot.notes}
            </p>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-secondary)",
            opacity: 0.4,
            flexShrink: 0,
            padding: "2px",
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  );
});
