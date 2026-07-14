"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Folder, Trash2, Calendar, Settings } from "lucide-react";
import { AppShell, PageHeader, Sheet } from "@/components/app-shell";
import { Button, Input, Card, EmptyState, FAB } from "@/components/ui";
import { useProjectStore } from "@/lib/stores/project-store";

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, loading, loadProjects, createProject, deleteProject } = useProjectStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const p = await createProject(newName.trim());
    setNewName("");
    setSheetOpen(false);
    router.push(`/projects/${p.id}`);
  };

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    setDeletingId(null);
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <AppShell>
      <PageHeader
        title="Shot Planner"
        rightAction={
          <button
            onClick={() => router.push("/settings")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: "4px", display: "flex", alignItems: "center" }}
          >
            <Settings size={20} />
          </button>
        }
      />

      <div style={{ padding: "16px" }}>
        {projects.length === 0 && !loading ? (
          <EmptyState
            icon={<Folder size={40} />}
            title="No projects yet"
            subtitle="Create your first shoot project to get started"
          />
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.04 } },
            }}
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {projects.map((p) => (
              <motion.div
                key={p.id}
                variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              >
                <Card
                  onClick={() => router.push(`/projects/${p.id}`)}
                  style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px" }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "8px",
                      background: "rgba(0,210,255,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Folder size={20} style={{ color: "var(--accent)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "var(--text)",
                        margin: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {p.name}
                    </p>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "var(--text-secondary)",
                        margin: "2px 0 0",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Calendar size={10} />
                      {formatDate(p.updated_at)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeletingId(p.id); }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-secondary)",
                      padding: "4px",
                      opacity: 0.5,
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <FAB onClick={() => setSheetOpen(true)}>
        <Plus size={24} strokeWidth={2.5} />
      </FAB>

      {/* Create Sheet */}
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="New Project">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Input
            label="Project Name"
            placeholder="Punta Cana 2026"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <Button onClick={handleCreate} disabled={!newName.trim()}>
            Create Project
          </Button>
        </div>
      </Sheet>

      {/* Delete Confirm */}
      <Sheet
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Delete Project"
      >
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px" }}>
          This will permanently delete the project and all its days and shots.
        </p>
        <div style={{ display: "flex", gap: "10px" }}>
          <Button variant="ghost" onClick={() => setDeletingId(null)} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => deletingId && handleDelete(deletingId)} style={{ flex: 1 }}>
            Delete
          </Button>
        </div>
      </Sheet>
    </AppShell>
  );
}
