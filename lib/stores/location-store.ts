"use client";

import { create } from "zustand";
import * as db from "@/lib/db";
import type { SavedLocation, LocationPhoto } from "@/lib/db";
import { api } from "@/lib/api-client";

interface SeedResult {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "campsite" | "photo_spot";
  description: string;
  source: string;
}

// ─── OSM Overpass seeding ───────────────────────────────────────────────────────
// Queries OpenStreetMap for real campsite and photo spot data across the lower-48.
// Returns raw SavedLocation-shaped objects (no project_id/day_id yet — the db layer
// can accept them as optional).
async function seedOSMLocations(): Promise<SavedLocation[]> {
  const results: SeedResult[] = [];

  // Overpass QL — search for tourism=camppitch and natural=peak/valley viewpoints
  // across the continental US bounding box
  const overpassQuery = `
[out:json][timeout:30];
(
  // USGS-named scenic viewpoints and photography hotspots
  node["natural"="peak"]["name"](31.0,-125.0,49.5,-93.0);
  node["natural"="cliff"]["name"](31.0,-125.0,49.5,-93.0);
  node["natural"="viewpoint"]["name"](31.0,-125.0,49.5,-93.0);
  node["tourism"="viewpoint"]["name"](31.0,-125.0,49.5,-93.0);
  node["tourism"="camp_pitch"]["name"](31.0,-125.0,49.5,-93.0);
  node["tourism"="campsite"]["name"](31.0,-125.0,49.5,-93.0);
  node["leisure"="camp_pitch"]["name"](31.0,-125.0,49.5,-93.0);
  node["leisure"="campsite"]["name"](31.0,-125.0,49.5,-93.0);
  node["site"="camp"](31.0,-125.0,49.5,-93.0);
  way["natural"="peak"]["name"](31.0,-125.0,49.5,-93.0);
  way["natural"="cliff"]["name"](31.0,-125.0,49.5,-93.0);
  way["tourism"="viewpoint"]["name"](31.0,-125.0,49.5,-93.0);
  way["tourism"="campsite"]["name"](31.0,-125.0,49.5,-93.0);
  way["leisure"="campsite"]["name"](31.0,-125.0,49.5,-93.0);
);
out center;
`.trim();

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    });

    if (!res.ok) throw new Error(`Overpass ${res.status}`);

    const json = await res.json();
    const elements = json.elements ?? [];

    for (const el of elements) {
      const name: string = el.tags?.name ?? "";
      if (!name) continue;

      let lat: number, lng: number;
      if (el.type === "node") {
        lat = el.lat;
        lng = el.lon;
      } else if (el.type === "way" && el.center) {
        lat = el.center.lat;
        lng = el.center.lon;
      } else {
        continue;
      }

      const isPhotoSpot =
        el.tags?.natural === "peak" ||
        el.tags?.natural === "cliff" ||
        el.tags?.natural === "viewpoint" ||
        el.tags?.tourism === "viewpoint";

      results.push({
        id: `osm-${el.id}`,
        name,
        lat,
        lng,
        type: isPhotoSpot ? "photo_spot" : "campsite",
        description:
          el.tags?.description ??
          el.tags?.["tourism:description"] ??
          el.tags?.note ??
          "",
        source: `OSM: ${el.tags?.["source:location"] ?? "OpenStreetMap"}`,
      });
    }
  } catch (err) {
    console.warn("[CFA] OSM seed failed:", err);
  }

  // Deduplicate by name + rounded lat/lng (within ~100m)
  const seen = new Set<string>();
  const deduped = results.filter((r) => {
    const key = `${r.name.toLowerCase()}@${r.lat.toFixed(2)},${r.lng.toFixed(2)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Write each to IndexedDB
  const written: SavedLocation[] = [];
  for (const r of deduped.slice(0, 500)) {
    try {
      // project_id/day_id are required in the schema but we treat them as optional
      // for seeded data — write with empty string and let the app fill them on use
      const saved = await db.createLocation({
        name: r.name,
        lat: r.lat,
        lng: r.lng,
        type: r.type,
        description: r.description || r.source,
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

    // First launch — seed from OpenStreetMap Overpass API
    if (locations.length === 0) {
      const seeded = await seedOSMLocations();
      if (seeded.length > 0) {
        locations = seeded;
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
      "campsite", "photo_spot", "accommodation", "food", "POI", "other",
    ];
    const result = {} as Record<SavedLocation["type"], SavedLocation[]>;
    for (const type of types) {
      result[type] = locations.filter((l) => l.type === type);
    }
    return result;
  },
}));
