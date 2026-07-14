"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, CheckSquare, Square, RotateCcw, Trash2,
  ChevronDown, ChevronUp, ListChecks, Settings
} from "lucide-react";
import { AppShell, PageHeader, Sheet } from "@/components/app-shell";
import { Button, Input, Card, Badge, FAB } from "@/components/ui";
import { useChecklistStore } from "@/lib/stores/checklist-store";

export default function ChecklistsPage() {
  const {
    checklists, items, loadChecklists, createChecklist, deleteChecklist,
    loadItems, addItem, toggleItem, deleteItem, resetChecklist,
  } = useChecklistStore();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const router = useRouter();

  useEffect(() => { loadChecklists(); }, [loadChecklists]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createChecklist(newName.trim());
    setNewName("");
    setSheetOpen(false);
  };

  const handleAddItem = async (checklistId: string) => {
    if (!newItemText.trim()) return;
    await addItem(checklistId, newItemText.trim());
    setNewItemText("");
    setAddingTo(null);
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <AppShell>
      <PageHeader
        title="Checklists"
        rightAction={
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button
              onClick={() => router.push("/settings")}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-secondary)", padding: "6px", display: "flex", alignItems: "center",
              }}
            >
              <Settings size={18} />
            </button>
            <button
              onClick={() => setSheetOpen(true)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--accent)",
                fontFamily: "var(--font-heading)",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                padding: "6px 8px",
              }}
            >
              + New
            </button>
          </div>
        }
      />

      <div style={{ padding: "16px 16px 100px" }}>
        {checklists.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              color: "var(--text-secondary)",
            }}
          >
            <ListChecks size={40} style={{ opacity: 0.3, marginBottom: "12px" }} />
            <p style={{ fontSize: "14px", margin: "0 0 4px" }}>No checklists yet</p>
            <p style={{ fontSize: "12px", opacity: 0.6 }}>Create one to track your pre-shoot routine</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {checklists.map((checklist) => {
              const checklistItems = items[checklist.id] ?? [];
              const checked = checklistItems.filter((i) => i.checked).length;
              const total = checklistItems.length;
              const progress = total > 0 ? (checked / total) * 100 : 0;
              const isExpanded = expanded.has(checklist.id);

              return (
                <div
                  key={checklist.id}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    overflow: "hidden",
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      padding: "14px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontFamily: "var(--font-heading)",
                          fontSize: "15px",
                          fontWeight: 600,
                          color: "var(--text)",
                          margin: 0,
                        }}
                      >
                        {checklist.name}
                      </p>
                      <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                        {checked}/{total} items checked
                      </p>
                    </div>

                    <button
                      onClick={() => { loadItems(checklist.id); toggleExpanded(checklist.id); }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-secondary)",
                        padding: "4px",
                      }}
                    >
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    {total > 0 && (
                      <button
                        onClick={() => resetChecklist(checklist.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-secondary)",
                          opacity: 0.5,
                          padding: "4px",
                        }}
                        title="Reset"
                      >
                        <RotateCcw size={16} />
                      </button>
                    )}

                    <button
                      onClick={() => deleteChecklist(checklist.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-secondary)",
                        opacity: 0.4,
                        padding: "4px",
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Progress bar */}
                  {total > 0 && (
                    <div
                      style={{
                        height: "2px",
                        background: "var(--border)",
                        width: "100%",
                      }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        style={{
                          height: "100%",
                          background: progress === 100 ? "var(--success)" : "var(--accent)",
                        }}
                      />
                    </div>
                  )}

                  {/* Items */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                        style={{ overflow: "hidden" }}
                      >
                        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                          {checklistItems.map((item) => (
                            <div
                              key={item.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                opacity: item.checked ? 0.5 : 1,
                              }}
                            >
                              <button
                                onClick={() => toggleItem(item.id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: 0,
                                  color: item.checked ? "var(--success)" : "var(--text-secondary)",
                                  flexShrink: 0,
                                }}
                              >
                                {item.checked ? (
                                  <CheckSquare size={20} strokeWidth={1.5} />
                                ) : (
                                  <Square size={20} strokeWidth={1.5} />
                                )}
                              </button>
                              <span
                                style={{
                                  flex: 1,
                                  fontSize: "14px",
                                  color: "var(--text)",
                                  textDecoration: item.checked ? "line-through" : "none",
                                }}
                              >
                                {item.text}
                              </span>
                              <button
                                onClick={() => deleteItem(item.id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "var(--text-secondary)",
                                  opacity: 0.4,
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}

                          {/* Add item */}
                          {addingTo === checklist.id ? (
                            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                              <input
                                autoFocus
                                value={newItemText}
                                onChange={(e) => setNewItemText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleAddItem(checklist.id);
                                  if (e.key === "Escape") { setAddingTo(null); setNewItemText(""); }
                                }}
                                placeholder="Add item..."
                                style={{
                                  flex: 1,
                                  background: "var(--surface-2)",
                                  border: "1px solid var(--border)",
                                  borderRadius: "6px",
                                  padding: "8px 10px",
                                  fontSize: "14px",
                                  color: "var(--text)",
                                }}
                              />
                              <Button size="sm" onClick={() => handleAddItem(checklist.id)}>Add</Button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setAddingTo(checklist.id); loadItems(checklist.id); }}
                              style={{
                                background: "none",
                                border: "1px dashed var(--border)",
                                borderRadius: "6px",
                                padding: "8px",
                                cursor: "pointer",
                                color: "var(--text-secondary)",
                                fontSize: "13px",
                                fontFamily: "var(--font-heading)",
                                fontWeight: 600,
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                                width: "100%",
                                marginTop: "4px",
                              }}
                            >
                              + Add Item
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <FAB onClick={() => setSheetOpen(true)}>
        <Plus size={24} strokeWidth={2.5} />
      </FAB>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="New Checklist">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Input
            label="Checklist Name"
            placeholder="Pre-Shoot Camera Check"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <Button onClick={handleCreate} disabled={!newName.trim()}>
            Create Checklist
          </Button>
        </div>
      </Sheet>
    </AppShell>
  );
}
