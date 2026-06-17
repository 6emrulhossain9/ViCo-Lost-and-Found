# Campus Lost & Found

A campus lost & found web app. All items stored in a **shared Supabase database** — every visitor sees the same data in real time.

## Files

| File | Purpose |
|---|---|
| `index.html` | Home — browse, filter, search, sort |
| `add.html` | Report a lost or found item |
| `item.html` | Item detail page |
| `my-submissions.html` | Manage your posts |
| `style.css` | All styles (responsive) |
| `app.js` | All logic (Supabase CRUD, rendering, validation) |
| `supabase-config.js` | **Your credentials go here** |
| `schema.sql` | Run this once in Supabase SQL Editor |
| `README.md` | This file |

---

## Step 1 — Set up Supabase (free, takes 5 minutes)

1. Go to **https://supabase.com** → Sign up (free)
2. Click **New Project** → give it a name (e.g. `campus-lost-found`) → set a database password → Create
3. Wait ~1 min for the project to spin up
4. In the left sidebar click **SQL Editor**
5. Paste the entire contents of `schema.sql` → click **Run**
6. In the left sidebar click **Settings → API**
7. Copy:
   - **Project URL** (looks like `https://xxxxxxxxxxxx.supabase.co`)
   - **anon / public** key (long string under "Project API keys")
8. Open `supabase-config.js` and paste them:

```js
const SUPABASE_URL      = 'https://xxxxxxxxxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGci...your-anon-key...';
```

---

## Step 2 — Host on GitHub Pages (free)

1. Go to **https://github.com** → sign in → click **New repository**
2. Name it e.g. `campus-lost-found` → keep it **Public** → Create
3. Upload ALL files (drag-and-drop onto the GitHub page, or use git):
   - index.html, add.html, item.html, my-submissions.html
   - style.css, app.js, supabase-config.js, schema.sql, README.md
4. Go to repo **Settings → Pages**
5. Under "Build and deployment" → Source: **Deploy from a branch** → Branch: `main` → Folder: `/ (root)` → Save
6. Wait ~1 minute → your site is live at:
   ```
   https://<your-username>.github.io/campus-lost-found/
   ```
7. Share that URL with anyone on campus 🎉

---

## How it works

- **All visitors share the same database** — anyone who opens the site sees all items
- **Supabase Row Level Security** is enabled — anonymous users can read/insert/update/delete via the app UI
- When you post an item you get a **6-character code** — save it to mark the item resolved later
- Images are stored as Base64 in the database (max 2 MB each)
- No login required — nicknames only (matches SRS v1 scope)

## Run Locally (for testing before deploying)

```bash
cd path/to/lostfound
python3 -m http.server 8000
# open http://localhost:8000
```

> Don't just double-click index.html — the CDN script needs HTTP to load correctly.
