"use client";

import { create } from "zustand";
import * as db from "@/lib/db";
import type { SavedLocation, LocationPhoto } from "@/lib/db";

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
    const locations = await db.getAllLocations();
    set({ locations, loading: false });
  },

  createLocation: async (data) => {
    const location = await db.createLocation(data);
    set((s) => ({ locations: [...s.locations, location] }));
    return location;
  },

  updateLocation: async (id, data) => {
    await db.updateLocation(id, data);
    set((s) => ({
      locations: s.locations.map((l) => (l.id === id ? { ...l, ...data } : l)),
    }));
  },

  deleteLocation: async (id) => {
    await db.deleteLocation(id);
    set((s) => {
      const { [id]: _, ...restPhotos } = s.photos;
      return { locations: s.locations.filter((l) => l.id !== id), photos: restPhotos };
    });
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
  },

  deletePhoto: async (photoId, locationId) => {
    await db.deleteLocationPhoto(photoId);
    set((s) => ({
      photos: {
        ...s.photos,
        [locationId]: (s.photos[locationId] ?? []).filter((p) => p.id !== photoId),
      },
    }));
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
