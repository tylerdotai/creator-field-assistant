# Creator Field Assistant

> **Offline-first field production assistant for photographers, videographers, and content creators.**

[![CI](https://img.shields.io/github/actions/workflow/status/tylerdotai/creator-field-assistant/ci.yml?style=flat-square&logo=github)](https://github.com/tylerdotai/creator-field-assistant/actions)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-Installable-00d2ff?style=flat-square&logo=pwa)](https://web.dev/pwa)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)
[![Cloudflare](https://img.shields.io/badge/Backend-Cloudflare%20Workers-orange?style=flat-square&logo=cloudflare)](https://workers.cloudflare.com)

**Live:** [creator-field-assistant.vercel.app](https://creator-field-assistant.vercel.app)

---

## 🎯 Overview

Creator Field Assistant is a Progressive Web App designed for creators working in the field — on location, offline, in unpredictable conditions. It works **fully offline** without an account, and syncs across devices when you sign in.

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
- Projects with shoot day breakdown
- Shots with type (vlog / B-roll / interview / aerial), lens, format, and status (planned / shot / needs review)
- Persistent across browser sessions via IndexedDB
- Cloud sync when logged in

### Gear Manager
- Categories (Camera / Lenses / Lighting / Audio / Grip / Power / Storage / Accessories)
- Per-item: name, weight, packed state
- Running weight total per category and globally
- Pack / unpack presets

### Pre-Shoot Checklists
- Multiple named checklists (e.g. "Interview Kit", "Landscape Day Hike")
- Sections with checkable items
- Tap to check/uncheck; section progress indicator
- One-tap reset to clear all checks

### Map & Locations
- Full MapLibre GL map with OpenStreetMap tiles (offline-cacheable)
- Save locations with: name, type, lat/lng, notes
- Type filters: campsite, photo spot, accommodation, food, POI
- Camera capture — attach a reference photo to a location

### PWA
- Installable on iOS and Android via "Add to Home Screen"
- Works fully offline via service worker + IndexedDB
- Offline banner indicator when connection is lost
- Dark-only theme optimized for OLED screens
- Portrait-locked layout for field use

---

## 🔐 Cloud Sync (v2)

Data is stored locally in IndexedDB by default — no account required, works offline forever. When you sign in, data syncs to your Cloudflare account:

| Layer | Technology |
|-------|-----------|
| API | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite at edge) |
| Token Storage | Cloudflare KV |
| Auth | Email + password, JWT sessions |
| Frontend Proxy | Next.js API routes (Vercel) |

Sign in once → all future changes sync automatically across your devices. Sign out → back to local-only mode.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + CSS variables |
| State | Zustand |
| Persistence | IndexedDB via `idb` (local) + Cloudflare D1 (sync) |
| Map | MapLibre GL JS + OSM tiles |
| Animation | Framer Motion |
| Icons | Lucide React |
| Backend | Cloudflare Workers + D1 + KV |
| Deploy | Vercel (frontend) + Cloudflare (API) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Cloudflare account (optional, for sync)

### Local Development

```bash
git clone https://github.com/tylerdotai/creator-field-assistant.git
cd creator-field-assistant
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Cloud Sync (optional)

```bash
# Install Wrangler
npm install -g wrangler

# Authenticate
wrangler login

# Create backend resources
npx wrangler d1 create creator-field-assistant
npx wrangler kv:namespace create "CFA_KV"
npx wrangler d1 execute creator-field-assistant --file=worker/schema.sql --remote

# Deploy the API Worker
npx wrangler deploy
```

Update `app/api/[...path]/route.js` with your Worker URL, then deploy to Vercel.

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
│   ├── map/                    # Map & Locations
│   ├── login/                  # Auth — sign in / create account
│   ├── layout.tsx              # Root layout + PWA meta
│   └── globals.css             # Brand tokens + Tailwind
├── components/
│   ├── app-shell.tsx            # Layout wrapper + nav
│   └── ui/                      # Shared UI components
├── lib/
│   ├── db.ts                   # IndexedDB schema + CRUD
│   ├── api-client.js           # Cloudflare Worker API client
│   ├── auth-context.js         # Auth provider + user state
│   └── stores/                 # Zustand stores
│       ├── project-store.ts
│       ├── gear-store.ts
│       ├── checklist-store.ts
│       └── location-store.ts
├── worker/                     # Cloudflare Worker (API backend)
│   ├── index.js                # REST API + JWT auth
│   └── schema.sql              # D1 database schema
├── public/
│   ├── manifest.json           # PWA manifest
│   └── sw.js                   # Service worker
└── wrangler.toml               # Cloudflare Worker config
```

---

## 📄 License

MIT — [tylerdotai](https://github.com/tylerdotai)
