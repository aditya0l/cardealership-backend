# 🔧 Render Deployment Fix Checklist

## ⚠️ Critical: Check Render Dashboard Settings

The error `/opt/render/project/src/dist/server.js` suggests Render might be using a **manually configured start command** that overrides `render.yaml`.

### Step 1: Verify Start Command in Render Dashboard

1. Go to **Render Dashboard** → Your Web Service (`car-dealership-backend`)
2. Click **Settings** tab
3. Scroll to **"Start Command"** section
4. **Current command should be:**
   ```
   node scripts/wait-for-db-and-deploy.js
   ```
5. **If it's different** (like `npm start` or `node dist/server.js`), **UPDATE IT**:
   - Delete the current command
   - Enter: `node scripts/wait-for-db-and-deploy.js`
   - Click **Save Changes**

### Step 2: Check Root Directory

1. In **Settings** tab, find **"Root Directory"**
2. It should be **empty** or set to `/` (root)
3. **If it's set to `src` or anything else**, **clear it** or set to `/`
4. Click **Save Changes**

### Step 3: Verify Build Command

1. In **Settings** tab, find **"Build Command"**
2. It should be:
   ```
   npm install && npx prisma generate && npm run build
   ```
3. If different, update it

### Step 4: Manual Redeploy

After making changes:
1. Click **"Manual Deploy"** button (top right)
2. Select **"Deploy latest commit"**
3. Watch the logs

---

## 📋 Expected Log Output

When the fix works, you should see in the logs:

```
🚀 Starting deployment with database connection retry...
📁 Current working directory: /opt/render/project
📁 Project root: /opt/render/project
📁 Changed working directory to: /opt/render/project
🔍 Checking for dist/server.js in these locations:
   ✅ /opt/render/project/dist/server.js
✅ Found build at: /opt/render/project/dist/server.js
...
🚀 Starting application...
📁 Using server file: /opt/render/project/dist/server.js
📁 Absolute path resolved: /opt/render/project/dist/server.js
🚀 Starting server with: node "/opt/render/project/dist/server.js"
```

---

## 🚨 If Error Persists

If you still see `/opt/render/project/src/dist/server.js`:

1. **Check if there's a Root Directory override** in Render Dashboard
2. **Verify the start command** is exactly: `node scripts/wait-for-db-and-deploy.js`
3. **Check build logs** to see where `dist/server.js` is actually created
4. **Try setting Root Directory explicitly** to `/` in Render Dashboard

---

## 🔄 Alternative: Direct Start Command

If the wait script still doesn't work, you can try this start command directly:

```bash
cd /opt/render/project && node dist/server.js
```

But this won't handle database migrations, so the wait script is preferred.

---

**Last Updated**: After commit `18e80ff`

