# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run the app locally (simple HTTP server — no build step)
python3 -m http.server 8000
# Then open http://localhost:8000

# Supabase schema — paste schema.sql into Supabase SQL Editor and run
```

No build, test, or lint tooling is configured. The app is pure client-side HTML/CSS/JS loaded via CDN.

## Architecture

### Overview

A university lost-and-found web app — **no backend code needed**. Supabase provides the database layer; the browser runs everything.

**Stack:** Vanilla JS + HTML + CSS + Supabase JS SDK v2 (loaded from CDN).

### Pages (HTML files)

| Page | Route | Purpose |
|---|---|---|
| `index.html` | `/` | Browse, filter (All/Lost/Found), search, sort, paginated grid |
| `add.html` | `/add.html` | Report a lost/found item (with local draft save) |
| `item.html` | `/item.html?id=` | Full item details, image modal, "mark resolved" with edit code |
| `my-submissions.html` | `/my-submissions.html` | Login by nickname + optional edit code, list & manage own posts |

### Key files

- **`app.js`** — All application logic: Supabase client init, CRUD operations (via `dbFetchItems`, `dbGetItemById`, `dbInsertItem`, `dbUpdateStatus`, `dbDeleteItem`, `dbFetchByNickname`), page-specific initializers (`initHomePage`, `initAddPage`, `initItemDetailsPage`, `initMySubmissionsPage`), UI rendering, form validation, draft/localStorage helpers.
- **`style.css`** — Single stylesheet with CSS custom properties, responsive breakpoints (768px / 1024px), cards grid, skeleton loading, modal overlay, toast notifications.
- **`supabase-config.js`** — Supabase project URL + anon key (config-only, no logic).
- **`schema.sql`** — Database schema: `items` table with RLS policies and indexes. Run once in Supabase SQL Editor.

### Database (`items` table)

Key fields: `id` (TEXT PK, client-generated), `type` (lost/found), `name`, `description`, `location`, `date_lost_found`, `date_reported`, `image_base64` (stored as Base64 string, max 2 MB), `contact`, `nickname`, `status` (open/resolved), `edit_code` (6-char code for ownership verification).

RLS is wide-open (anyone can SELECT/INSERT/UPDATE/DELETE). The app relies on client-side edit-code checks for security — `dbUpdateStatus` and `dbDeleteItem` do NOT enforce edit codes at the DB level; the calling page prompts the user for the code before calling these functions.

### Data patterns

- **DB mapping:** `app.js` maps between snake_case (DB) and camelCase (JS) via `rowToItem` / `itemToRow`.
- **Pagination:** `PAGE_SIZE = 10`, client-side offset with "Load More" button.
- **Draft saving:** `add.html` auto-saves form state to `localStorage` key `lf_draft`, restores on page load.
- **Session:** `my-submissions.html` stores `{ nickname, code }` in `sessionStorage` key `lf_session` — cleared on logout.
- **Image handling:** FileReader → Base64 data URI, stored directly in DB. Not suitable for large-scale production but works for the university project scope.
- **No framework/router:** Pages are separate HTML files; JS determines which page init function to call by checking for DOM elements.

### Notable conventions

- Error handling: try/catch around every DB call with `showToast()` user feedback.
- `generateId()`: `'item_' + Date.now() + '_' + random` — not UUIDs.
- `generateCode()`: 6-char alphanumeric (ambiguous chars like 0/O/1/I omitted).
- `debounce()` on search input (350 ms).
- Skeleton cards shown while loading on the home page.
