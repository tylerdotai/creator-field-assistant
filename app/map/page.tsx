"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, MapPin, Camera, Trash2, Navigation, X,
  Mountain, Building, Tent, Star, Search, Settings,
  ListTodo, Backpack, ClipboardList, Crosshair
} from "lucide-react";
import { AppShell, PageHeader, Sheet } from "@/components/app-shell";
import { Button, Input, Select, Card, Badge } from "@/components/ui";
import { useLocationStore } from "@/lib/stores/location-store";
import type { SavedLocation } from "@/lib/db";

const TYPE_ICONS: Record<SavedLocation["type"], React.ReactNode> = {
  campsite: <Tent size={12} />,
  photo_spot: <Camera size={12} />,
  accommodation: <Building size={12} />,
  POI: <Star size={12} />,
  other: <MapPin size={12} />,
};

const TYPE_BADGE_VARIANT = (
  t: SavedLocation["type"]
): "accent" | "success" | "warning" | "outline" => {
  const map: Record<SavedLocation["type"], "accent" | "success" | "warning" | "outline"> = {
    campsite: "accent",
    photo_spot: "success",
    accommodation: "warning",
    POI: "outline",
    other: "outline",
  };
  return map[t];
};

const TYPE_OPTIONS = [
  { value: "campsite", label: "Campsite" },
  { value: "photo_spot", label: "Photo Spot" },
  { value: "accommodation", label: "Accommodation" },
  { value: "POI", label: "Point of Interest" },
  { value: "other", label: "Other" },
];

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "campsite", label: "Campsites" },
  { value: "photo_spot", label: "Photo Spots" },
  { value: "accommodation", label: "Stay" },
  { value: "POI", label: "POI" },
];

