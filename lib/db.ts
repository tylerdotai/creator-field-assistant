import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface Project {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
}

export interface Day {
  id: string;
  project_id: string;
  date: string;
  location_name: string;
  notes: string;
  order: number;
}

export interface Shot {
  id: string;
  day_id: string;
  type: "vlog" | "broll" | "interview" | "aerial";
  description: string;
  lens: "16mm" | "35mm" | "50mm" | "85mm";
  format: "9:16" | "16:9" | "1:1" | "4:5";
  status: "planned" | "shot" | "needs_review";
  notes: string;
  completed: boolean;
  order: number;
}

export interface GearItem {
  id: string;
  name: string;
  category: "camera" | "lens" | "lighting" | "audio" | "grip" | "power" | "storage" | "accessory";
  weight: number;
  weight_unit: "g" | "oz";
  is_packed: boolean;
  is_owned: boolean;
  notes: string;
  image_data_url: string;
  order: number;
}

export interface KitPreset {
  id: string;
  name: string;
  item_ids: string[];
  is_default: boolean;
}

export interface Checklist {
  id: string;
  name: string;
  project_id: string;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  text: string;
  checked: boolean;
  order: number;
  is_custom: boolean;
}

export interface SavedLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "campsite" | "photo_spot" | "accommodation" | "food" | "POI" | "other";
  description: string;
  photo_data_url: string;
  project_id: string;
  day_id: string;
  created_at: number;
}

export interface LocationPhoto {
  id: string;
  location_id: string;
  data_url: string;
  caption: string;
  created_at: number;
}

interface AppDBSchema extends DBSchema {
  projects: { key: string; value: Project; indexes: { "by-updated": number } };
  days: { key: string; value: Day; indexes: { "by-project": string } };
  shots: { key: string; value: Shot; indexes: { "by-day": string } };
  gear: { key: string; value: GearItem; indexes: { "by-category": string } };
  kits: { key: string; value: KitPreset };
  checklists: { key: string; value: Checklist; indexes: { "by-project": string } };
  checklistItems: { key: string; value: ChecklistItem; indexes: { "by-checklist": string } };
  locations: { key: string; value: SavedLocation };
  locationPhotos: { key: string; value: LocationPhoto; indexes: { "by-location": string } };
}

let dbPromise: Promise<IDBPDatabase<AppDBSchema>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<AppDBSchema>("creator-field-assistant", 1, {
      upgrade(db) {
        // Projects
        const projects = db.createObjectStore("projects", { keyPath: "id" });
        projects.createIndex("by-updated", "updated_at");

        // Days
        const days = db.createObjectStore("days", { keyPath: "id" });
        days.createIndex("by-project", "project_id");

        // Shots
        const shots = db.createObjectStore("shots", { keyPath: "id" });
        shots.createIndex("by-day", "day_id");

        // Gear
        const gear = db.createObjectStore("gear", { keyPath: "id" });
        gear.createIndex("by-category", "category");

        // Kit Presets
        db.createObjectStore("kits", { keyPath: "id" });

        // Checklists
        const checklists = db.createObjectStore("checklists", { keyPath: "id" });
        checklists.createIndex("by-project", "project_id");

        // Checklist Items
        const checklistItems = db.createObjectStore("checklistItems", { keyPath: "id" });
        checklistItems.createIndex("by-checklist", "checklist_id");

        // Locations
        db.createObjectStore("locations", { keyPath: "id" });

        // Location Photos
        const locationPhotos = db.createObjectStore("locationPhotos", { keyPath: "id" });
        locationPhotos.createIndex("by-location", "location_id");
      },
    });
  }
  return dbPromise;
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function getAllProjects() {
  const db = await getDB();
  const all = await db.getAllFromIndex("projects", "by-updated");
  return all.reverse(); // newest first
}

export async function getProject(id: string) {
  const db = await getDB();
  return db.get("projects", id);
}

export async function createProject(name: string) {
  const db = await getDB();
  const now = Date.now();
  const project: Project = { id: crypto.randomUUID(), name, created_at: now, updated_at: now };
  await db.put("projects", project);
  return project;
}

