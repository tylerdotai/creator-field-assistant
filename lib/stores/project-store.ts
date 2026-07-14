"use client";

import { create } from "zustand";
import * as db from "@/lib/db";
import type { Project, Day, Shot } from "@/lib/db";
import { api } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectState {
  projects: Project[];
  currentProjectId: string | null;
  days: Day[];
  shots: Record<string, Shot[]>; // dayId -> shots
  loading: boolean;

  // Actions
  loadProjects: () => Promise<void>;
  createProject: (name: string) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (id: string | null) => void;

  loadDays: (projectId: string) => Promise<void>;
  createDay: (projectId: string, locationName: string, date?: string) => Promise<Day>;
  updateDay: (id: string, data: Partial<Pick<Day, "date" | "location_name" | "notes" | "order">>) => Promise<void>;
  deleteDay: (id: string) => Promise<void>;

  loadShots: (dayId: string) => Promise<void>;
  createShot: (dayId: string, data?: Partial<Omit<Shot, "id" | "day_id">>) => Promise<Shot>;
  updateShot: (id: string, data: Partial<Omit<Shot, "id" | "day_id">>) => Promise<void>;
  deleteShot: (id: string) => Promise<void>;
  toggleShotComplete: (id: string) => Promise<void>;
  reorderShots: (dayId: string, orderedIds: string[]) => Promise<void>;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProjectId: null,
  days: [],
  shots: {},
  loading: false,

  loadProjects: async () => {
    set({ loading: true });
    const projects = await db.getAllProjects();
    set({ projects, loading: false });
  },

  createProject: async (name) => {
    const project = await db.createProject(name);
    set((s) => ({ projects: [project, ...s.projects] }));
    try { await api.projects.create(name); } catch { /* IndexedDB wins */ }
    return project;
  },

  deleteProject: async (id) => {
    await db.deleteProject(id);
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      currentProjectId: s.currentProjectId === id ? null : s.currentProjectId,
    }));
    try { await api.projects.delete(id); } catch { /* IndexedDB wins */ }
  },

  setCurrentProject: (id) => set({ currentProjectId: id }),

  loadDays: async (projectId) => {
    const days = await db.getDaysByProject(projectId);
    set({ days });
  },

  createDay: async (projectId, locationName, date) => {
    const day = await db.createDay(projectId, locationName, date);
    set((s) => ({ days: [...s.days, day] }));
    try { await api.days.create(projectId, { location_name: locationName, date }); } catch { /* IndexedDB wins */ }
    return day;
  },

  updateDay: async (id, data) => {
    await db.updateDay(id, data);
    set((s) => ({
      days: s.days.map((d) => (d.id === id ? { ...d, ...data } : d)),
    }));
    try { await api.days.update(id, data); } catch { /* IndexedDB wins */ }
  },

  deleteDay: async (id) => {
    await db.deleteDay(id);
    set((s) => {
      const { [id]: _, ...rest } = s.shots;
      return { days: s.days.filter((d) => d.id !== id), shots: rest };
    });
    try { await api.days.delete(id); } catch { /* IndexedDB wins */ }
  },

  loadShots: async (dayId) => {
    const shots = await db.getShotsByDay(dayId);
    set((s) => ({ shots: { ...s.shots, [dayId]: shots } }));
  },

  createShot: async (dayId, data) => {
    const shot = await db.createShot(dayId, data);
    set((s) => ({
      shots: {
        ...s.shots,
        [dayId]: [...(s.shots[dayId] ?? []), shot],
      },
    }));
    try { await api.shots.create(dayId, data ?? {}); } catch { /* IndexedDB wins */ }
    return shot;
  },

  updateShot: async (id, data) => {
    await db.updateShot(id, data);
    set((s) => {
      const newShots = { ...s.shots };
      for (const dayId of Object.keys(newShots)) {
        newShots[dayId] = newShots[dayId].map((sh) =>
          sh.id === id ? { ...sh, ...data } : sh
        );
      }
      return { shots: newShots };
    });
    try { await api.shots.update(id, data); } catch { /* IndexedDB wins */ }
  },

  deleteShot: async (id) => {
    await db.deleteShot(id);
    set((s) => {
      const newShots = { ...s.shots };
      for (const dayId of Object.keys(newShots)) {
        newShots[dayId] = newShots[dayId].filter((sh) => sh.id !== id);
      }
      return { shots: newShots };
    });
    try { await api.shots.delete(id); } catch { /* IndexedDB wins */ }
  },

  toggleShotComplete: async (id) => {
    const { shots } = get();
    let shot: Shot | undefined;
    let dayId: string | undefined;
    for (const [dId, shs] of Object.entries(shots)) {
      shot = shs.find((s) => s.id === id);
      if (shot) { dayId = dId; break; }
    }
    if (!shot || !dayId) return;
    const updated = await db.updateShot(id, { completed: !shot.completed });
    if (updated) {
      set((s) => ({
        shots: {
          ...s.shots,
          [dayId!]: s.shots[dayId!].map((sh) =>
            sh.id === id ? updated : sh
          ),
        },
      }));
    }
  },

  reorderShots: async (dayId, orderedIds) => {
    await db.reorderShots(dayId, orderedIds);
    const current = get().shots[dayId] ?? [];
    const reordered = orderedIds
      .map((oid) => current.find((s) => s.id === oid))
      .filter(Boolean) as Shot[];
    set((s) => ({ shots: { ...s.shots, [dayId]: reordered } }));
  },
}));
