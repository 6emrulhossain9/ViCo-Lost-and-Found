# ViCo Lost & Found

A university lost-and-found web application for reporting, browsing, and managing lost or found items on campus. The project uses a shared **Supabase** database so everyone in the university community can see updates in real time.

## Project Overview

ViCo Lost & Found is designed to help students, faculty, and staff quickly post items they have lost or found and search existing posts to reconnect items with their owners.

### Key Features

- Browse all lost and found items in one place
- Filter, search, and sort listings
- Submit new lost/found reports
- View individual item details
- Manage your own submissions
- Real-time shared data through Supabase
- Responsive design for desktop and mobile devices

## Tech Stack

- **JavaScript** — application logic and Supabase CRUD operations
- **HTML** — page structure and content
- **CSS** — styling and responsive layout
- **Supabase** — backend database and API

## Project Files

| File | Purpose |
|---|---|
| `index.html` | Home page for browsing, filtering, searching, and sorting items |
| `add.html` | Page for reporting a lost or found item |
| `item.html` | Individual item details page |
| `my-submissions.html` | Page for managing your own posts |
| `style.css` | All project styling and responsive layout |
| `app.js` | Main application logic, rendering, validation, and Supabase CRUD |
| `supabase-config.js` | Supabase project credentials |
| `schema.sql` | Database schema to run in the Supabase SQL Editor |
| `README.md` | Project documentation |

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com) and sign up for a free account.
2. Create a new project and choose a project name.
3. Set a database password and wait for the project to finish initializing.
4. Open **SQL Editor** in the Supabase dashboard.
5. Paste the full contents of `schema.sql` and run it.
6. Go to **Settings → API**.
7. Copy your:
   - **Project URL**
   - **anon / public key**
8. Open `supabase-config.js` and add the values:

```js
const SUPABASE_URL = 'https://xxxxxxxxxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### 2. Run the Project Locally

You can test the project locally using a simple HTTP server:

```bash
cd path/to/ViCo-Lost-and-Found
python3 -m http.server 8000
```

Then open:

```bash
http://localhost:8000
```

> Note: Do not open `index.html` directly in the browser if external scripts need to load through HTTP.

### 3. Deploy on GitHub Pages

1. Push all project files to your GitHub repository.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Choose the `main` branch and `/ (root)` folder.
5. Save the settings and wait for deployment.
6. Your site will be available at:

```text
https://<your-username>.github.io/ViCo-Lost-and-Found/
```

## How It Works

- All visitors use the same database, so item posts are shared across the university.
- Supabase Row Level Security supports safe read/write interactions through the app.
- Users receive a short recovery code when posting an item, which can be used later to mark it as resolved.
- Images are stored in the database as Base64 strings, with size limits applied.
- No login is required; users can post using nicknames only.

## Suggested University Project Description

This project is a web-based university lost-and-found platform that allows members of the campus community to report items they have lost or found, search existing posts, and manage submissions through a simple and responsive interface. It was built using HTML, CSS, JavaScript, and Supabase to provide a practical full-stack solution for improving item recovery within a university environment.

## License

If your instructor requires one, add the appropriate license information here.
