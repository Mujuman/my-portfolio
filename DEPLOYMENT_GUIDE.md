# Deployment & Troubleshooting Guide

## What's Working ✅

1. **Admin Credentials in MongoDB**
   - Email: `mujahidhussen75@gmail.com`
   - Password: `mujuu123@`
   - Stored in: `AdminUser` collection

2. **Skills in Database**
   - All 12 default skills loaded
   - Including: GitHub (60%), Node.js (99%), MongoDB (98%), etc.
   - Stored in: `portfolioskills` collection

3. **Updated Authentication Code**
   - Login endpoint checks MongoDB first
   - Falls back to environment variables
   - Supports both local and production deployments

## If You're Getting 404 Errors

### Cause: Old Code Running on Vercel
Your Vercel deployment might still be running old code that doesn't support MongoDB authentication.

### Solution: Redeploy to Vercel

**Option 1: Using Git**
```bash
git add .
git commit -m "Update: MongoDB-based admin authentication and skill management"
git push origin main
```
Then redeploy on Vercel dashboard.

**Option 2: Vercel Dashboard**
- Go to https://vercel.com
- Select your project
- Click "Redeploy"
- Choose main branch

### After Redeployment
1. Clear browser cache (Ctrl+Shift+Delete)
2. Try logging in again with:
   - Email: `mujahidhussen75@gmail.com`
   - Password: `mujuu123@`

## Testing Locally

Run your server locally first:
```bash
npm start
```

Then access the admin panel at:
```
http://localhost:3000/admin
```

## Database Status Check

Run this script to verify data:
```bash
node scripts/seed-skills.js
```

This will show all skills currently in your database.

## Key Files Modified

- `server/models.js` - Added AdminUser schema
- `server/app.js` - Updated login endpoint to use MongoDB
- `scripts/setup-admin.js` - Create admin user
- `scripts/seed-skills.js` - Load default data

## Environment Variables

Your `.env` file is configured with:
- `MONGODB_URI` - Connection string to MongoDB
- `ADMIN_USERNAME` - Email address
- `ADMIN_PASSWORD_HASH` - Encrypted password
- `SESSION_SECRET` - Session encryption key
- `APP_ORIGINS` - Allowed origins for CORS

No changes needed to these!
