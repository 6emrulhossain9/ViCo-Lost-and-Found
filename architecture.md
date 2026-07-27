# ViCo Lost & Found — Architecture

## Overview

A university campus lost-and-found web application. Users can browse, report, and manage lost/found items. The app is **pure client-side** — no backend server. Supabase provides database and authentication services.

**Stack:** Vanilla JavaScript + HTML5 + CSS3 + Supabase (backend-as-a-service)

---

## Project Structure

```
ViCo-Lost-and-Found/
├── index.html              # Home page — browse, filter, search items
├── add.html                # Report a lost/found item (auth required)
├── item.html               # Item details page
├── my-submissions.html     # Manage own items (auth required)
├── auth.html               # Sign in / Sign up / Forgot password
├── app.js                  # All page logic, CRUD, rendering
├── auth.js                 # Authentication module
├── supabase-config.js      # Supabase project credentials
├── style.css               # All styles (single file)
├── schema.sql              # Database schema & RLS policies
├── CLAUDE.md               # Guidance for Claude Code
├── changes.md              # Changelog
├── architecture.md         # This file
└── README.md               # Project overview & setup
```

---

## Page Architecture

Each HTML page is a complete standalone page with shared header/nav/footer. The app uses **multi-page architecture** (no SPA router). Navigation happens via standard `<a>` links.

### Page Responsibilities

| Page | Route | Purpose | Auth Required |
|---|---|---|---|
| `index.html` | `/` | Browse items grid, filter (All/Lost/Found), search, sort, paginate | No |
| `add.html` | `/add.html` | Report lost/found item with form validation, image upload, draft save | Yes |
| `item.html` | `/item.html?id=` | Full item details, contact poster, image modal, resolve/delete (if owner) | No (but actions require auth) |
| `my-submissions.html` | `/my-submissions.html` | View/manage own items, edit display name | Yes |
| `auth.html` | `/auth.html` | Sign in, sign up, forgot password, Google OAuth | No (redirects if already signed in) |

---

## Script Architecture

Three JavaScript files load in a specific order:

```
supabase-config.js  →  auth.js  →  app.js
```

### `supabase-config.js`
Contains `SUPABASE_URL` and `SUPABASE_ANON_KEY` constants. No logic — configuration only.

### `auth.js` — Global Auth Module
- Initializes the Supabase client (`window._db`) for use by all scripts.
- Manages auth state via `onAuthStateChanged` listener.
- Provides functions: `signUp`, `signIn`, `signInWithGoogle`, `signOut`, `getSession`, `requireAuth`, `getDisplayName`, `updateNavAuth`.
- `requireAuth(redirectTo)` acts as a route guard — redirects to `auth.html` if no session.
- `updateNavAuth()` updates the `<span id="authNavItem">` in every page's nav.

### `app.js` — Application Logic
- **Page initializers** (called from `DOMContentLoaded`):
  - `initHomePage()` — Renders item grid, search/filter/sort/pagination, skeleton loading.
  - `initAddPage()` — Form handling, validation, draft save/restore, image upload, submit.
  - `initItemDetailsPage()` — Loads item by ID, renders details, handles resolve/delete.
  - `initMySubmissionsPage()` — Auth guard, fetches user's items, display name edit.
- **DB layer** — All Supabase queries wrapped in async functions:
  - `dbFetchItems()` — Paginated with filter/search/sort
  - `dbGetItemById()` — Single item
  - `dbInsertItem()` — Create item
  - `dbUpdateStatus()` — Resolve item
  - `dbDeleteItem()` — Delete item
  - `dbFetchMyItems()` — Fetch by user_id
- **DB mapping** — `rowToItem()` / `itemToRow()` convert between snake_case DB and camelCase JS.
- **Utilities** — `escapeHtml`, `formatDate`, `formatDateTime`, `generateId`, `debounce`, `showToast`, `isValidContact`, `isEmail`.

### `auth.html` Inline Script
Auth page has its own inline `<script>` block that does NOT depend on `app.js`. It copies only the helpers it needs (`escHtml`, `showFieldError`) to avoid loading the entire app bundle.

---

## Database Schema

