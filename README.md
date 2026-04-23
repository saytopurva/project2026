# Student Management System (SMS)

React (Vite) + Django REST API. The browser talks to Django through the Vite dev proxy (`/api` → `http://127.0.0.1:8000`).

## Quick start (recommended)

1. **Install JS deps**

   ```bash
   npm install
   ```

2. **Set up Python backend once**

   ```bash
   bash scripts/setup-backend.sh
   ```

3. **Run frontend + API together**

   ```bash
   npm run dev:stack
   ```

   - App: [http://127.0.0.1:3000](http://127.0.0.1:3000)
   - API health: [http://127.0.0.1:8000/api/health/](http://127.0.0.1:8000/api/health/) (or via proxy: [http://127.0.0.1:3000/api/health/](http://127.0.0.1:3000/api/health/))

If the dashboard or students list shows connection errors, confirm Django is up (`/api/health/` returns JSON `{"status":"ok"}`).

## Manual (two terminals)

- Terminal A: `bash scripts/run-backend.sh` (Django on port 8000)
- Terminal B: `npm run dev` (Vite on port 3000)

## Login

- **Email OTP** and **Google Sign-In** (see `.env.example`). JWT is stored after verification.

### Google Cloud Console (OAuth Client ID)

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. **APIs & Services** → **OAuth consent screen** (configure if prompted).
3. **Credentials** → **Create credentials** → **OAuth client ID** → type **Web application**.
4. Under **Authorized JavaScript origins**, add: `http://localhost:3000` (must match the Vite dev URL).
5. Copy the **Client ID** into `.env` as `VITE_GOOGLE_CLIENT_ID` and into `backend/.env` as `GOOGLE_OAUTH_CLIENT_ID` (same value).

## Production build (same app as dev — e.g. `/students`)

```bash
npm run build
```

Output: `dist/`. Test it locally:

```bash
npm run preview
```

Open the URL Vite prints (often [http://127.0.0.1:4173](http://127.0.0.1:4173)). Client routes like `/students` work the same as on port 3000 in dev; configure your static host to **fallback all paths to `index.html`** (SPA).

The dev server proxies `/api` to Django; **`preview` does not.** For a production build, either:

- Put the API behind the same origin (reverse proxy `/api` → Django), or  
- Set `VITE_API_URL` in `.env` **before** `npm run build` so the bundle calls your Django base URL, and allow that origin in Django CORS.

## Database (Django)

- **Default:** SQLite at `backend/db.sqlite3` (no env needed).
- **Override:** set `DATABASE_URL` (see `backend/.env.example`) for PostgreSQL or MySQL. After changing DB, run `python manage.py migrate` from `backend/`.
- **Audit:** `python manage.py verify_database` — tests the connection and prints row counts for Student, Attendance, Marks, Subject, ExamType.

## Environment

- Copy `.env.example` to `.env` for optional `VITE_*` variables.
- For production builds that call Django directly, set `VITE_API_URL` and ensure CORS on Django allows your frontend origin.

## Project layout

- `src/` — React app
- `backend/` — Django project (`manage.py`, `api`, `attendance`, `marks`, `reports`)
- `scripts/` — backend setup and combined dev server
