"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Package, Trash2, ChevronDown, ChevronUp, CheckSquare,
  Square, Weight, Backpack
} from "lucide-react";
import { AppShell, PageHeader, Sheet } from "@/components/app-shell";
import { Button, Input, Select, Card, Badge, FAB } from "@/components/ui";
import { useGearStore } from "@/lib/stores/gear-store";
import type { GearItem } from "@/lib/db";

const CATEGORY_LABELS: Record<GearItem["category"], string> = {
  camera: "Camera",
  lens: "Lenses",
  lighting: "Lighting",
  audio: "Audio",
  grip: "Grip",
  power: "Power",
  storage: "Storage",
  accessory: "Accessories",
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }));

const CATEGORY_ICON_COLORS: Record<GearItem["category"], string> = {
  camera: "#00d2ff",
  lens: "#a78bfa",
  lighting: "#f59e0b",
  audio: "#10b981",
  grip: "#f97316",
  power: "#ef4444",
  storage: "#6b7280",
  accessory: "#9ca3af",
};

const DEFAULT_GEAR: Partial<GearItem>[] = [
  { name: "Sony ZV-E10", category: "camera", weight: 343 },
  { name: "16-50mm Kit Lens", category: "lens", weight: 210 },
  { name: "SmallRig Cage", category: "grip", weight: 130 },
  { name: "TOPEAK Tabletop Handle", category: "grip", weight: 95 },
  { name: "Suction Mount", category: "grip", weight: 80 },
  { name: "9.5\" Magic Arm", category: "grip", weight: 180 },
  { name: "ND2-400 Filter", category: "accessory", weight: 25 },
  { name: "NPF 970 Battery (x2)", category: "power", weight: 280 },
  { name: "Dummy Battery + AC", category: "power", weight: 55 },
  { name: "SD Card 128GB", category: "storage", weight: 2 },
];