export default function MapPage() {
  const {
    locations, photos, loadLocations, createLocation, updateLocation,
    deleteLocation, loadPhotos, addPhoto,
  } = useLocationStore();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [filter, setFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<SavedLocation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    if (!mapRef.current) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`,
        { headers: { Accept: "application/json" } }
      );
      const results = await res.json();
      if (results && results.length > 0) {
        const { lat, lon } = results[0];
        const map = mapRef.current as { flyTo: (opts: object) => void };
        map.flyTo({ center: [parseFloat(lon), parseFloat(lat)], zoom: 10, essential: true });
        setSearchQuery("");
      }
    } catch {
      // silent fail
    }
  };

  // Form
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<SavedLocation["type"]>("photo_spot");
  const [formLat, setFormLat] = useState("");
  const [formLng, setFormLng] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markersRef = useRef<unknown[]>([]);
  const lastFetchRef = useRef(0);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  // Initialize MapLibre
  useEffect(() => {
    let map: unknown;

    const init = async () => {
      if (!mapContainerRef.current) return;

      const maplibregl = (await import("maplibre-gl")).default;
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            "osm-tiles": {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [
            {
              id: "osm-tiles",
              type: "raster",
              source: "osm-tiles",
              minzoom: 0,
              maxzoom: 19,
            },
          ],
        },
        center: [-96.7970, 32.7767],
        zoom: 6,
      });

      mapRef.current = map;

      (map as { on: (event: string, cb: () => void) => void }).on("load", () => {
        setMapReady(true);
        // Seed initial spots
        fetchNearbySpots();
        // Listen for map moves
        (map as unknown as { on: (event: string, cb: () => void) => void }).on("moveend", fetchNearbySpots);
      });

      // Long-press on map to drop a pin
      let startPos: { x: number; y: number } | null = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map as any).on("touchstart", (e: { touches?: { clientX: number; clientY: number }[] }) => {
        if (!e.touches || e.touches.length !== 1) return;
        startPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        longPressTimer.current = setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const lngLat = (map as any).unproject([startPos!.x, startPos!.y]);
          setFormLat(String(lngLat.lat.toFixed(6)));
          setFormLng(String(lngLat.lng.toFixed(6)));
          setFormName("");
          setFormType("photo_spot");
          setFormNotes("");
          setSelectedLocation(null);
          setSheetOpen(true);
          startPos = null;
        }, 600);
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map as any).on("touchmove", () => {
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
        startPos = null;
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map as any).on("touchend", () => {
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
        startPos = null;
      });
      // Mouse long-click (desktop)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map as any).on("mousedown", (e: { point?: { x: number; y: number }; button?: number }) => {
        if (e.button !== 0) return;
        if (!e.point) return;
        startPos = { x: e.point.x, y: e.point.y };
        longPressTimer.current = setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const lngLat = (map as any).unproject([startPos!.x, startPos!.y]);
          setFormLat(String(lngLat.lat.toFixed(6)));
          setFormLng(String(lngLat.lng.toFixed(6)));
          setFormName("");
          setFormType("photo_spot");
          setFormNotes("");
          setSelectedLocation(null);
          setSheetOpen(true);
          startPos = null;
        }, 600);
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map as any).on("mousemove", () => {
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
        startPos = null;
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map as any).on("mouseup", () => {
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
        startPos = null;
      });
    };

    init().catch(() => {
      // maplibre may fail in some environments
    });

    return () => {
      if (map && typeof (map as { remove: () => void }).remove === "function") {
        (map as { remove: () => void }).remove();
      }
    };
  }, []);

  // Add markers for locations
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    const addMarkers = async () => {
      const maplibregl = (await import("maplibre-gl")).default;

      // Remove existing markers via ref
      for (const m of markersRef.current) {
        if (typeof (m as { remove: () => void }).remove === "function") {
          (m as { remove: () => void }).remove();
        }
      }
      markersRef.current = [];

      const typeColor: Record<string, string> = {
        campsite: "var(--accent, #00d2ff)",
        photo_spot: "#22c55e",
        accommodation: "#f59e0b",
        other: "#94a3b8",
        POI: "#94a3b8",
        food: "#94a3b8",
      };

      locations
        .filter((loc) => filter === "all" || loc.type === filter)
        .forEach((loc) => {
          if (!loc.lat || !loc.lng) return;

          const el = document.createElement("div");
          const color = typeColor[loc.type] ?? "#94a3b8";
          el.style.cssText = `
            width: 32px; height: 32px;
            background: ${color};
            border: 2px solid #0a0a0b;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          `;

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([loc.lng, loc.lat])
            .addTo(map as Parameters<typeof maplibregl.Marker.prototype.addTo>[0]);

          el.addEventListener("click", () => {
            setSelectedLocation(loc);
          });

          markersRef.current.push(marker);
        });
    };

    addMarkers();

    return () => {
      for (const m of markersRef.current) {
        if (typeof (m as { remove: () => void }).remove === "function") {
          (m as { remove: () => void }).remove();
        }
      }
      markersRef.current = [];
    };
  }, [locations, filter, mapReady]);

  // Auto-load nearby spots on map pan
  const fetchNearbySpots = async () => {
    if (!mapRef.current) return;
    const now = Date.now();
    if (now - lastFetchRef.current < 30000) return; // debounce 30s
    lastFetchRef.current = now;

    setLoadingNearby(true);
    try {
      const bounds = mapRef.current.getBounds();
      const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
      const res = await fetch(`/api/campsites?bbox=${bbox}`);
      const json = await res.json();
      const rawLocations: Array<{
        name: string;
        lat: number;
        lng: number;
        type: SavedLocation["type"];
        description: string;
        location: string;
        url: string;
        directions: string;
      }> = json.locations || [];

      for (const item of rawLocations) {
        if (!item.name) continue;

        // Skip if already exists (same name + ~100m)
        const existing = locations.find((l) =>
          l.name === item.name &&
          Math.abs((l.lat ?? 0) - item.lat) < 0.001 &&
          Math.abs((l.lng ?? 0) - item.lng) < 0.001
        );
        if (existing) continue;

        await createLocation({
          name: item.name,
          type: item.type,
          lat: item.lat,
          lng: item.lng,
          description: item.description || item.location,
        });
      }

      await loadLocations();
    } catch {
      // Silent fail
    } finally {
      setLoadingNearby(false);
    }
  };

  const filteredLocations = locations.filter((loc) => {
    if (filter !== "all" && loc.type !== filter) return false;
    if (searchQuery && !loc.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const openCreateSheet = () => {
    setSelectedLocation(null);
    setFormName("");
    setFormType("photo_spot");
    setFormLat("");
    setFormLng("");
    setFormNotes("");
    setSheetOpen(true);
  };

  const openEditSheet = (loc: SavedLocation) => {
    setSelectedLocation(loc);
    setFormName(loc.name);
    setFormType(loc.type);
    setFormLat(String(loc.lat ?? ""));
    setFormLng(String(loc.lng ?? ""));
    setFormNotes(loc.description ?? "");
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    const data = {
      name: formName,
      type: formType,
      lat: parseFloat(formLat) || 0,
      lng: parseFloat(formLng) || 0,
      description: formNotes,
    };

    if (selectedLocation) {
      await updateLocation(selectedLocation.id, data);
    } else {
      await createLocation(data);
    }
    setSheetOpen(false);
  };

  const handlePhotoCapture = async (locationId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      stream.getTracks().forEach((t) => t.stop());

      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      await addPhoto(locationId, dataUrl);
    } catch {
      // Camera not available
    }
  };

  const focusLocation = (loc: SavedLocation) => {
    if (!mapRef.current) return;
    const map = mapRef.current as { flyTo: (opts: object) => void };
    map.flyTo({ center: [loc.lng, loc.lat], zoom: 14, essential: true });
  };

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* Search bar */}
      <div
        style={{
          background: "var(--bg)",
          borderBottom: "1px solid var(--border)",
          padding: "10px 16px",
          display: "flex",
          gap: "8px",
          alignItems: "center",
          zIndex: 10,
        }}
      >
        <div
          onClick={handleSearch}
          style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 12px", flex: 1 }}
        >
          <Search size={14} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Search locations or places..."
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              fontSize: "14px",
              color: "var(--text)",
            }}
          />
        </div>
        <button
          onClick={() => router.push("/settings")}
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "8px",
            cursor: "pointer",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <Settings size={16} />
        </button>
        <button
          onClick={() => {
            if (!navigator.geolocation) {
              alert("Geolocation not supported by your browser.");
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const map = mapRef.current as { flyTo: (opts: object) => void };
                map.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 14, essential: true });
              },
              () => alert("Could not get your location. Check location permissions.")
            );
          }}
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "8px",
            cursor: "pointer",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <Crosshair size={16} />
        </button>
        <button
          onClick={openCreateSheet}
          style={{
            background: "var(--accent)",
            color: "#0a0a0a",
            border: "none",
            borderRadius: "8px",
            padding: "8px 14px",
            cursor: "pointer",
            fontFamily: "var(--font-heading)",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          + Pin
        </button>
      </div>

      {/* Filter tabs */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          overflowX: "auto",
          padding: "8px 16px",
          background: "var(--bg)",
          borderBottom: "1px solid var(--border)",
          scrollbarWidth: "none",
          alignItems: "center",
        }}
      >
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { console.log("Filter changed:", opt.value, "total locations:", locations.length); setFilter(opt.value); }}
            style={{
              background: filter === opt.value ? "rgba(0,210,255,0.15)" : "transparent",
              color: filter === opt.value ? "var(--accent)" : "var(--text-secondary)",
              border: `1px solid ${filter === opt.value ? "rgba(0,210,255,0.3)" : "var(--border)"}`,
              borderRadius: "14px",
              padding: "4px 10px",
              cursor: "pointer",
              fontFamily: "var(--font-heading)",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {opt.label}
          </button>
        ))}
        {loadingNearby && (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--accent)",
              flexShrink: 0,
              animation: "pulse 1s infinite",
            }}
          />
        )}
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: "relative" }}>
        <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

        {/* Bottom location list */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "rgba(10,10,10,0.95)",
            backdropFilter: "blur(20px)",
            borderTop: "1px solid var(--border)",
            borderRadius: "16px 16px 0 0",
            maxHeight: "45%",
            overflowY: "auto",
            padding: "12px 16px 16px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "4px",
              background: "var(--border)",
              borderRadius: "2px",
              margin: "0 auto 12px",
            }}
          />

          {filteredLocations.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "13px", padding: "16px 0" }}>
              No locations yet. Tap + Pin to add one.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filteredLocations.map((loc) => (
                <div
                  key={loc.id}
                  onClick={() => { focusLocation(loc); openEditSheet(loc); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 12px",
                    background: "var(--surface)",
                    border: selectedLocation?.id === loc.id
                      ? "1px solid rgba(0,210,255,0.4)"
                      : "1px solid var(--border)",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "rgba(0,210,255,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--accent)",
                      flexShrink: 0,
                    }}
                  >
                    {TYPE_ICONS[loc.type]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "var(--text)",
                        margin: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {loc.name}
                    </p>
                    {loc.lat && loc.lng && (
                      <p style={{ fontSize: "10px", color: "var(--text-secondary)", margin: "1px 0 0" }}>
                        {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                      </p>
                    )}
                  </div>
                  <Badge variant={TYPE_BADGE_VARIANT(loc.type)}>{loc.type.replace("_", " ")}</Badge>
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePhotoCapture(loc.id); }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-secondary)",
                      padding: "4px",
                    }}
                    title="Take photo"
                  >
                    <Camera size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Sheet */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={selectedLocation ? "Edit Location" : "Add Pin"}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <Input
            label="Name"
            placeholder="Marfa Courthouse"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            autoFocus={!selectedLocation}
          />
          <Select
            label="Type"
            options={TYPE_OPTIONS}
            value={formType}
            onChange={(e) => setFormType(e.target.value as SavedLocation["type"])}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <Input
              label="Latitude"
              type="number"
              step="any"
              placeholder="30.3095"
              value={formLat}
              onChange={(e) => setFormLat(e.target.value)}
            />
            <Input
              label="Longitude"
              type="number"
              step="any"
              placeholder="-104.0216"
              value={formLng}
              onChange={(e) => setFormLng(e.target.value)}
            />
          </div>
          <Input
            label="Notes (optional)"
            placeholder="Best light at golden hour..."
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
          />
          <div style={{ display: "flex", gap: "10px" }}>
            {selectedLocation && (
              <Button
                variant="danger"
                onClick={() => { deleteLocation(selectedLocation.id); setSheetOpen(false); }}
                style={{ flex: 1 }}
              >
                Delete
              </Button>
            )}
            <Button onClick={handleSave} disabled={!formName.trim()} style={{ flex: 2 }}>
              {selectedLocation ? "Save Changes" : "Add Pin"}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Photo Lightbox */}
      {viewingPhoto && (
        <div
          onClick={() => setViewingPhoto(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.95)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <button
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#fff",
            }}
          >
            <X size={24} />
          </button>
          <img
            src={viewingPhoto}
            alt=""
            style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: "8px" }}
          />
        </div>
      )}

      {/* Bottom Nav */}
      <nav
        style={{
          height: "72px",
          background: "rgba(20,20,20,0.95)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          zIndex: 40,
        }}
      >
        {[
          { href: "/projects", icon: ListTodo, label: "Shots" },
          { href: "/gear", icon: Backpack, label: "Gear" },
          { href: "/checklists", icon: ClipboardList, label: "Check" },
          { href: "/map", icon: MapPin, label: "Map" },
        ].map((item) => {
          const Icon = item.icon;
          const active = item.href === "/map";
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: "4px", padding: "8px 20px",
                color: active ? "var(--accent)" : "var(--text-secondary)",
                transition: "color 200ms ease",
              }}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
