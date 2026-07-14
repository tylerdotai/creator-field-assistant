# Creator Field Assistant — Build Tasks

## Phase 1: Bootstrap
- [x] Initialize Next.js 14 project with TypeScript
- [x] Configure Tailwind v3 (v4-style tokens)
- [x] Set up PWA manifest
- [x] Add brand design tokens (CSS variables)
- [x] Create SVG icons

## Phase 2: Project Listing Page
- [ ] Build `/projects` route with project grid
- [ ] Implement project card component
- [ ] Add empty state UI
- [ ] Set up Zustand store for projects
- [ ] Integrate IndexedDB via idb for persistence

## Phase 3: Shot List Feature
- [ ] Build `/projects/[id]/shots` route
- [ ] Create shot list component with drag reordering
- [ ] Implement shot detail panel
- [ ] Add shot status workflow (pending/in-progress/done)
- [ ] Wire up Framer Motion animations

## Phase 4: Location Scouting
- [ ] Integrate MapLibre GL map
- [ ] Build location picker component
- [ ] Add geocoder with @maplibre/maplibre-gl-geocoder
- [ ] Save locations to IndexedDB
- [ ] Display saved locations on map

## Phase 5: PWA & Offline
- [ ] Implement service worker for offline support
- [ ] Add manifest with icons
- [ ] Configure caching strategies
- [ ] Test offline functionality

## Phase 6: Polish
- [ ] Add loading states and skeleton screens
- [ ] Implement error boundaries
- [ ] Accessibility audit (keyboard nav, ARIA)
- [ ] Performance optimization