### `items` Table

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | Client-generated (`item_` + timestamp + random) |
| `type` | TEXT | `'lost'` or `'found'` |
| `name` | TEXT | Item name |
| `description` | TEXT | Max 500 chars |
| `location` | TEXT | Campus location |
| `date_lost_found` | DATE | When the item was lost/found |
| `date_reported` | TIMESTAMPTZ | Auto-set on insert |
| `image_base64` | TEXT | Base64 data URI, max 2MB |
| `contact` | TEXT | Email or phone |
| `nickname` | TEXT | Deprecated (legacy items only) |
| `status` | TEXT | `'open'` or `'resolved'` |
| `edit_code` | TEXT | Deprecated (legacy items only) |
| `user_id` | UUID | FK → `auth.users(id)`, nullable for legacy |

### `profiles` Table

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | FK → `auth.users(id)` ON DELETE CASCADE |
| `display_name` | TEXT | Set on signup, editable later |
| `avatar_url` | TEXT | Reserved for future use |
| `created_at` | TIMESTAMPTZ | Auto-set |

### RLS Policies

**Items:**
- `SELECT` — Anyone (anon + authenticated)
- `INSERT` — Authenticated only, must have `user_id = auth.uid()`
- `UPDATE` — Owner only (`auth.uid() = user_id`)
- `DELETE` — Owner only (`auth.uid() = user_id`)

**Profiles:**
- `SELECT` — Anyone (to display names)
- `ALL` — Owner only (`auth.uid() = id`)

### Trigger

`on_auth_user_created` — After INSERT on `auth.users`, auto-creates a `profiles` row with `display_name` from user metadata or email prefix.

---

## Auth Flow

### Sign Up (Email/Password)
1. User fills email, password, display name on `auth.html`
2. `signUp()` calls `supabase.auth.signUp()`
3. If email confirmation disabled: session created immediately, redirect to home
4. If email confirmation enabled: show "Check your email" message

### Sign In (Email/Password)
1. User enters email + password on `auth.html`
2. `signIn()` calls `supabase.auth.signInWithPassword()`
3. On success: redirect to `?redirect=` param target or home

### Google OAuth
1. User clicks "Continue with Google"
2. Store redirect target in `sessionStorage`
3. Redirect to Google OAuth consent screen
4. On return to `auth.html`, check session → redirect to stored target

### Session Persistence
Supabase stores session in `sb-*-auth-token` cookie. `initAuth()` calls `getSession()` on every page load. The nav updates to show the user's display name or "Sign In".

### Protected Routes
- `requireAuth(redirectTo)` checks session
- If no session: `window.location.href = 'auth.html?redirect=current_page'`
- After auth: user is redirected back to `current_page`

---

## Key Design Decisions

### Why no SPA/router?
The project intentionally uses separate HTML pages (no framework). This keeps deployment simple (just static files on GitHub Pages) and matches the scope of a university web development course.

### Why Base64 for images?
Images are stored as Base64 data URIs directly in the database. This is NOT production-grade but works for the project scope (no file storage service needed). The 2MB limit prevents abuse.

### Why client-generated IDs?
Item IDs use `Date.now()` + random suffix rather than UUIDs or DB sequences. This simplifies the offline-capable write pattern but means IDs are predictable.

### Why no email confirmation in dev?
During development, Supabase's "Confirm email" setting is typically disabled for faster testing. The auth page automatically detects whether confirmation is required and shows the appropriate UI.

### Legacy item handling
Items created before auth (no `user_id`) remain visible but cannot be resolved/deleted through the new UI. A yellow notice explains they were posted before the auth system. Ownership can be claimed later via a migration tool (not yet built).

---

## Running Locally

```bash
cd /path/to/ViCo-Lost-and-Found
python3 -m http.server 8000
# Open http://localhost:8000
```

No build step, no npm install required.

---

## Deployment (GitHub Pages)

1. Push to GitHub repository
2. Settings → Pages → Deploy from `main` branch `/ (root)`
3. Site available at `https://<username>.github.io/ViCo-Lost-and-Found/`

The Google OAuth redirect URL must be configured in Supabase Dashboard for both `localhost` and the GitHub Pages URL.
