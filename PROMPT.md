# Creator Field Production Assistant — Master Build Prompt

---

## 1. Project Overview

**Project Name:** Creator Field Assistant
**Type:** Offline-first Progressive Web Application (PWA)
**Core Function:** A field production assistant that helps plan shoots, manage gear, track locations, and execute on location with zero connectivity.
**Target Users:** Solo creator (Tyler Delano) on set; potentially two-person team.
**Deployment:** Fully local PWA — install via "Add to Home Screen" on iOS and Android. No App Store. No backend. No accounts.

---

## 2. Operating Context

### Boris Cherny Operations Manual (load these first)

Before writing any code, load these skills and apply their rules throughout:

- **`boris-cherny-ops`** — Plan-first, self-improvement loop, verification bar, autonomous bug fixing. After ANY correction, update `tasks/lessons.md`. Never mark complete without proving it works.
- **`animation-vocabulary`** — Reverse-lookup glossary for all motion/animation terms. Reference when describing or building any animation.
- **`apple-design`** — Apple's fluid interface philosophy: interruptibility, spring physics, velocity handoff, origin-aware animations, haptic/audio feedback, reduced motion. This is the motion standard.
- **`emil-design-eng`** — Emil Kowalski's design engineering philosophy: unseen details compound, buttons must feel responsive, `scale(0)` is always wrong, `ease-in` on UI is always wrong, CSS transitions over keyframes for dynamic UI, hardware-accelerated properties only. This is the UI craft standard.
- **`review-animations`** — Before shipping ANY animation, review it against this bar. Required output: markdown table + verdict. Blocking if feel-breaking regressions found.
- **`improve-animations`** — If auditing an existing codebase, use this. Not directly applicable at build time but loaded for reference.

### Plan Mode

This is a non-trivial full-stack (local) build. Enter plan mode before starting. Write `tasks/todo.md` with checkable items. Verify before starting implementation.

---

## 3. Brand Design Tokens

The app MUST use the TylerDotAI brand — not the ABC/noir/stencil brand:

| Token | Value | Usage |
|---|---|---|
| Background | `#0a0a0a` | Primary dark background |
| Surface | `#141414` | Cards, panels |
| Border | `#2a2a2a` | Dividers, outlines |
| Text Primary | `#FFFFFF` | Headings, primary content |
| Text Secondary | `#A0A0A0` | Labels, metadata |
| Accent | `#00D2FF` | CTAs, active states, links |
| Accent Dim | `#0099BB` | Hover state for accent |
| Success | `#10B981` | Completed states |
| Warning | `#F59E0B` | Warnings |
| Danger | `#EF4444` | Destructive actions, errors |

**Typography:** `Oswald` (headings/labels) + `Inter` (body text). Import from Google Fonts.

**Visual style:** Dark mode only. Sharp. No decorative gradients. Minimal. Functional.

---

## 4. Feature Specification

### 4.1 Shot Planner

**Purpose:** Plan shoots organized by Day → Location → Shot.

**Data Model:**
```
Project
├── id: string (uuid)
├── name: string
├── created_at: timestamp
├── updated_at: timestamp
└── days: Day[]

Day
├── id: string (uuid)
├── date: string (ISO date, optional)
├── location_name: string
├── notes: string
└── shots: Shot[]

Shot
├── id: string (uuid)
├── type: "vlog" | "broll" | "interview" | "aerial"
├── description: string
├── lens: "16mm" | "35mm" | "50mm" | "85mm"
├── format: "9:16" | "16:9" | "1:1" | "4:5"
├── status: "planned" | "shot" | "needs_review"
├── notes: string
└── completed: boolean
```

**UI:**
- Project list → tap to open → Day tabs or list → Location → Shot list
- Each shot card shows: type badge, description, lens, format, status
- Swipe right on shot = mark complete
- Swipe left = delete (with confirmation)
- FAB = add shot
- Long-press day = edit day details

**Interactions:**
- Add/Edit via bottom sheet or inline form
- Drag-to-reorder shots within a location
- Filter bar: All / Vlog / B-roll / By lens / By format

### 4.2 Gear Manager

**Purpose:** Track all gear, build kit lists, know what to pack.

