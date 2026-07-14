"use client";

import { create } from "zustand";
import * as db from "@/lib/db";
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
    set({ checklists, loading: false });
  },

  createChecklist: async (name, projectId) => {
    const checklist = await db.createChecklist(name, projectId);
    set((s) => ({ checklists: [...s.checklists, checklist] }));
    return checklist;
  },

  deleteChecklist: async (id) => {
    await db.deleteChecklist(id);
    set((s) => {
      const { [id]: _, ...rest } = s.items;
      return { checklists: s.checklists.filter((c) => c.id !== id), items: rest };
    });
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
    const updated = await db.updateChecklistItem(itemId, { checked: !target.checked });
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
  },

  resetChecklist: async (checklistId) => {
    await db.resetChecklist(checklistId);
    set((s) => ({
      items: {
        ...s.items,
        [checklistId]: (s.items[checklistId] ?? []).map((i) => ({
          ...i,
          checked: false,
        })),
      },
    }));
  },

  progress: (checklistId) => {
    const list = get().items[checklistId] ?? [];
    const total = list.length;
    const checked = list.filter((i) => i.checked).length;
    return { checked, total };
  },
}));
