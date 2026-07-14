"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, MapPin, Calendar, Trash2, Film, ChevronRight } from "lucide-react";
import { AppShell, PageHeader, Sheet } from "@/components/app-shell";
import { Button, Input, Card, Badge, Divider, FAB } from "@/components/ui";
import { useProjectStore } from "@/lib/stores/project-store";

const LENS_COLORS: Record<string, string> = {
  "16mm": "#f59e0b",
  "35mm": "#10b981",
  "50mm": "#00d2ff",
  "85mm": "#a78bfa",
};

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { projects, days, loadDays, createDay, deleteDay, loadShots, shots } = useProjectStore();
  const project = projects.find((p) => p.id === id);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [dayLocation, setDayLocation] = useState("");
  const [dayDate, setDayDate] = useState("");

  useEffect(() => {
    if (id) {
      loadDays(id);
    }
  }, [id, loadDays]);

  // Load shots for all days
  useEffect(() => {
    days.forEach((d) => loadShots(d.id));
  }, [days, loadShots]);

  const handleCreateDay = async () => {
    if (!dayLocation.trim()) return;
    await createDay(id, dayLocation.trim(), dayDate);
    setDayLocation("");
    setDayDate("");
    setSheetOpen(false);
  };

  const dayShotCounts = (dayId: string) => {
    const s = shots[dayId] ?? [];
    const done = s.filter((sh) => sh.completed).length;
    return { total: s.length, done };
  };

  if (!project) {
    return (
      <AppShell>
        <PageHeader title="Project" backHref="/projects" />
        <div style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>
          Project not found
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title={project.name} backHref="/projects" />

      <div style={{ padding: "16px" }}>
        <div
          style={{
            marginBottom: "16px",
            padding: "14px 16px",
            background: "rgba(0,210,255,0.06)",
            border: "1px solid rgba(0,210,255,0.15)",
            borderRadius: "10px",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--accent)",
              margin: "0 0 4px",
            }}
          >
            Shoot Plan
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
            {days.length} {days.length === 1 ? "day" : "days"} planned
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {days.map((day, i) => {
            const { total, done } = dayShotCounts(day.id);
            return (
              <motion.div
                key={day.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              >
                <Card
                  onClick={() => router.push(`/projects/${id}/shots?day=${day.id}`)}
                  style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}
                >
                  {/* Day number */}
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-heading)",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "var(--text-secondary)",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "var(--text)",
                        margin: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {day.location_name}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "3px" }}>
                      {day.date && (
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "3px" }}>
                          <Calendar size={10} /> {day.date}
                        </span>
                      )}
                      {total > 0 && (
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "3px" }}>
                          <Film size={10} /> {done}/{total} shots
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); deleteDay(day.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", opacity: 0.4, padding: "4px" }}
                  >
                    <Trash2 size={15} />
                  </button>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {days.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 24px",
              color: "var(--text-secondary)",
            }}
          >
            <MapPin size={32} style={{ opacity: 0.3, marginBottom: "8px" }} />
            <p style={{ fontSize: "14px", margin: 0 }}>No days added yet</p>
          </div>
        )}
      </div>

      <FAB onClick={() => setSheetOpen(true)}>
        <Plus size={24} strokeWidth={2.5} />
      </FAB>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Add Day">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Input
            label="Location"
            placeholder="Marfa, TX"
            value={dayLocation}
            onChange={(e) => setDayLocation(e.target.value)}
            autoFocus
          />
          <Input
            label="Date (optional)"
            type="date"
            value={dayDate}
            onChange={(e) => setDayDate(e.target.value)}
          />
          <Button onClick={handleCreateDay} disabled={!dayLocation.trim()}>
            Add Day
          </Button>
        </div>
      </Sheet>
    </AppShell>
  );
}