**Data Model:**
```
GearItem
├── id: string (uuid)
├── name: string
├── category: "camera" | "lens" | "lighting" | "audio" | "grip" | "power" | "storage" | "accessory"
├── weight: number (grams)
├── weight_unit: "g" | "oz"
├── kit_preset_ids: string[] (which kits this belongs to)
├── is_packed: boolean
├── is_owned: boolean
├── notes: string
└── image_url: string (optional, local blob or data URL)

KitPreset
├── id: string (uuid)
├── name: string (e.g., "Punta Cana Full Kit", "Run & Gun")
├── item_ids: string[]
└── is_default: boolean
```

**UI:**
- Gear list grouped by category
- Each item: name, weight, packed checkbox, kit badges
- Kit presets: pre-built lists (tap to pack all items in preset)
- Total weight display: sum of packed items, shown in g or oz
- Add/Edit: bottom sheet form

**Interactions:**
- Tap checkbox = toggle packed state
- Tap item = edit details
- Filter: by category, packed only, unpacked only

### 4.3 Pre-Shoot Checklist

**Purpose:** Never forget to charge, format, or pack something before a shoot.

**Data Model:**
```
Checklist
├── id: string (uuid)
├── name: string
├── project_id: string (optional, link to project)
└── items: ChecklistItem[]

ChecklistItem
├── id: string (uuid)
├── text: string
├── checked: boolean
├── order: number
└── is_custom: boolean
```

**Default Checklist (pre-populated, editable):**
```
Battery Check
  ☐ Format SD card
  ☐ Charge all batteries
  ☐ Pack NPF 970 batteries (x2)
  ☐ Pack dummy battery + AC adapter
  ☐ Pack SD cards
  ☐ Check ND filter
Gear Pack
  ☐ Camera body
  ☐ 16-50mm kit lens
  ☐ SmallRig cage
  ☐ TOPEAK tabletop handle
  ☐ Suction mount
  ☐ Magic arm
  ☐ Tripod / selfie stick
Shot Prep
  ☐ Review shot list
  ☐ Scout locations on map
  ☐ Load route in MapLibre offline area
  ☐ Clear gallery space (32GB minimum)
Audio Check
  ☐ Test onboard mic
  ☐ Check wind cover
```

**UI:**
- Checklist view with collapsible sections
- Tap item = toggle checked (with satisfying haptic + animation)
- Swipe left = delete item
- "+" button = add custom item
- "Reset All" = uncheck everything for new shoot

### 4.4 Map & Locations

**Purpose:** Plot shoot locations, plan routes, save photo spots — all offline.

**Tech:** MapLibre GL JS with OpenStreetMap vector tiles. No API key. Fully offline after first load.

**Data Model:**
```
SavedLocation
├── id: string (uuid)
├── name: string
├── lat: number
├── lng: number
├── type: "campsite" | "photo_spot" | "accommodation" | "food" | "POI" | "other"
├── description: string
├── photo_url: string (optional, data URL of reference image)
├── project_id: string (optional)
├── day_id: string (optional)
└── created_at: timestamp
```

**UI:**
- Full-screen MapLibre map
- Bottom drawer: saved locations list
- Tap location pin = popup with name, type, photo thumbnail, notes
- "Add current location" button (Geolocation API) = drop pin at GPS position
- Tap+hold on map = drop pin at that position
- Draw route between selected locations (using OSRM routing, offline-cached)
- Satellite/map toggle

**Offline Capability:**
- Pre-cache map tiles for a defined bounding box (user sets before trip)
- All location data in IndexedDB — works with zero connectivity
- Route lines cached locally

### 4.5 Location Photo Reference Bank

**Purpose:** Save reference photos attached to locations — screenshots, inspiration shots, mood board images for that spot.

**Data Model:**
```
LocationPhoto
├── id: string (uuid)
├── location_id: string
├── data_url: string (stored as base64 or blob in IndexedDB)
├── caption: string
└── created_at: timestamp
```

**UI:**
- Location detail view shows grid of attached photos
- Tap photo = full-screen lightbox
- "Add photo" = camera capture or gallery pick
- Long-press = delete with confirmation

---

## 5. Technical Specification