export async function updateProject(id: string, data: Partial<Pick<Project, "name">>) {
  const db = await getDB();
  const existing = await db.get("projects", id);
  if (!existing) return;
  const updated = { ...existing, ...data, updated_at: Date.now() };
  await db.put("projects", updated);
  return updated;
}

export async function deleteProject(id: string) {
  const db = await getDB();
  const days = await db.getAllFromIndex("days", "by-project", id);
  for (const day of days) {
    const shots = await db.getAllFromIndex("shots", "by-day", day.id);
    for (const shot of shots) await db.delete("shots", shot.id);
    await db.delete("days", day.id);
  }
  await db.delete("projects", id);
}

// ─── Days ────────────────────────────────────────────────────────────────────

export async function getDaysByProject(projectId: string) {
  const db = await getDB();
  const all = await db.getAllFromIndex("days", "by-project", projectId);
  return all.sort((a, b) => a.order - b.order);
}

export async function createDay(projectId: string, locationName: string, date = "") {
  const db = await getDB();
  const days = await getDaysByProject(projectId);
  const day: Day = {
    id: crypto.randomUUID(),
    project_id: projectId,
    date,
    location_name: locationName,
    notes: "",
    order: days.length,
  };
  await db.put("days", day);
  // touch project updated_at
  await updateProject(projectId, {});
  return day;
}

export async function updateDay(id: string, data: Partial<Pick<Day, "date" | "location_name" | "notes" | "order">>) {
  const db = await getDB();
  const existing = await db.get("days", id);
  if (!existing) return;
  const updated = { ...existing, ...data };
  await db.put("days", updated);
  return updated;
}

export async function deleteDay(id: string) {
  const db = await getDB();
  const shots = await db.getAllFromIndex("shots", "by-day", id);
  for (const shot of shots) await db.delete("shots", shot.id);
  await db.delete("days", id);
}

// ─── Shots ───────────────────────────────────────────────────────────────────

export async function getShotsByDay(dayId: string) {
  const db = await getDB();
  const all = await db.getAllFromIndex("shots", "by-day", dayId);
  return all.sort((a, b) => a.order - b.order);
}

export async function createShot(dayId: string, data: Partial<Omit<Shot, "id" | "day_id">> = {}) {
  const db = await getDB();
  const shots = await getShotsByDay(dayId);
  const shot: Shot = {
    id: crypto.randomUUID(),
    day_id: dayId,
    type: data.type ?? "vlog",
    description: data.description ?? "",
    lens: data.lens ?? "35mm",
    format: data.format ?? "16:9",
    status: data.status ?? "planned",
    notes: data.notes ?? "",
    completed: data.completed ?? false,
    order: shots.length,
  };
  await db.put("shots", shot);
  return shot;
}

export async function updateShot(id: string, data: Partial<Omit<Shot, "id" | "day_id">>) {
  const db = await getDB();
  const existing = await db.get("shots", id);
  if (!existing) return;
  const updated = { ...existing, ...data };
  await db.put("shots", updated);
  return updated;
}

export async function deleteShot(id: string) {
  const db = await getDB();
  await db.delete("shots", id);
}

export async function reorderShots(dayId: string, orderedIds: string[]) {
  const db = await getDB();
  for (let i = 0; i < orderedIds.length; i++) {
    const shot = await db.get("shots", orderedIds[i]);
    if (shot) {
      shot.order = i;
      await db.put("shots", shot);
    }
  }
}

// ─── Gear ────────────────────────────────────────────────────────────────────

export async function getAllGear() {
  const db = await getDB();
  const all = await db.getAll("gear");
  return all.sort((a, b) => a.order - b.order);
}

export async function createGearItem(data: Partial<Omit<GearItem, "id">> = {}) {
  const db = await getDB();
  const all = await db.getAll("gear");
  const item: GearItem = {
    id: crypto.randomUUID(),
    name: data.name ?? "New Item",
    category: data.category ?? "accessory",
    weight: data.weight ?? 0,
    weight_unit: data.weight_unit ?? "g",
    is_packed: data.is_packed ?? false,
    is_owned: data.is_owned ?? true,
    notes: data.notes ?? "",
    image_data_url: data.image_data_url ?? "",
    order: all.length,
  };
  await db.put("gear", item);
  return item;
}

