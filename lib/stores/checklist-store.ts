"use client";

import { create } from "zustand";
import * as db from "@/lib/db";
import { api } from "@/lib/api-client";
import type { Checklist, ChecklistItem } from "@/lib/db";

interface ChecklistState {
  checklists: Checklist[];
  items: Record<string, ChecklistItem[]>; // checklistId -> items
  loading: boolean;

  loadChecklists: () => Promise<void>;
  createChecklist: (name: string, projectId?: string) => Promise<Checklist>;
  deleteChecklist: (id: string) => Promise<void>;
  loadItems: (checklistId: string) => Promise<void>;
  addItem: (checklistId: string, text: string) => Promise<void>;
  toggleItem: (itemId: string) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  resetChecklist: (checklistId: string) => Promise<void>;

  progress: (checklistId: string) => { checked: number; total: number };
}

export const useChecklistStore = create<ChecklistState>((set, get) => ({
  checklists: [],
  items: {},
  loading: false,

  loadChecklists: async () => {
    set({ loading: true });
    const checklists = await db.getAllChecklists();
    if (checklists.length === 0) {
      // Seed defaults on first launch
      await Promise.all([
        db.createChecklist("Pre-Production"),
        db.createChecklist("Production"),
        db.createChecklist("Post-Production"),
      ]);
      const seeded = await db.getAllChecklists();
      set({ checklists: seeded, loading: false });
      return;
    }
    set({ checklists, loading: false });
  },

  createChecklist: async (name, projectId) => {
    const checklist = await db.createChecklist(name, projectId);
    set((s) => ({ checklists: [...s.checklists, checklist] }));
    try { await api.checklists.create(name, projectId); } catch { /* ignore */ }
    return checklist;
  },

  deleteChecklist: async (id) => {
    await db.deleteChecklist(id);
    set((s) => {
      const { [id]: _, ...rest } = s.items;
      return { checklists: s.checklists.filter((c) => c.id !== id), items: rest };
    });
    try { await api.checklists.delete(id); } catch { /* ignore */ }
  },

  loadItems: async (checklistId) => {
    const items = await db.getChecklistItems(checklistId);
    set((s) => ({ items: { ...s.items, [checklistId]: items } }));
  },

  addItem: async (checklistId, text) => {
    const item = await db.createChecklistItem(checklistId, text);
    set((s) => ({
      items: {
        ...s.items,
        [checklistId]: [...(s.items[checklistId] ?? []), item],
      },
    }));
    try { await api.checklistItems.create(checklistId, text); } catch { /* ignore */ }
  },

  toggleItem: async (itemId) => {
    const { items } = get();
    let target: ChecklistItem | undefined;
    let checklistId: string | undefined;
    for (const [cId, its] of Object.entries(items)) {
      target = its.find((i) => i.id === itemId);
      if (target) { checklistId = cId; break; }
    }
    if (!target || !checklistId) return;
    const newCheckedState = !target.checked;
    const updated = await db.updateChecklistItem(itemId, { checked: newCheckedState });
    if (updated) {
      set((s) => ({
        items: {
          ...s.items,
          [checklistId!]: s.items[checklistId!].map((i) =>
            i.id === itemId ? updated : i
          ),
        },
      }));
    }
    try { await api.checklistItems.update(itemId, { checked: newCheckedState }); } catch { /* ignore */ }
  },

  deleteItem: async (itemId) => {
    await db.deleteChecklistItem(itemId);
    set((s) => {
      const newItems = { ...s.items };
      for (const cId of Object.keys(newItems)) {
        newItems[cId] = newItems[cId].filter((i) => i.id !== itemId);
      }
      return { items: newItems };
    });
    try { await api.checklistItems.delete(itemId); } catch { /* ignore */ }
  },

  resetChecklist: async (checklistId) => {
    await db.resetChecklist(checklistId);
    const currentItems = get().items[checklistId] ?? [];
    set((s) => ({
      items: {
        ...s.items,
        [checklistId]: currentItems.map((i) => ({
          ...i,
          checked: false,
        })),
      },
    }));
    for (const item of currentItems) {
      try { await api.checklistItems.update(item.id, { checked: false }); } catch { /* ignore */ }
    }
  },

  progress: (checklistId) => {
    const list = get().items[checklistId] ?? [];
    const total = list.length;
    const checked = list.filter((i) => i.checked).length;
    return { checked, total };
  },
}));
