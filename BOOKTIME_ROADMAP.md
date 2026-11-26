# BookTime — Feature & Improvement Roadmap

Prioritized backlog of improvements and new features for **BookTime**, organized by user impact and implementation scope on top of the current local-first MVP.

---

## Priority Overview

| Tier | Focus | Goal |
|------|-------|------|
| **Tier 1 — High Impact / Quick Wins** | Daily quality of life & data safety | Make everyday reading sessions frictionless, resilient, and accurately tracked |
| **Tier 2 — Core Differentiators** | Planner & genre atmospheres | Deepen BookTime's unique scheduling and visual theming identity |
| **Tier 3 — Long-Term Roadmap** | Reflections, audio & sync | Expand beyond a single-device timer into a connected reading companion |

---

## Tier 1 — High Impact / Quick Wins

Fast, self-contained improvements that immediately elevate daily usability without changing BookTime's local-first architecture.

| Feature | Why It Matters | Scope / Technical Notes |
|---------|----------------|-------------------------|
| **Local Backup (JSON Export / Import)** | All books and reading sessions currently live in browser IndexedDB; clearing browser data or switching devices would lose history. | Export and import `books` and `sessions` from Dexie as a versioned JSON file with merge or replace options. |
| **Manual Session Logging** | Adjusting remaining e-reader time directly does not credit reading minutes toward daily stats or streaks when reading off-timer. | Add a "Log manual session" action (plus edit/delete for past sessions) so off-timer reading counts in streaks and weekly breakdowns. |
| **Focus Mode + Screen Wake Lock** | Keeps the device screen awake and removes navigation chrome while the timer is active. | Toggleable distraction-free view using the browser `WakeLock` API (`navigator.wakeLock.request('screen')`) with automatic release on pause/finish. |
| **Tab Countdown & System Notification** | Lets readers monitor remaining time while browsing other tabs and get notified even if the tab is in the background. | Sync `document.title` (`MM:SS · BookTime`) while running and trigger a Web Notification when the countdown hits `00:00`. |
| **Google Books API Fallback** | Improves cover availability and Spanish-language title matching where Open Library coverage is sparse. | Extend `src/infrastructure/bookSearch.ts` to query Google Books when Open Library returns few/no matches or missing covers. |

### Tier 1 Checklist
- [x] Local JSON export/import backup for IndexedDB (`books` + `sessions`)
- [ ] Manual reading session entry, edit, and deletion
- [ ] Distraction-free Focus Mode with Screen Wake Lock API
- [ ] Live `document.title` countdown + Web Notification on completion
- [ ] Google Books API fallback in `src/infrastructure/bookSearch.ts`

---

## Tier 2 — Planner & Atmosphere Differentiators

Enhancements that sharpen the two pillars that make BookTime distinct: realistic e-reader pacing and calm visual immersion.

| Feature | Why It Matters | Scope / Technical Notes |
|---------|----------------|-------------------------|
| **Configurable Reading Days** | Readers who skip weekends or specific weekdays get unrealistic daily goals from a flat calendar-day division. | Allow per-book or global weekday selection (e.g., Mon–Fri) and update `calculateDailyGoal` to count only active reading days until day X. |
| **Remaining Genre Themes & Cover Accents** | *Romance*, *Historical*, and *Non-Fiction* currently fall back to the Editorial theme, and cover art is not yet reflected in the palette. | Add dedicated `data-atmosphere` tokens for remaining genres, then optionally extract dominant muted accents from a book's cover. |
| **Subtle Atmospheric Visual Details** | Reinforces genre mood during reading sessions without breaking Stitch's calm editorial legibility. | Add subtle CSS background gradients, corner motifs, or tactile paper grain variants per atmosphere (respecting `prefers-reduced-motion`). |

### Tier 2 Checklist
- [ ] Custom reading days-of-week schedule in planner calculations
- [ ] Dedicated themes for *Romance*, *Historical*, and *Non-Fiction*
- [ ] Optional cover-driven accent extraction per book
- [ ] Subtle editorial background gradients/textures per atmosphere

---

## Tier 3 — Long-Term Roadmap

Larger features planned once the single-device reading experience is battle-tested.

| Feature | Why It Matters | Scope / Technical Notes |
|---------|----------------|-------------------------|
| **Reading Journal / Quick Quotes** | Captures memorable passages or quick thoughts right when a reading session ends. | Optional short note/quote prompt on session completion, stored per book and browsable in Library/Stats. |
| **Integrated Audio & Playlists** | Lets readers pair a book or genre with background ambience without leaving the app. | Link external Spotify/YouTube playlists per book/genre or offer optional soft ambient soundscapes (rain, fireplace, café). |
| **Multi-Device Sync** | Shares library, remaining e-reader time, sessions, and streak seamlessly between phone and desktop. | Lightweight optional authentication and cloud sync (e.g., Supabase) layered on top of local IndexedDB. |

### Tier 3 Checklist
- [ ] Quick notes & quotes attached to sessions/books
- [ ] Per-book/genre playlists or optional ambient soundscapes
- [ ] Optional accounts and cloud sync across devices

---

## Next Step

Pick one feature from **Tier 1** (for example, **Manual Session Logging**) to implement next while keeping the MVP fast and local-first.
