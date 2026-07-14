"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Plus, Filter, Settings } from "lucide-react";
import { AppShell, PageHeader, Sheet } from "@/components/app-shell";
import { Button, Input, Select, Textarea, FAB } from "@/components/ui";
import { ShotCard } from "@/components/shot-card";
import { useProjectStore } from "@/lib/stores/project-store";
import type { Shot } from "@/lib/db";

const LENS_OPTIONS = [
  { value: "16mm", label: "16mm (Wide)" },
  { value: "35mm", label: "35mm (Default)" },
  { value: "50mm", label: "50mm (Standard)" },
  { value: "85mm", label: "85mm (Portrait)" },
];

const FORMAT_OPTIONS = [
  { value: "9:16", label: "9:16 Vertical" },
  { value: "16:9", label: "16:9 Horizontal" },
  { value: "1:1", label: "1:1 Square" },
  { value: "4:5", label: "4:5 Portrait" },
];

const TYPE_OPTIONS = [
  { value: "vlog", label: "Vlog" },
  { value: "broll", label: "B-Roll" },
  { value: "interview", label: "Interview" },
  { value: "aerial", label: "Aerial" },
];

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "vlog", label: "Vlog" },
  { value: "broll", label: "B-Roll" },
  { value: "interview", label: "Interview" },
  { value: "aerial", label: "Aerial" },
  { value: "planned", label: "Planned" },
  { value: "shot", label: "Shot" },
  { value: "needs_review", label: "Needs Review" },
];

// ─── ShotListContent ─────────────────────────────────────────────────────────

function ShotListContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const initialDayId = searchParams.get("day");

  const {
    projects, days, shots, loadDays, loadShots,
    createShot, updateShot, deleteShot, toggleShotComplete,
  } = useProjectStore();
  const project = projects.find((p) => p.id === projectId);
  const router = useRouter();

  const [selectedDayId, setSelectedDayId] = useState<string | null>(initialDayId);
  const [filter, setFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingShot, setEditingShot] = useState<Shot | null>(null);

  const [formType, setFormType] = useState<Shot["type"]>("vlog");
  const [formDesc, setFormDesc] = useState("");
  const [formLens, setFormLens] = useState<Shot["lens"]>("35mm");
  const [formFormat, setFormFormat] = useState<Shot["format"]>("16:9");
  const [formNotes, setFormNotes] = useState("");
  const [formStatus, setFormStatus] = useState<Shot["status"]>("planned");

  useEffect(() => { loadDays(projectId); }, [projectId, loadDays]);

  useEffect(() => {
    if (!selectedDayId && days.length > 0) setSelectedDayId(days[0].id);
  }, [days, selectedDayId]);

  useEffect(() => {
    days.forEach((d) => loadShots(d.id));
  }, [days, loadShots]);

  const currentDay = days.find((d) => d.id === selectedDayId);
  const dayShots = selectedDayId ? shots[selectedDayId] ?? [] : [];

  const filtered = dayShots.filter((s) => {
    if (filter === "all") return true;
    if (["vlog", "broll", "interview", "aerial"].includes(filter)) return s.type === filter;
    return s.status === filter;
  });

  const openCreate = () => {
    setEditingShot(null);
    setFormType("vlog");
    setFormDesc("");
    setFormLens("35mm");
    setFormFormat("16:9");
    setFormNotes("");
    setFormStatus("planned");
    setSheetOpen(true);
  };

  const openEdit = (shot: Shot) => {
    setEditingShot(shot);
    setFormType(shot.type);
    setFormDesc(shot.description);
    setFormLens(shot.lens);
    setFormFormat(shot.format);
    setFormNotes(shot.notes);
    setFormStatus(shot.status);
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!selectedDayId) return;
    if (editingShot) {
      await updateShot(editingShot.id, {
        type: formType, description: formDesc, lens: formLens,
        format: formFormat, notes: formNotes, status: formStatus,
      });
    } else {
      await createShot(selectedDayId, {
        type: formType, description: formDesc, lens: formLens,
        format: formFormat, notes: formNotes, status: formStatus,
      });
    }
    setSheetOpen(false);
  };

  if (!project) return null;

  return (
    <AppShell>
      <PageHeader
        title={currentDay?.location_name ?? "Shots"}
        backHref={`/projects/${projectId}`}
        rightAction={
          <button
            onClick={() => router.push("/settings")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: "4px", display: "flex", alignItems: "center" }}
          >
            <Settings size={20} />
          </button>
        }
      />

      {/* Day Tabs */}
      <div
        style={{
          display: "flex",
          overflowX: "auto",
          gap: "8px",
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          scrollbarWidth: "none",
        }}
      >
        {days.map((day, i) => {
          const sCount = (shots[day.id] ?? []).length;
          const doneCount = (shots[day.id] ?? []).filter((s) => s.completed).length;
          const active = day.id === selectedDayId;
          return (
            <button
              key={day.id}
              onClick={() => setSelectedDayId(day.id)}
              style={{
                background: active ? "var(--accent)" : "var(--surface)",
                color: active ? "#0a0a0a" : "var(--text-secondary)",
                border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "20px",
                padding: "6px 14px",
                cursor: "pointer",
                fontFamily: "var(--font-heading)",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                flexShrink: 0,
                transition: "all 200ms ease",
              }}
            >
              Day {i + 1}
              {sCount > 0 && ` · ${doneCount}/${sCount}`}
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          overflowX: "auto",
          padding: "10px 16px",
          scrollbarWidth: "none",
        }}
      >
        <Filter size={13} style={{ color: "var(--text-secondary)", flexShrink: 0, alignSelf: "center" }} />
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            style={{
              background: filter === opt.value ? "rgba(0,210,255,0.15)" : "transparent",
              color: filter === opt.value ? "var(--accent)" : "var(--text-secondary)",
              border: `1px solid ${filter === opt.value ? "rgba(0,210,255,0.3)" : "var(--border)"}`,
              borderRadius: "14px",
              padding: "4px 10px",
              cursor: "pointer",
              fontFamily: "var(--font-heading)",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Shot List */}
      <div style={{ padding: "8px 16px 100px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <AnimatePresence mode="popLayout">
          {filtered.map((shot) => (
            <ShotCard
              key={shot.id}
              shot={shot}
              onToggle={() => toggleShotComplete(shot.id)}
              onEdit={() => openEdit(shot)}
              onDelete={() => deleteShot(shot.id)}
            />
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 24px", color: "var(--text-secondary)", fontSize: "13px" }}>
            No shots match this filter
          </div>
        )}
      </div>

      <FAB onClick={openCreate}>
        <Plus size={24} strokeWidth={2.5} />
      </FAB>

      {/* Create / Edit Sheet */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingShot ? "Edit Shot" : "Add Shot"}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <Select
            label="Type"
            options={TYPE_OPTIONS}
            value={formType}
            onChange={(e) => setFormType(e.target.value as Shot["type"])}
          />
          <Textarea
            label="Description"
            placeholder="Wide establishing shot of the town..."
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Select
              label="Lens"
              options={LENS_OPTIONS}
              value={formLens}
              onChange={(e) => setFormLens(e.target.value as Shot["lens"])}
            />
            <Select
              label="Format"
              options={FORMAT_OPTIONS}
              value={formFormat}
              onChange={(e) => setFormFormat(e.target.value as Shot["format"])}
            />
          </div>
          <Select
            label="Status"
            options={[
              { value: "planned", label: "Planned" },
              { value: "shot", label: "Shot" },
              { value: "needs_review", label: "Needs Review" },
            ]}
            value={formStatus}
            onChange={(e) => setFormStatus(e.target.value as Shot["status"])}
          />
          <Textarea
            label="Notes (optional)"
            placeholder="Ref: Marfa sunset timing..."
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
          />
          <Button onClick={handleSave}>{editingShot ? "Save Changes" : "Add Shot"}</Button>
        </div>
      </Sheet>
    </AppShell>
  );
}

export default function ShotsPage() {
  return (
    <Suspense fallback={<div style={{ background: "var(--bg)", minHeight: "100dvh" }} />}>
      <ShotListContent />
    </Suspense>
  );
}