### 5.1 Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Maps | MapLibre GL JS v4 |
| Routing | OSRM (openstreetmap.us) for routes |
| Data | IndexedDB (via `idb` wrapper) |
| PWA | `next-pwa` or `vite-plugin-pwa` |
| Icons | Lucide React |
| State | Zustand (lightweight, works with IndexedDB) |
| Animations | Framer Motion (follow apple-design / emil-design-eng rules) |
| Deployment | Vercel (zero-config, free tier) |

### 5.2 PWA Requirements

- `manifest.json`: name, icons (192px + 512px), `display: "standalone"`, `theme_color: "#0a0a0a"`, `background_color: "#0a0a0a"`
- Service worker: cache app shell + API responses + map tiles for defined offline region
- iOS splash screen: `#0a0a0a` background
- `apple-mobile-web-app-capable` meta tag
- Works offline after first install
- Install prompt: none (user adds via browser menu — don't interrupt)

### 5.3 Offline Architecture

```
IndexedDB Stores:
  ├── projects        (shot plan data)
  ├── gear            (gear items)
  ├── checklists      (checklist data)
  ├── saved_locations (map pins)
  └── location_photos (reference images as blobs)

Service Worker Strategy:
  ├── App shell: CacheFirst (HTML, JS, CSS, fonts)
  ├── Map tiles: CacheFirst with bounding-box limit
  ├── API/routing: NetworkFirst with offline fallback
  └── Images: CacheFirst

No Supabase. No Firebase. No backend.
User data never leaves the device unless they export it.
```

### 5.4 Export / Backup

- Export all data as JSON (one button: "Export Backup")
- Import from JSON file
- This is the only data portability feature

---

## 6. Animation & Interaction Standards

Apply these from `apple-design` + `emil-design-eng` + `review-animations` on every screen:

### Must-Have Animations
- **Page transitions:** Slide left/right matching navigation direction (direction-aware)
- **List items:** Staggered fade-in on mount (30-80ms between items)
- **Shot card complete:** Scale + opacity + checkmark draw animation
- **Bottom sheet open/close:** Spring physics, drag to dismiss with velocity
- **FAB press:** `scale(0.97)` on press, `scale(1)` on release
- **Tab switch:** Crossfade with subtle direction slide
- **Map pin drop:** Scale from `0.8` + `opacity: 0` with spring bounce

### Never Do These
- `ease-in` on any UI element
- `scale(0)` as entrance — always `scale(0.95)` + `opacity: 0`
- `transition: all` — always specify exact properties
- Keyframes on rapidly-triggered UI (toasts, checklist items)
- Animating layout properties (`width`, `height`, `margin`, `padding`, `top`, `left`)

### Spring Defaults (Apple-style)
```ts
const SPRING_PRESET = { type: "spring" as const, duration: 0.4, bounce: 0.1 };
const SPRING_BOUNCY = { type: "spring" as const, duration: 0.5, bounce: 0.2 };
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  .animated { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## 7. File Structure

```
creator-field-assistant/
├── app/
│   ├── layout.tsx          (root layout, PWA meta, fonts)
│   ├── page.tsx             (redirect to /projects)
│   ├── manifest.json
│   ├── projects/
│   │   ├── page.tsx         (project list)
│   │   └── [id]/
│   │       ├── page.tsx     (day tabs)
│   │       └── shots/
│   │           └── page.tsx (shot list by day)
│   ├── gear/
│   │   └── page.tsx
│   ├── checklists/
│   │   └── page.tsx
│   ├── map/
│   │   └── page.tsx
│   └── settings/
│       └── page.tsx         (export/import, cache management)
├── components/
│   ├── ui/                   (base components: Button, Input, Card, Badge, Sheet, etc.)
│   ├── shot-card.tsx
│   ├── gear-item.tsx
│   ├── checklist-item.tsx
│   ├── location-card.tsx
│   ├── map-view.tsx
│   ├── bottom-sheet.tsx
│   └── confirm-dialog.tsx
├── lib/
│   ├── db.ts                 (IndexedDB setup with idb)
│   ├── stores/
│   │   ├── project-store.ts
│   │   ├── gear-store.ts
│   │   ├── checklist-store.ts
│   │   └── location-store.ts
│   ├── map-tile-cache.ts
│   └── export.ts
├── styles/
│   └── globals.css           (Tailwind + custom properties)
├── public/
│   ├── icons/                (PWA icons: 192px, 512px)
│   └── manifest.json
├── SKILL.md
├── tasks/
│   ├── todo.md
│   └── lessons.md
└── package.json
```

---

## 8. Build Sequence

### Phase 1 — Foundation
1. Bootstrap Next.js 14 app with TypeScript + Tailwind v4
2. Configure PWA manifest + meta tags
3. Set up global styles with brand tokens (CSS custom properties)
4. Load `boris-cherny-ops` and `emil-design-eng` — apply to all decisions
5. Write `tasks/todo.md` with all features as checkable items
6. Verify build serves correctly in dev mode

### Phase 2 — Data Layer
7. Set up IndexedDB with `idb` — define all store schemas
8. Build Zustand stores for each domain (projects, gear, checklists, locations)
9. Verify CRUD operations work in devtools console
10. Build data export/import

### Phase 3 — Core UI Components
11. Build base UI component library (Button, Input, Card, Badge, Sheet, Dialog)
12. Apply emil-design-eng rules: press feedback, spring animations, no `ease-in`
13. Build navigation: bottom tab bar (Projects / Gear / Checklist / Map)
14. Build layout shell with offline indicator

### Phase 4 — Shot Planner
15. Project list view
16. Day management (add/edit/delete days)
17. Shot list with all fields (type, lens, format, status)
18. Shot card with status badges + completion animation
19. Filter bar
20. Review all animations with `review-animations` bar

### Phase 5 — Gear Manager
21. Gear list with category grouping
22. Add/edit gear item form
23. Pack state toggle with animation
24. Kit presets (pre-built kit lists)
25. Total weight display

### Phase 6 — Checklists
26. Checklist view with collapsible sections
27. Check/uncheck with spring animation
28. Add custom item
29. Reset all
30. Link checklist to project (optional)

### Phase 7 — Map
31. MapLibre GL JS integration with brand dark theme
32. Plot saved locations as pins
33. Tap+hold to add pin
34. Pin popup with name, type, photo
35. Bottom drawer with location list
36. Geolocation "drop pin here"
37. Offline tile caching (define bounding box in settings)

### Phase 8 — Location Photo References
38. Attach photos to locations (camera + gallery)
39. Photo grid per location
40. Full-screen lightbox
41. Store as blob in IndexedDB

### Phase 9 — PWA Polish
42. Service worker: app shell caching
43. Offline indicator
44. Install prompt behavior (browser-native only)
45. iOS splash screen + safe area insets
46. Verify "Add to Home Screen" works on iOS Safari and Android Chrome

### Phase 10 — Deploy
47. Deploy to Vercel
48. Verify service worker registers correctly in production
49. Test offline mode: airplane mode → open app → verify all features work
50. Verify "Add to Home Screen" flow on iOS and Android

---

## 9. Verification Checklist

Before declaring done, prove each of these works:

- [ ] PWA installs on iOS Safari via "Add to Home Screen"
- [ ] PWA installs on Android Chrome via banner + "Add to Home Screen"
- [ ] App loads and is fully functional in airplane mode
- [ ] Shot planner: create project → add day → add shot → complete shot → persists after reload
- [ ] Gear manager: add item → pack → total weight updates → persists
- [ ] Checklist: check items → reset all → all unchecked
- [ ] Map: drop pin → reopen app → pin still there
- [ ] No `ease-in` on any UI element (grep verify)
- [ ] No `scale(0)` in any animation (grep verify)
- [ ] No `transition: all` in any CSS (grep verify)
- [ ] All animations pass `review-animations` review (per-screen check)
- [ ] Zero console errors in production build

---

## 10. Constraints

- **No App Store.** PWA only. "Add to Home Screen" is the install path.
- **No backend.** All data in IndexedDB on device.
- **No accounts / auth.** One user, one device, no login.
- **Offline first.** Everything works without network.
- **Dark mode only.** No light mode.
- **No TypeScript errors.** `strict: true` in tsconfig.
- **No third-party map API keys required.** MapLibre + OSM.
- **Build once, ship when ready.** No deadline. Full build.
