# Mujahid's portfolio

## Separate Vercel deployments

This repository is organized as three independent Vercel projects:

| Project | Vercel Root Directory | Purpose |
| --- | --- | --- |
| Public site | `frontend` | Portfolio page and static assets |
| Admin site | `admin` | Owner dashboard |
| Backend API | `server` | Express API and MongoDB connection |

The public and admin projects proxy `/api/*` to the backend with Vercel rewrites. This keeps browser requests same-origin, including the admin session cookie. Keep the rewrites and the admin's relative `/api` requests as configured.

### 1. Create the public and admin projects

1. Create a Vercel project for this repository with **Root Directory** `frontend` and assign `mujahidh.vercel.app`.
2. Create a second Vercel project from the same repository with **Root Directory** `admin` and assign `mujahidh-admin.vercel.app`.
3. The sites can deploy before the API; their API rewrites will work after you deploy the backend and push the configured URLs.

### 2. Deploy the backend

1. Create a third Vercel project from this repository (for example, `mujahid-portfolio-api`) and set **Root Directory** to `server`.
2. Add these Production environment variables under Project Settings → Environment Variables:
   - `MONGODB_URI`: the rotated MongoDB Atlas URI.
   - `ADMIN_USERNAME`: a unique dashboard username.
   - `ADMIN_PASSWORD_HASH`: generate a hash by running `npm run hash-password` from the repository root. Choose a unique password of at least 12 characters and save the hash, not the plain password.
   - `SESSION_SECRET`: a fresh random secret of at least 32 characters. Generate it with `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`.
   - `APP_ORIGINS`: `https://mujahidh.vercel.app,https://mujahidh-admin.vercel.app` (exact public and admin origins, no trailing slash).
3. Deploy the backend at `https://mujahidh-api.vercel.app`.
4. Ensure the API deployment is reachable without a Vercel login; the application protects dashboard actions with its own authentication.

The MongoDB password previously shared in chat was exposed. Rotate it in Atlas before using it as `MONGODB_URI`. In Atlas Network Access, allow the backend deployment to connect. Prefer static egress allowlisting and a least-privilege database user.

### 3. Connect and redeploy the sites

1. Both `frontend/vercel.json` and `admin/vercel.json` are configured to proxy to `https://mujahidh-api.vercel.app`.
2. Push the latest repository changes and redeploy the backend, public site, and admin site. The API entry point and admin favicon must be included in their respective deployments.
3. Check `https://mujahidh-api.vercel.app/api/health`; a working API returns HTTP 200 with `{"status":"ok"}`. An unauthenticated request to the admin session endpoint should return HTTP 401, not 404.
4. Open the public site and the admin project's root URL. Sign in to manage profile, skills, projects, and messages.

The dashboard links back to `https://mujahidh.vercel.app/`. If the public domain changes, update the links and favicon URL in `admin/index.html`.

### Local development

1. Run `npm install` from the repository root for the test tools, then run `npm install` from `server` for backend dependencies.
2. Copy `server/.env.example` to `server/.env` and set the rotated MongoDB URI and admin credentials. For local work, use `APP_ORIGINS=http://localhost:3000`.
3. Run `npm start` from the repository root. The public site is at `http://localhost:3000/`; the dashboard is at `http://localhost:3000/admin/`.

The initial portfolio records are inserted once on first API use. Existing edited records are not overwritten on later deploys.
