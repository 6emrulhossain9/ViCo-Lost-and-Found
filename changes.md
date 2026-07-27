# Changes Log

All notable changes to this project are documented here.

---

## 2026-07-27 — Initial project setup

- Initial commit of the ViCo Lost & Found project
- Basic structure: HTML pages (index, add, item, my-submissions), CSS, JS, Supabase schema
- Supabase backend with public RLS (anyone can read/write)
- Nickname + edit-code system for item ownership
- No authentication

---

## 2026-07-28 — CLAUDE.md & directory permissions

- Added `CLAUDE.md` with project guidance for Claude Code
- Fixed root-owned directory permissions (`chown` to `edavi`)

---

## 2026-07-28 — Supabase Auth integration (major update)

### New files
- `auth.js` — Central auth module with Supabase Auth functions (signUp, signIn, signInWithGoogle, signOut, getSession, requireAuth, getDisplayName, updateNavAuth). Also initializes the shared Supabase client (`window._db`).
- `auth.html` — Dedicated auth page with tab switcher (Sign In / Sign Up), Google OAuth button, email/password forms, error handling.

### Modified files
- `schema.sql` — Added `user_id UUID REFERENCES auth.users(id)` to items table. Created `profiles` table (linked to auth.users). Replaced wide-open RLS with auth-scoped policies (SELECT anyone; INSERT/UPDATE/DELETE only for owner). Added auto-profile-creation trigger on signup.
- `app.js` — Removed nickname/edit-code system. Removed `initSupabase()`, `showConfigError()`, `generateCode()`, `dbFetchByNickname()`, `getSession/setSession/clearSession()`. Added `dbFetchMyItems()` for auth-based queries. Updated `initAddPage()` with auth guard. Updated `initItemDetailsPage()` with auth-based ownership checks. Rewrote `initMySubmissionsPage()` for auth-only access. Added `renderItemDetails()` with legacy item handling. Updated `DOMContentLoaded` to init auth and nav.
- `style.css` — Added auth styles (`.auth-card`, `.auth-tabs`, `.auth-tab`, `.btn-google`, `.auth-divider`, `.nav-user`, `.nav-logout`, `.auth-error`, `.legacy-notice`).
- `index.html` — Added `<span id="authNavItem">` in nav, added `auth.js` script.
- `add.html` — Removed nickname form field, removed edit code from success screen, added auth.js script and nav item.
- `item.html` — Added auth.js script and nav item.
- `my-submissions.html` — Removed login card (nickname + access code form), replaced with auth gate.

### Breaking changes
- **Posting now requires authentication.** Users must sign up/in before reporting items.
- **Nickname system removed.** Display names come from the auth `profiles` table (set during signup).
- **Edit code system removed.** Item ownership is tied to the authenticated user's ID.
- **Existing items are read-only.** Items posted before auth (no `user_id`) remain publicly visible but cannot be resolved or deleted through the new UI.

---

## 2026-07-29 — Bug fixes & UI/UX audit

### Fixed bugs
- `auth.js`: Added missing `showConfigError()` function (was removed from `app.js` but called from `initSupabase()`). Fixed `db.auth.onAuthStateChange` → `window._db.auth.onAuthStateChange`.
- `auth.html`: Removed dependency on `app.js` to prevent duplicate DOMContentLoaded handlers (double init). Page is now fully self-contained.
- `app.js`: Added `await` before `renderItemDetails()` call in `initItemDetailsPage()` to ensure ownership checks complete before rendering.

### UI/UX improvements
- `auth.html`:
  - **Page flash prevention**: Full-page spinner shown before session check; content appears only after confirming no active session.
  - **Forgot Password**: Added link below password field, calls `supabase.auth.resetPasswordForEmail()`.
  - **Google OAuth loading state**: Shows spinner + blurs form when user clicks Google button.
  - **Form validation styling**: Uses `.has-error` / `.field-error` pattern matching the rest of the app. Real-time error clearing on input.
  - **Field-level error groups**: Each input has its own error message container.
- `my-submissions.html` + `app.js`:
  - **Display name edit**: Added "Edit Name" button next to welcome text. Inline editor saves to `profiles` table and updates nav immediately.
  - **Welcome text**: Now shows `Items posted by "DisplayName"` instead of static "Your Posts".
- `style.css` — Added `.legacy-notice` styles for legacy item warning.

### Documentation
- Added `changes.md` — this file, with timestamped change log.
- Added `architecture.md` — project architecture documentation.
