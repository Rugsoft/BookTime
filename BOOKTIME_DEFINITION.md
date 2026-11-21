# BookTime — Product Definition (MVP)

**BookTime** (provisional name) is a personal, local-first web/PWA application for timed reading sessions. It helps readers hit target finish dates based on the remaining reading time reported by their e-reader, tracks reading habits, and adapts its visual atmosphere to the genre of the book currently being read.

---

## Core Scope Summary

| Area | MVP Decision |
|------|--------------|
| **Working Name** | BookTime (provisional) |
| **Platform** | Responsive Web App / PWA (personal use) |
| **Auth & Sync** | None in MVP — local-only persistence, zero login friction |
| **Timers** | Free-form custom timer + daily-goal timer tied to the active book |
| **Reading Planner** | Remaining e-reader time + target date → auto-calculated daily reading goal with automatic deduction and manual override |
| **Library** | Multiple concurrent "currently reading" books; search by title/author (cover + genre) with manual entry fallback |
| **Atmosphere / Theming** | Visual-only themes driven by book genre (colors, typography, background mood) |
| **Stats & History** | Time read today, time read this week, reading streak, and completed books |
| **Design Reference** | Stitch project `BookTime` (`BookTime Editorial` Design System, 16 screens: 4 core views + 4 genre atmospheres in mobile & desktop) |
| **Tech Stack** | Vite + React + TypeScript, Tailwind CSS, Dexie.js (IndexedDB), `vite-plugin-pwa`, React Router, Zustand, Vitest |

---

## Core User Flows

### 1. Add a Book & Set a Reading Goal
1. Search for a book by title or author to prefill metadata (title, author, cover, genre), or enter details manually if not found.
2. Optionally input the **remaining reading time** shown by the e-reader (e.g., `6h 30m`) and a **target finish date** (day X).
3. BookTime calculates the required **daily reading time**:
   $$\text{Daily Goal} = \frac{\text{Remaining Time}}{\text{Days Remaining (inclusive)}}$$
4. Select the book as active to switch the app's visual theme to match its genre.

### 2. Run a Reading Session (Timer)
- **Guided mode:** Starts with the active book's calculated daily goal (or remaining time for today).
- **Free mode:** User sets any custom duration, with or without an assigned book.
- **Session controls:** Start, pause, resume, finish early, or cancel.
- **On completion:**
  - Logs the session duration to reading history and updates stats/streak.
  - If linked to a book with remaining time, automatically deducts the elapsed time and recalculates the daily goal for the remaining days.
  - User can manually adjust the remaining time at any point (e.g., if they read without the timer or the e-reader updated its pace estimate).

### 3. Switch Active Book & Visual Atmosphere
- Users can maintain multiple books in the **Currently Reading** state.
- Switching the active book immediately updates the active timer context and transitions the UI to the corresponding **genre theme** (e.g., Fantasy, Horror, Sci-Fi, Mystery, Romance, Historical, Non-Fiction, Default).
- Users can manually override the detected genre if needed.

### 4. Track Progress & Stats
- **Today:** Total reading time logged today (plus progress toward today's goal).
- **This week:** Total reading time across the current week.
- **Streak:** Consecutive days with at least one logged reading session.
- **Completed books:** Count and list of finished books.

---

## Conceptual Data Model

| Entity | Key Fields |
|--------|------------|
| **Book** | `id`, `title`, `author`, `coverUrl`, `genre`, `status` (`reading` \| `completed` \| `paused`), `remainingMinutes`, `targetDate`, `createdAt`, `completedAt` |
| **ReadingSession** | `id`, `bookId` (optional), `startedAt`, `endedAt`, `durationMinutes`, `mode` (`guided` \| `free`) |
| **GenreTheme** | `genreId`, `label`, `palette` (bg, surface, accent, text), `typography`, `backgroundStyle` |

---

## Tech Stack & Architecture

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Core & Build** | **Vite + React + TypeScript** | 100% client-side, local-first app with no SSR/SEO needs; fast builds and strong typing for planner/streak logic. |
| **Styling & Theming** | **Tailwind CSS + CSS Custom Properties (`data-atmosphere`)** | Matches the Stitch `BookTime Editorial` tokens directly (`surface-container-*`, `fantasia-*`, `scifi-*`, `misterio-*`, `terror-*`) with smooth `300ms` theme transitions. |
| **Fonts & Icons** | **`@fontsource`** (`Crimson Pro`, `Commissioner`, `Source Code Pro`) + **Material Symbols Outlined** | Bundled locally so typography and icons render identically offline in the PWA. |
| **Local Persistence** | **IndexedDB via Dexie.js** | Typed, reactive (`useLiveQuery`) queries for daily/weekly stats and streaks; easy JSON export/import or future cloud sync migration. |
| **PWA & Offline** | **`vite-plugin-pwa`** | Auto-generated manifest and Workbox service worker for mobile and desktop installation. |
| **Routing & State** | **React Router** + **Zustand** | 4 clean views (`/`, `/library`, `/add`, `/stats`); persistent data comes from Dexie, while Zustand holds ephemeral active-timer and atmosphere state. |
| **Book Lookup** | **Open Library / Google Books API** | Client-side search for title, author, cover, and genre with graceful fallback to manual entry. |
| **Testing** | **Vitest** | Native Vite integration for unit-testing pure domain logic (daily goal calculation, auto-deduction, streak boundaries). |

### Key Implementation Constraints
- **Reliable timer accuracy:** Compute elapsed time from `Date.now()` timestamps rather than relying solely on `setInterval` ticks so the countdown stays accurate when the tab is backgrounded or the phone screen locks.
- **Initial genre atmospheres (from Stitch):** Editorial (default light/dark), Fantasy (`fantasia`), Sci-Fi (`scifi`), Mystery (`misterio`), and Horror (`terror`).
- **Accessibility & motion:** Respect `prefers-reduced-motion`; animate `transform`, `opacity`, and colors only (no layout geometry animations).

---

## Explicitly Out of Scope for MVP (Roadmap)

- **Book-specific theming:** Fine-grained visual themes tailored to individual books beyond genre presets.
- **Integrated audio / playlists:** Background ambient soundscapes or embedded music playlists (readers currently use their own music).
- **User accounts & cloud sync:** Authentication and multi-device synchronization.
- **Advanced scheduling:** Custom reading days per week (e.g., weekdays only) — can be added later if needed.

---

## Open Decisions & Next Steps

- [x] Review and approve this product definition.
- [x] Choose the tech stack (Vite + React + TypeScript, Tailwind CSS, Dexie.js, `vite-plugin-pwa`, React Router, Zustand, Vitest).
- [x] Define the initial set of genre themes and screen designs in Stitch (`BookTime Editorial` + 4 core views + 4 genre atmospheres).
- [x] Scaffold the Vite + React + TypeScript project and set up design tokens from Stitch.
- [ ] Implement core domain logic with Vitest (daily goal planner, auto-deduction, streak calculation).
- [ ] Build the 4 core views and genre atmosphere switcher.
