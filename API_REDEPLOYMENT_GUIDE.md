# API Server Redeployment Guide - CRITICAL

## Discovery
Your portfolio uses **3 separate Vercel projects**:

1. **Frontend**: https://mujahidh.vercel.app (displays portfolio)
2. **Admin**: https://mujahidh-admin.vercel.app (admin dashboard)
3. **API Server**: https://mujahidh-api.vercel.app (handles skill/project CRUD)

Both frontend and admin route all API calls to: `https://mujahidh-api.vercel.app`

**Config proof:**
- `frontend/vercel.json` → rewrites to mujahidh-api
- `admin/vercel.json` → rewrites to mujahidh-api

## Current Problem

✅ Code changes are in GitHub: `e3f1d3d`
✅ Fix includes PUT and GET endpoints
❌ But the **API Server** on Vercel hasn't redeployed yet

The API server is probably on a different Vercel project that needs separate deployment.

## Solution - Manual Redeployment

### Step 1: Check Your Vercel Dashboard

Go to: https://vercel.com/dashboard

You should see 3 projects:
- `my-portfolio` (frontend)
- `my-portfolio-admin` (admin dashboard)  
- `my-portfolio-api` or similar (API server) ← **THIS ONE NEEDS REBUILD**

### Step 2: Find the API Server Project

1. Go to https://vercel.com/dashboard
2. Look for a project that contains the `/api/` routes
3. It should be named something like:
   - `my-portfolio-api`
   - `mujahidh-api`
   - `portfolio-api`

### Step 3: Redeploy the API Server

1. Click on the API server project
2. Look for a **"Redeploy"** or **"Deploy"** button
3. Click it to trigger a new build
4. Wait for deployment to complete (shows green checkmark)

### Step 4: Verify

After deployment completes:
1. Go to admin: https://mujahidh-admin.vercel.app/
2. Login with credentials
3. Try editing a skill
4. ✅ Should work without 404 error

## Alternative: GitHub Integration

If Vercel is connected to GitHub:

1. The API server might auto-rebuild on each push
2. Check the Vercel project settings
3. If not auto-building, manually trigger in dashboard

## Current Git Status

Latest commits:
- `e3f1d3d` - Force API server rebuild (just pushed)
- `88cc0b8` - Status & code documentation
- `3da4dad` - Comprehensive guides
- `8ca9ff1` - Initial fix commit

All code changes are in GitHub and ready to deploy.

## Code Ready to Deploy

✅ **File: server/app.js**
- Line 330: Added `GET /admin/skills/:id`
- Line 356: Updated `PUT /admin/skills/:id`
- Line 391: Added `GET /admin/projects/:id`
- Line 403: Updated `PUT /admin/projects/:id`

✅ **File: server/models.js**
- Added AdminUser schema for MongoDB auth

✅ **All endpoints support:**
- Admin authentication requirement
- CSRF token validation
- Proper error handling

## What Happens After API Redeployment

1. User goes to admin dashboard
2. Logs in
3. Clicks "Edit" on GitHub skill
4. **PUT request** to `/api/admin/skills/github` → **200 OK** ✅
5. Skill updates successfully
6. Form refreshes with new data

## Troubleshooting

### If you can't find the API project on Vercel:

1. Check if it's under a different account
2. Look for "mujahidh-api" specifically
3. Or search for "portfolio" in project list

### If redeploy button is grayed out:

1. Try connecting GitHub to Vercel
2. Or manually redeploy from Git history
3. Or contact Vercel support

### If still getting 404 after redeploy:

1. Clear browser cache completely
2. Try incognito window
3. Wait 2-5 minutes for CDN to update
4. Check Vercel deployment logs for errors

## Quick Checklist

- [ ] Go to Vercel dashboard
- [ ] Find API server project
- [ ] Click Redeploy button
- [ ] Wait for green checkmark
- [ ] Test skill edit on admin
- [ ] Verify PUT request succeeds
- [ ] ✅ Skill update works!

---

**This is the critical step needed to fix the 404 error!**

All code is ready on GitHub. Just need to redeploy the API server on Vercel.
