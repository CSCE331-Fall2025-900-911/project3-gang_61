# Quick Guide: Adding Render URL to Google OAuth

## Step 1: Get Your Render URL

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click on your **frontend service** (the Next.js app)
3. Copy the URL shown at the top (e.g., `https://your-app-name.onrender.com`)
4. **Important**: This is your frontend URL - you only need to add the frontend URL to Google Cloud Console

## Step 2: Add to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **"APIs & Services"** > **"Credentials"**
4. Find your **OAuth 2.0 Client ID** and click the **edit icon** (pencil)
5. Scroll down to **"Authorized JavaScript origins"**
6. Click **"+ ADD URI"**
7. Paste your Render URL: `https://your-app-name.onrender.com`
   - ✅ Must start with `https://`
   - ✅ No trailing slash (no `/` at the end)
   - ✅ No paths (just the domain)
8. Scroll down to **"Authorized redirect URIs"**
9. Click **"+ ADD URI"**
10. Paste the same URL: `https://your-app-name.onrender.com`
11. Click **"SAVE"** at the bottom
12. Wait 2-5 minutes for changes to take effect

## Step 3: Verify the Format

Your URL should look like this:

```
https://your-service-name.onrender.com
```

❌ **Wrong formats:**

- `http://your-service-name.onrender.com` (must be https)
- `https://your-service-name.onrender.com/` (no trailing slash)
- `https://your-service-name.onrender.com/login` (no paths)

## Step 4: Test

1. Go to your Render frontend URL
2. Click "Login for Cashiers / Managers"
3. Click "Sign in with Google"
4. If you see an error, check the browser console (F12) for the exact error message

## Common Issues

### "redirect_uri_mismatch" Error

**Check:**

1. URL format is exactly `https://your-app.onrender.com` (no trailing slash)
2. URL matches exactly what's in Google Cloud Console
3. You waited 5 minutes after saving changes
4. You're using the frontend URL (not backend URL)

### Can't Find Render URL

**Check:**

1. Service is deployed and shows as "Live" in Render dashboard
2. You're looking at the correct service (frontend, not backend)
3. URL is shown at the top of the service page in Render dashboard

## Need Help?

- Check `GOOGLE_OAUTH_SETUP.md` for detailed instructions
- Check `RENDER_DEPLOYMENT_GUIDE.md` for complete Render deployment guide
- Check browser console (F12) for specific error messages