export default function GearPage() {
  const {
    items, presets, loadGear, loadPresets, createItem, updateItem,
    deleteItem, togglePacked, packPreset,
    packedWeight, itemsByCategory,
  } = useGearStore();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [filterCat, setFilterCat] = useState<string>("all");

  // Form state
  const [formName, setFormName] = useState("");
  const [formCat, setFormCat] = useState<GearItem["category"]>("camera");
  const [formWeight, setFormWeight] = useState("");
  const [formUnit, setFormUnit] = useState<"g" | "oz">("g");
  const [formNotes, setFormNotes] = useState("");

  const byCat = itemsByCategory();
  const weight = packedWeight();
  const cats = Object.keys(CATEGORY_LABELS) as GearItem["category"][];

  useEffect(() => { loadGear(); loadPresets(); }, [loadGear, loadPresets]);

  const openCreate = () => {
    setEditingId(null);
    setFormName("");
    setFormCat("camera");
    setFormWeight("");
    setFormUnit("g");
    setFormNotes("");
    setSheetOpen(true);
  };

  const openEdit = (item: GearItem) => {
    setEditingId(item.id);
    setFormName(item.name);
    setFormCat(item.category);
    setFormWeight(String(item.weight));
    setFormUnit(item.weight_unit);
    setFormNotes(item.notes);
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    if (editingId) {
      await updateItem(editingId, {
        name: formName, category: formCat,
        weight: Number(formWeight) || 0, weight_unit: formUnit, notes: formNotes,
      });
    } else {
      await createItem({
        name: formName, category: formCat,
        weight: Number(formWeight) || 0, weight_unit: formUnit, notes: formNotes,
      });
    }
    setSheetOpen(false);
  };

  const handleAddDefaultGear = async () => {
    for (const item of DEFAULT_GEAR) {
      await createItem(item);
    }
    setSheetOpen(false);
  };

  const toggleCat = (cat: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <AppShell>
      <PageHeader
        title="Gear"
        rightAction={
          <button
            onClick={openCreate}
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
            }}
          >
            + Add
          </button>
        }
      />

      {/* Weight Summary */}
      <div
        style={{
          margin: "16px",
          padding: "14px 16px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Weight size={18} style={{ color: "var(--accent)" }} />
          <div>
            <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: 0, fontFamily: "var(--font-heading)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Packed Weight
            </p>
            <p style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)", margin: "2px 0 0", fontFamily: "var(--font-heading)" }}>
              {weight.oz > 0 ? `${weight.oz.toFixed(1)} oz` : `${weight.g} g`}
            </p>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: 0 }}>
            {items.filter((i) => i.is_packed).length} / {items.length} items
          </p>
        </div>
      </div>

      {/* Kit Presets */}
      {presets.length > 0 && (
        <div style={{ padding: "0 16px 12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => packPreset(preset.id, true)}
              style={{
                background: "rgba(0,210,255,0.08)",
                border: "1px solid rgba(0,210,255,0.2)",
                borderRadius: "20px",
                padding: "6px 14px",
                cursor: "pointer",
                fontFamily: "var(--font-heading)",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--accent)",
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      )}

      {/* Gear List */}
      <div style={{ padding: "0 16px 100px" }}>
        {cats.map((cat) => {
          const catItems = byCat[cat] ?? [];
          if (filterCat !== "all" && filterCat !== cat) return null;
          if (catItems.length === 0 && filterCat === "all") return null;

          const collapsed = collapsedCats.has(cat);

          return (
            <div key={cat} style={{ marginBottom: "8px" }}>
              {/* Category Header */}
              <button
                onClick={() => toggleCat(cat)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 0",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    background: `${CATEGORY_ICON_COLORS[cat]}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Package size={14} style={{ color: CATEGORY_ICON_COLORS[cat] }} />
                </div>
                <span
                  style={{
                    flex: 1,
                    textAlign: "left",
                    fontFamily: "var(--font-heading)",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--text-secondary)",
                  }}
                >
                  {CATEGORY_LABELS[cat]}
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)", opacity: 0.5 }}>
                  {catItems.length}
                </span>
                {collapsed ? <ChevronDown size={14} style={{ color: "var(--text-secondary)" }} /> : <ChevronUp size={14} style={{ color: "var(--text-secondary)" }} />}
              </button>

              {/* Items */}
              <AnimatePresence>
                {!collapsed && catItems.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div
                      onClick={() => openEdit(item)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "10px 12px",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        marginBottom: "6px",
                        cursor: "pointer",
                      }}
                    >
                      {/* Packed toggle */}
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePacked(item.id); }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          color: item.is_packed ? "var(--success)" : "var(--text-secondary)",
                          flexShrink: 0,
                        }}
                      >
                        {item.is_packed ? <CheckSquare size={20} strokeWidth={1.5} /> : <Square size={20} strokeWidth={1.5} />}
                      </button>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: "14px", fontWeight: 500, color: "var(--text)",
                          margin: 0,
                          textDecoration: item.is_packed ? "none" : "none",
                          opacity: item.is_packed ? 0.6 : 1,
                        }}>
                          {item.name}
                        </p>
                        {item.weight > 0 && (
                          <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "1px 0 0" }}>
                            {item.weight}{item.weight_unit}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", opacity: 0.4, padding: "2px" }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          );
        })}

        {items.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 24px", color: "var(--text-secondary)" }}>
            <Backpack size={32} style={{ opacity: 0.3, marginBottom: "8px" }} />
            <p style={{ fontSize: "13px", margin: 0 }}>No gear added yet</p>
          </div>
        )}
      </div>

      <FAB onClick={openCreate}>
        <Plus size={24} strokeWidth={2.5} />
      </FAB>

      {/* Add / Edit Sheet */}
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={editingId ? "Edit Gear" : "Add Gear"}>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {!editingId && items.length === 0 && (
            <>
              <Button onClick={handleAddDefaultGear} variant="secondary">
                Load TylerKit™ Defaults
              </Button>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>or add manually</span>
                <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              </div>
            </>
          )}
          <Input label="Name" placeholder="Sony ZV-E10" value={formName} onChange={(e) => setFormName(e.target.value)} autoFocus={editingId !== null} />
          <Select label="Category" options={CATEGORY_OPTIONS} value={formCat} onChange={(e) => setFormCat(e.target.value as GearItem["category"])} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px", alignItems: "end" }}>
            <Input label="Weight" type="number" placeholder="0" value={formWeight} onChange={(e) => setFormWeight(e.target.value)} />
            <Select
              label="Unit"
              options={[{ value: "g", label: "g" }, { value: "oz", label: "oz" }]}
              value={formUnit}
              onChange={(e) => setFormUnit(e.target.value as "g" | "oz")}
              style={{ width: "80px" }}
            />
          </div>
          <Input label="Notes (optional)" placeholder="Serial #..." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
          <Button onClick={handleSave} disabled={!formName.trim()}>
            {editingId ? "Save Changes" : "Add Gear"}
          </Button>
        </div>
      </Sheet>
    </AppShell>
  );
}
