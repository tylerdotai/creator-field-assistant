"use client";

import { create } from "zustand";
import * as db from "@/lib/db";
import type { SavedLocation, LocationPhoto } from "@/lib/db";
import { api } from "@/lib/api-client";

// ─── USFS ArcGIS seed ───────────────────────────────────────────────────────────
// Fetches real USFS recreation sites via the /api/campsites server route which
// queries the USDA Forest Service ArcGIS FeatureService.
// Falls back to a small static seed if the API is unavailable.
async function seedUSFSLocations(): Promise<SavedLocation[]> {
  try {
    // Continental US bounding box
    const res = await fetch("/api/campsites?bbox=-125,24.5,-66.9,49.5", {
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();

    // If the server couldn't reach USFS, fall through to static seed
    if (json.fallback) throw new Error("USFS API returned fallback");

    const rawLocations: Array<{
      name: string;
      lat: number;
      lng: number;
      type: "campsite" | "photo_spot" | "accommodation" | "other";
      description: string;
      location: string;
      url: string;
      directions: string;
      subtype: string;
      activities: string;
      fee: string;
      fee_detail: string;
      water: string;
      restroom: string;
      elevation: string;
      season: string;
      hours: string;
      restrictions: string;
      towns: string;
    }> = json.locations ?? [];

    const written: SavedLocation[] = [];
    for (const item of rawLocations.slice(0, 500)) {
      try {
        const saved = await db.createLocation({
          name: item.name,
          lat: item.lat,
          lng: item.lng,
          type: item.type,
          description: item.description || `${item.subtype} — ${item.location}`,
          photo_data_url: "",
          project_id: "",
          day_id: "",
        } as Partial<Omit<SavedLocation, "id" | "created_at">>);
        written.push(saved);
      } catch {
        // ignore duplicate / write errors
      }
    }
    return written;
  } catch (err) {
    console.warn("[CFA] USFS seed failed, using static fallback:", err);
    return loadStaticSeed();
  }
}

// ─── Static campsite seed ────────────────────────────────────────────────────────
// Minimal fallback seed — used only when /api/campsites is unavailable.
async function loadStaticSeed(): Promise<SavedLocation[]> {
  try {
    const res = await fetch("/data/campsites-seed.json");
    if (!res.ok) return [];

    const items: {
      name: string;
      type: string;
      lat: number;
      lng: number;
      description: string;
      location?: string;
    }[] = await res.json();

    const written: SavedLocation[] = [];
    for (const item of items.slice(0, 200)) {
      try {
        const saved = await db.createLocation({
          name: item.name,
          lat: item.lat,
          lng: item.lng,
          type: (item.type as SavedLocation["type"]) || "campsite",
          description: item.description || item.location || "Free USFS campsite",
          photo_data_url: "",
          project_id: "",
          day_id: "",
        } as Partial<Omit<SavedLocation, "id" | "created_at">>);
        written.push(saved);
      } catch {
        // ignore duplicate id conflicts
      }
    }
    return written;
  } catch (err) {
    console.warn("[CFA] Static seed load failed:", err);
    return [];
  }
}

interface LocationState {
  locations: SavedLocation[];
  photos: Record<string, LocationPhoto[]>; // locationId -> photos
  loading: boolean;

  loadLocations: () => Promise<void>;
  createLocation: (data: Partial<Omit<SavedLocation, "id" | "created_at">>) => Promise<SavedLocation>;
  updateLocation: (id: string, data: Partial<Omit<SavedLocation, "id" | "created_at">>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;

  loadPhotos: (locationId: string) => Promise<void>;
  addPhoto: (locationId: string, dataUrl: string, caption?: string) => Promise<void>;
  deletePhoto: (photoId: string, locationId: string) => Promise<void>;

  locationsByType: () => Record<SavedLocation["type"], SavedLocation[]>;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  locations: [],
  photos: {},
  loading: false,

  loadLocations: async () => {
    set({ loading: true });
    let locations = await db.getAllLocations();

    if (locations.length === 0) {
      // Seed from USFS ArcGIS API (primary), fallback to static seed
      const seeded = await seedUSFSLocations();
      if (seeded.length > 0) {
        locations = seeded;
      } else {
        locations = await loadStaticSeed();
      }
    }

    set({ locations, loading: false });
  },

  createLocation: async (data) => {
    const location = await db.createLocation(data);
    set((s) => ({ locations: [...s.locations, location] }));
    try { await api.locations.create(data); } catch { /* ignore */ }
    return location;
  },

  updateLocation: async (id, data) => {
    await db.updateLocation(id, data);
    set((s) => ({
      locations: s.locations.map((l) => (l.id === id ? { ...l, ...data } : l)),
    }));
    try { await api.locations.update(id, data); } catch { /* ignore */ }
  },

  deleteLocation: async (id) => {
    await db.deleteLocation(id);
    set((s) => {
      const { [id]: _, ...restPhotos } = s.photos;
      return { locations: s.locations.filter((l) => l.id !== id), photos: restPhotos };
    });
    try { await api.locations.delete(id); } catch { /* ignore */ }
  },

  loadPhotos: async (locationId) => {
    const photos = await db.getLocationPhotos(locationId);
    set((s) => ({ photos: { ...s.photos, [locationId]: photos } }));
  },

  addPhoto: async (locationId, dataUrl, caption) => {
    const photo = await db.addLocationPhoto(locationId, dataUrl, caption ?? "");
    set((s) => ({
      photos: {
        ...s.photos,
        [locationId]: [...(s.photos[locationId] ?? []), photo],
      },
    }));
    try {
      await fetch(`/api/locations/${locationId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data_url: dataUrl, caption: caption ?? "" }),
      });
    } catch { /* ignore */ }
  },

  deletePhoto: async (photoId, locationId) => {
    await db.deleteLocationPhoto(photoId);
    set((s) => ({
      photos: {
        ...s.photos,
        [locationId]: (s.photos[locationId] ?? []).filter((p) => p.id !== photoId),
      },
    }));
    try {
      await fetch(`/api/locations/${locationId}/photos/${photoId}`, { method: "DELETE" });
    } catch { /* ignore */ }
  },

  locationsByType: () => {
    const { locations } = get();
    const types: SavedLocation["type"][] = [
      "campsite", "photo_spot", "accommodation", "POI", "other",
    ];
    const result = {} as Record<SavedLocation["type"], SavedLocation[]>;
    for (const type of types) {
      result[type] = locations.filter((l) => l.type === type);
    }
    return result;
  },
}));
