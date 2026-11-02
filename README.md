# Mujahid's portfolio

## Separate Vercel deployments

This repository is organized as three independent Vercel projects:

| Project | Vercel Root Directory | Purpose |
| --- | --- | --- |
| Public site | `frontend` | Portfolio page and static assets |
| Admin site | `admin` | Owner dashboard |
| Backend API | `server` | Express API and MongoDB connection |

The public and admin projects proxy `/api/*` to the backend with Vercel rewrites. This keeps browser requests same-origin, including the admin session cookie. Keep the rewrites and the admin's relative `/api` requests as configured.

### 1. Deploy the backend

1. Import the repository as a Vercel project (for example, `mujahid-portfolio-api`) and set **Root Directory** to `server`.
2. Add these Production environment variables under Project Settings → Environment Variables:
   - `MONGODB_URI`: the rotated MongoDB Atlas URI.
   - `ADMIN_USERNAME`: a unique dashboard username.
   - `ADMIN_PASSWORD_HASH`: generate a hash by running `npm run hash-password` from the repository root. Choose a unique password of at least 12 characters and save the hash, not the plain password.
   - `SESSION_SECRET`: a fresh random secret of at least 32 characters. Generate it with `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`.
   - `APP_ORIGINS`: comma-separated exact origins of the public and admin projects, without trailing slashes. Example: `https://mujahidh.vercel.app,https://YOUR-ADMIN-PROJECT.vercel.app`.
3. Deploy and note the backend URL, for example `https://YOUR-API-PROJECT.vercel.app`.
4. Ensure the API deployment is reachable without a Vercel login; the application protects dashboard actions with its own authentication.

The MongoDB password previously shared in chat was exposed. Rotate it in Atlas before using it as `MONGODB_URI`. In Atlas Network Access, allow the backend deployment to connect. Prefer static egress allowlisting and a least-privilege database user.

### 2. Deploy the public portfolio

1. Create a second Vercel project from this repository and set **Root Directory** to `frontend`.
2. In `frontend/vercel.json`, replace `https://replace-with-backend-domain.vercel.app` with the backend URL from step 1. Keep the `/api/:path*` suffix.
3. Deploy and assign `mujahidh.vercel.app` to this project if that remains your public domain.

### 3. Deploy the admin dashboard

1. Create a third Vercel project from this repository and set **Root Directory** to `admin`.
2. In `admin/vercel.json`, replace `https://replace-with-backend-domain.vercel.app` with the same backend URL.
3. Deploy and note the admin project's exact origin.
4. Add the public and admin origins to the backend's `APP_ORIGINS`, separated by a comma, then redeploy the backend.
5. Open the admin project's root URL and sign in.

The dashboard links back to `https://mujahidh.vercel.app/`. If the public domain changes, update the links and favicon URL in `admin/index.html`.

### Local development

1. Run `npm install` from the repository root for the test tools, then run `npm install` from `server` for backend dependencies.
2. Copy `server/.env.example` to `server/.env` and set the rotated MongoDB URI and admin credentials. For local work, use `APP_ORIGINS=http://localhost:3000`.
3. Run `npm start` from the repository root. The public site is at `http://localhost:3000/`; the dashboard is at `http://localhost:3000/admin/`.

The initial portfolio records are inserted once on first API use. Existing edited records are not overwritten on later deploys.