export async function updateGearItem(id: string, data: Partial<Omit<GearItem, "id">>) {
  const db = await getDB();
  const existing = await db.get("gear", id);
  if (!existing) return;
  const updated = { ...existing, ...data };
  await db.put("gear", updated);
  return updated;
}

export async function deleteGearItem(id: string) {
  const db = await getDB();
  await db.delete("gear", id);
}

// ─── Kit Presets ─────────────────────────────────────────────────────────────

export async function getAllKitPresets() {
  const db = await getDB();
  return db.getAll("kits");
}

export async function createKitPreset(name: string, itemIds: string[]) {
  const db = await getDB();
  const preset: KitPreset = { id: crypto.randomUUID(), name, item_ids: itemIds, is_default: false };
  await db.put("kits", preset);
  return preset;
}

export async function deleteKitPreset(id: string) {
  const db = await getDB();
  await db.delete("kits", id);
}

export async function packKitPreset(presetId: string, packed: boolean) {
  const db = await getDB();
  const preset = await db.get("kits", presetId);
  if (!preset) return;
  for (const itemId of preset.item_ids) {
    await updateGearItem(itemId, { is_packed: packed });
  }
}

// ─── Checklists ──────────────────────────────────────────────────────────────

export async function getAllChecklists() {
  const db = await getDB();
  return db.getAll("checklists");
}

export async function createChecklist(name: string, projectId = "") {
  const db = await getDB();
  const checklist: Checklist = { id: crypto.randomUUID(), name, project_id: projectId };
  await db.put("checklists", checklist);

  // Seed default items
  const defaults = getDefaultChecklistItems(checklist.id);
  for (const item of defaults) {
    await db.put("checklistItems", item);
  }

  return checklist;
}

function getDefaultChecklistItems(checklistId: string): ChecklistItem[] {
  const sections = [
    {
      label: "Battery Check",
      items: [
        "Format SD card",
        "Charge all batteries",
        "Pack NPF 970 batteries (x2)",
        "Pack dummy battery + AC adapter",
        "Pack SD cards",
        "Check ND filter",
      ],
    },
    {
      label: "Gear Pack",
      items: [
        "Camera body",
        "16-50mm kit lens",
        "SmallRig cage",
        "TOPEAK tabletop handle",
        "Suction mount",
        "Magic arm",
        "Tripod / selfie stick",
      ],
    },
    {
      label: "Shot Prep",
      items: [
        "Review shot list",
        "Scout locations on map",
        "Load route in MapLibre offline area",
        "Clear gallery space (32GB minimum)",
      ],
    },
    {
      label: "Audio Check",
      items: [
        "Test onboard mic",
        "Check wind cover",
      ],
    },
  ];

  const result: ChecklistItem[] = [];
  let order = 0;
  for (const section of sections) {
    for (const text of section.items) {
      result.push({
        id: crypto.randomUUID(),
        checklist_id: checklistId,
        text,
        checked: false,
        order: order++,
        is_custom: false,
      });
    }
  }
  return result;
}

export async function getChecklistItems(checklistId: string) {
  const db = await getDB();
  const all = await db.getAllFromIndex("checklistItems", "by-checklist", checklistId);
  return all.sort((a, b) => a.order - b.order);
}

export async function createChecklistItem(checklistId: string, text: string) {
  const db = await getDB();
  const items = await getChecklistItems(checklistId);
  const item: ChecklistItem = {
    id: crypto.randomUUID(),
    checklist_id: checklistId,
    text,
    checked: false,
    order: items.length,
    is_custom: true,
  };
  await db.put("checklistItems", item);
  return item;
}

export async function updateChecklistItem(id: string, data: Partial<Pick<ChecklistItem, "text" | "checked" | "order">>) {
  const db = await getDB();
  const existing = await db.get("checklistItems", id);
  if (!existing) return;
  const updated = { ...existing, ...data };
  await db.put("checklistItems", updated);
  return updated;
}

export async function deleteChecklistItem(id: string) {
  const db = await getDB();
  await db.delete("checklistItems", id);
}

