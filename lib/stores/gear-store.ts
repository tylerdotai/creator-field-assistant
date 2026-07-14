"use client";

import { create } from "zustand";
import * as db from "@/lib/db";
import { api } from "@/lib/api-client";
import type { GearItem, KitPreset } from "@/lib/db";

interface GearState {
  items: GearItem[];
  presets: KitPreset[];
  loading: boolean;

  loadGear: () => Promise<void>;
  loadPresets: () => Promise<void>;
  createItem: (data?: Partial<Omit<GearItem, "id">>) => Promise<GearItem>;
  updateItem: (id: string, data: Partial<Omit<GearItem, "id">>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  togglePacked: (id: string) => Promise<void>;
  createPreset: (name: string, itemIds: string[]) => Promise<KitPreset>;
  deletePreset: (id: string) => Promise<void>;
  packPreset: (id: string, packed: boolean) => Promise<void>;

  // Derived
  packedWeight: () => { g: number; oz: number };
  itemsByCategory: () => Record<GearItem["category"], GearItem[]>;
}

const G_PER_OZ = 28.3495;

export const useGearStore = create<GearState>((set, get) => ({
  items: [],
  presets: [],
  loading: false,

  loadGear: async () => {
    set({ loading: true });
    const items = await db.getAllGear();
    set({ items, loading: false });
  },

  loadPresets: async () => {
    const presets = await db.getAllKitPresets();
    set({ presets });
  },

  createItem: async (data) => {
    const item = await db.createGearItem(data);
    set((s) => ({ items: [...s.items, item] }));
    try { await api.gear.create(data); } catch { /* ignore */ }
    return item;
  },

  updateItem: async (id, data) => {
    await db.updateGearItem(id, data);
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, ...data } : i)),
    }));
    try { await api.gear.update(id, data); } catch { /* ignore */ }
  },

  deleteItem: async (id) => {
    await db.deleteGearItem(id);
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
    try { await api.gear.delete(id); } catch { /* ignore */ }
  },

  togglePacked: async (id) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    const newPackedState = !item.is_packed;
    await db.updateGearItem(id, { is_packed: newPackedState });
    set((s) => ({
      items: s.items.map((i) =>
        i.id === id ? { ...i, is_packed: newPackedState } : i
      ),
    }));
    try { await api.gear.update(id, { is_packed: newPackedState }); } catch { /* ignore */ }
  },

  createPreset: async (name, itemIds) => {
    const preset = await db.createKitPreset(name, itemIds);
    set((s) => ({ presets: [...s.presets, preset] }));
    return preset;
  },

  deletePreset: async (id) => {
    await db.deleteKitPreset(id);
    set((s) => ({ presets: s.presets.filter((p) => p.id !== id) }));
  },

  packPreset: async (id, packed) => {
    await db.packKitPreset(id, packed);
    const preset = get().presets.find((p) => p.id === id);
    if (!preset) return;
    set((s) => ({
      items: s.items.map((i) =>
        preset.item_ids.includes(i.id) ? { ...i, is_packed: packed } : i
      ),
    }));
    for (const itemId of preset.item_ids) {
      try { await api.gear.update(itemId, { is_packed: packed }); } catch { /* ignore */ }
    }
  },

  packedWeight: () => {
    const { items } = get();
    const g = items
      .filter((i) => i.is_packed && i.weight_unit === "g")
      .reduce((sum, i) => sum + i.weight, 0);
    const oz = items
      .filter((i) => i.is_packed && i.weight_unit === "oz")
      .reduce((sum, i) => sum + i.weight, 0);
    const totalOz = oz + g / G_PER_OZ;
    return { g, oz: totalOz };
  },

  itemsByCategory: () => {
    const { items } = get();
    const cats: GearItem["category"][] = [
      "camera", "lens", "lighting", "audio", "grip", "power", "storage", "accessory",
    ];
    const result = {} as Record<GearItem["category"], GearItem[]>;
    for (const cat of cats) {
      result[cat] = items.filter((i) => i.category === cat);
    }
    return result;
  },
}));
