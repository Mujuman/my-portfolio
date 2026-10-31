# Mujahid's portfolio

## Backend and owner dashboard

The public portfolio reads its profile, skills, and projects from MongoDB through the Express API. Contact form messages are stored privately and can be read, marked, or deleted in the owner dashboard at `/admin.html`.

### Rotate the database password first

The MongoDB connection string previously pasted into chat contains database credentials. In MongoDB Atlas, change the database user's password and use only the replacement in deployment environment variables. Do not put a connection string or password in source control.

### Vercel setup

1. Deploy this repository to Vercel with the repository root as the project root.
2. In Vercel Project Settings → Environment Variables, set:
   - `MONGODB_URI`: the rotated MongoDB Atlas connection string, including a database name such as `/portfolio`.
   - `ADMIN_USERNAME`: a unique dashboard username.
   - `SESSION_SECRET`: a fresh random secret of at least 32 characters. Generate one with `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`.
   - `ADMIN_PASSWORD_HASH`: the output of `npm run hash-password`; use a unique password with at least 12 characters. Store the generated hash as the variable value, not the plain password.
   - `APP_ORIGIN`: the exact public origin, for example `https://mujahidh.vercel.app` (no trailing slash). Admin sign-in stays disabled until this is set.
3. In Atlas Network Access, allow connections from the Vercel deployment. Prefer Vercel Secure Compute/static egress IP allowlisting where available. If a broad IP rule is unavoidable, use a dedicated least-privilege database user with a newly rotated strong password.
4. Redeploy after setting environment variables.
5. Open `/admin.html`, sign in, and manage profile details, projects, skills, and contact submissions.

Vercel's default deployment URL should also be added as an `APP_ORIGIN`-appropriate deployment environment value if preview deployments need dashboard writes. Avoid allowing arbitrary origins.

### Local development

1. Run `npm install`.
2. Copy `.env.example` to `.env`, then provide the rotated MongoDB URI, admin username, password hash, and a random session secret.
3. Start the server with `npm start` and visit `http://localhost:3000`.

The initial portfolio records are inserted once on first API use. Existing edited records are not overwritten on later deploys.