export async function resetChecklist(checklistId: string) {
  const db = await getDB();
  const items = await getChecklistItems(checklistId);
  for (const item of items) {
    await db.put("checklistItems", { ...item, checked: false });
  }
}

export async function deleteChecklist(id: string) {
  const db = await getDB();
  const items = await db.getAllFromIndex("checklistItems", "by-checklist", id);
  for (const item of items) await db.delete("checklistItems", item.id);
  await db.delete("checklists", id);
}

// ─── Locations ────────────────────────────────────────────────────────────────

export async function getAllLocations() {
  const db = await getDB();
  return db.getAll("locations");
}

export async function createLocation(data: Partial<Omit<SavedLocation, "id" | "created_at">>) {
  const db = await getDB();
  const location: SavedLocation = {
    id: crypto.randomUUID(),
    name: data.name ?? "New Location",
    lat: data.lat ?? 0,
    lng: data.lng ?? 0,
    type: data.type ?? "photo_spot",
    description: data.description ?? "",
    photo_data_url: data.photo_data_url ?? "",
    project_id: data.project_id ?? "",
    day_id: data.day_id ?? "",
    created_at: Date.now(),
  };
  await db.put("locations", location);
  return location;
}

export async function updateLocation(id: string, data: Partial<Omit<SavedLocation, "id" | "created_at">>) {
  const db = await getDB();
  const existing = await db.get("locations", id);
  if (!existing) return;
  const updated = { ...existing, ...data };
  await db.put("locations", updated);
  return updated;
}

export async function deleteLocation(id: string) {
  const db = await getDB();
  const photos = await db.getAllFromIndex("locationPhotos", "by-location", id);
  for (const photo of photos) await db.delete("locationPhotos", photo.id);
  await db.delete("locations", id);
}

// ─── Location Photos ──────────────────────────────────────────────────────────

export async function getLocationPhotos(locationId: string) {
  const db = await getDB();
  const all = await db.getAllFromIndex("locationPhotos", "by-location", locationId);
  return all.sort((a, b) => a.created_at - b.created_at);
}

export async function addLocationPhoto(locationId: string, dataUrl: string, caption = "") {
  const db = await getDB();
  const photo: LocationPhoto = {
    id: crypto.randomUUID(),
    location_id: locationId,
    data_url: dataUrl,
    caption,
    created_at: Date.now(),
  };
  await db.put("locationPhotos", photo);
  return photo;
}

export async function deleteLocationPhoto(id: string) {
  const db = await getDB();
  await db.delete("locationPhotos", id);
}

// ─── Export / Import ─────────────────────────────────────────────────────────

export async function exportAllData() {
  const db = await getDB();
  const [projects, days, shots, gear, kits, checklists, checklistItems, locations, locationPhotos] =
    await Promise.all([
      db.getAll("projects"),
      db.getAll("days"),
      db.getAll("shots"),
      db.getAll("gear"),
      db.getAll("kits"),
      db.getAll("checklists"),
      db.getAll("checklistItems"),
      db.getAll("locations"),
      db.getAll("locationPhotos"),
    ]);

  return {
    version: 1,
    exported_at: new Date().toISOString(),
    data: { projects, days, shots, gear, kits, checklists, checklistItems, locations, locationPhotos },
  };
}

export async function importAllData(
  json: Awaited<ReturnType<typeof exportAllData>>
) {
  const db = await getDB();
  type StoreName = "projects" | "days" | "shots" | "gear" | "kits" | "checklists" | "checklistItems" | "locations" | "locationPhotos";
  const storeNames: StoreName[] = ["projects", "days", "shots", "gear", "kits", "checklists", "checklistItems", "locations", "locationPhotos"];
  const tx = db.transaction(storeNames, "readwrite");
  for (const key of storeNames) {
    const store = tx.objectStore(key);
    await store.clear();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = json.data[key as keyof typeof json.data] as any[];
    for (const item of items) {
      await store.put(item);
    }
  }
  await tx.done;
}

// ─── UUID ────────────────────────────────────────────────────────────────────
export function uuid() {
  return crypto.randomUUID();
}
