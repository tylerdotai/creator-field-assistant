# Creator Field Assistant

> **Offline-first field production assistant for photographers, videographers, and content creators.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-Installable-00d2ff?style=flat-square&logo=pwa)](https://web.dev/pwa)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)

**Live:** [creator-field-assistant.vercel.app](https://creator-field-assistant.vercel.app)

---

## 🎯 Overview

Creator Field Assistant is a Progressive Web App designed for creators working in the field — on location, offline, in unpredictable conditions. Everything runs locally in your browser: no accounts, no cloud sync required, no internet connection to function.

It handles four core workflows:

| Module | What it does |
|--------|-------------|
| **Shot Planner** | Plan shoots as projects → shoot days → individual shots. Filter by type, lens, format, or status |
| **Gear Manager** | Track your kit by category, mark items packed or ready, see total weight at a glance |
| **Checklists** | Pre-shoot checklists with checkable items, section grouping, and one-tap reset |
| **Map & Locations** | Save locations with pins on an offline-capable map, attach photo references from your camera |

---

## ✨ Features

### Shot Planner
- Projects with cover color and shoot day breakdown
- Shots with type (Wide / Medium / Close-up / Insert / POV / Aerial), lens, format, and status (TODO / DONE / OTD / B-roll)
- Filter bar to narrow shots by any dimension
- Persistent across browser sessions via IndexedDB

### Gear Manager
- Categories (Camera / Lenses / Lighting / Audio / Grip / Accessories / Power / Other)
- Per-item: name, brand/model, weight in grams
- Pack state toggle: Packed / Ready (and in-kit count)
- Running weight total displayed per category and globally

### Pre-Shoot Checklists
- Multiple named checklists (e.g. "Interview Kit", "Landscape Day Hike")
- Sections within each checklist (e.g. "Camera", "Audio", "Safety")
- Tap to check/uncheck; section progress indicator
- One-tap reset to clear all checks

### Map & Locations
- Full MapLibre GL map with OpenStreetMap tiles (offline-cacheable)
- Save locations with: name, type, lat/lng, notes
- Type filters: scenic, urban, indoors, nature, campsite, accommodation, coffee, photo spot
- Camera capture — take a reference photo and attach it to a location
- Photo lightbox viewer for saved location photos

### PWA
- Installable on iOS and Android via "Add to Home Screen"
- Works fully offline via service worker + IndexedDB
- Offline banner indicator when connection is lost
- Dark-only theme optimized for OLED screens
- Portrait-locked layout for field use

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + CSS variables |
| State | Zustand |
| Persistence | IndexedDB via `idb` |
| Map | MapLibre GL JS + OSM tiles |
| Animation | Framer Motion |
| Icons | Lucide React |
| Deploy | Vercel |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm

### Local Development

```bash
# Clone the repo
git clone https://github.com/tylerdotai/creator-field-assistant.git
cd creator-field-assistant

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

---

## 📁 Project Structure

```
creator-field-assistant/
├── app/                        # Next.js App Router pages
│   ├── projects/               # Shot Planner — project list
│   ├── projects/[id]/          # Project detail + shoot days
│   ├── projects/[id]/shots/    # Shot list with filters
│   ├── gear/                   # Gear Manager
│   ├── checklists/             # Pre-shoot Checklists
│   ├── map/                    # Map & Locations + Photo Bank
│   ├── layout.tsx              # Root layout + PWA meta
│   └── globals.css             # Brand tokens + Tailwind
├── components/
│   ├── app-shell.tsx            # Layout wrapper + nav
│   └── ui/                      # Shared UI components
│       └── index.tsx           # Button, Card, Sheet, FAB, Badge, Input…
├── lib/
│   ├── db.ts                   # IndexedDB schema + CRUD (all entities)
│   └── stores/                 # Zustand stores
│       ├── project-store.ts
│       ├── gear-store.ts
│       ├── checklist-store.ts
│       └── location-store.ts
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service worker
│   └── icons/                  # App icons
└── tasks/
    ├── todo.md                 # Build phase tracker
    └── lessons.md              # Development notes
```

---

## 🔧 Data Model

All data lives in IndexedDB inside the browser. No backend, no sync.

| Store | Key fields |
|-------|-----------|
| `projects` | id, name, color, createdAt, days[] |
| `shots` | id, projectId, dayIndex, type, lens, format, status, notes |
| `gear` | id, category, name, brand, weight, packed |
| `checklists` | id, name, sections[] with items[] |
| `locations` | id, name, type, lat, lng, description, photos[] |
| `photos` | id, locationId, dataUrl, takenAt |

---

## 🌐 Browser Support

| Browser | Support |
|---------|---------|
| Chrome / Edge | ✅ Full PWA + offline |
| Safari (iOS) | ✅ PWA + offline (via Add to Home Screen) |
| Safari (macOS) | ✅ |
| Firefox | ✅ PWA + offline |

---

## 📄 License

MIT — [tylerdotai](https://github.com/tylerdotai)
