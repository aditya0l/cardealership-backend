# 🔧 Prisma Studio - Can't Open in Safari

**Issue:** Safari can't open Prisma Studio at `http://localhost:5555`

---

## ✅ Quick Fixes

### Option 1: Open in Different Browser

```bash
# Chrome
open -a 'Google Chrome' http://localhost:5555

# Firefox
open -a Firefox http://localhost:5555

# Or manually navigate to:
http://localhost:5555
```

### Option 2: Make Sure Prisma Studio is Running

```bash
cd /Users/adityajaif/car-dealership-backend
npx prisma studio
```

**Expected output:**
```
Prisma Studio is up on http://localhost:5555
```

### Option 3: Check if Port is Available

```bash
# Check if port 5555 is in use
lsof -ti:5555

# If another process is using it, kill it:
kill -9 $(lsof -ti:5555)

# Then restart Prisma Studio
npx prisma studio
```

### Option 4: Try Different Port

If port 5555 is blocked, use a different port:

```bash
npx prisma studio --port 5556
# Then open: http://localhost:5556
```

---

## 🔍 Verify Prisma Studio is Running

```bash
# Check if it's responding
curl http://localhost:5555

# Should return HTML content
```

---

## 🚀 Start Prisma Studio

1. **Navigate to backend directory:**
   ```bash
   cd /Users/adityajaif/car-dealership-backend
   ```

2. **Start Prisma Studio:**
   ```bash
   npx prisma studio
   ```

3. **Open in browser:**
   - **Chrome:** `open -a 'Google Chrome' http://localhost:5555`
   - **Firefox:** `open -a Firefox http://localhost:5555`
   - **Safari:** Manually go to `http://localhost:5555` in Safari
   - **Or:** Copy and paste `http://localhost:5555` in your browser

---

## 🐛 Common Issues

### Issue 1: Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::5555`

**Fix:**
```bash
# Kill process on port 5555
kill -9 $(lsof -ti:5555)

# Restart Prisma Studio
npx prisma studio
```

### Issue 2: Database Connection Failed

**Error:** `Can't reach database server`

**Fix:**
```bash
# Check DATABASE_URL in .env file
cat .env | grep DATABASE_URL

# Make sure database is running
# For local PostgreSQL:
psql -U your_user -d your_database
```

### Issue 3: Safari Security Blocking

**If Safari blocks localhost connections:**

1. Open Safari Preferences
2. Go to Privacy & Security
3. Disable "Prevent cross-site tracking" (temporarily)
4. Try opening `http://localhost:5555` again

---

## ✅ Quick Test

```bash
# Test if Prisma Studio is accessible
curl -s http://localhost:5555 | head -5

# Should return HTML content
```

---

## 📋 Alternative: Use Prisma Studio in Different Browser

If Safari continues to have issues, use Chrome or Firefox:

```bash
# Chrome (Recommended)
open -a 'Google Chrome' http://localhost:5555

# Firefox
open -a Firefox http://localhost:5555
```

---

**Status:** Try opening in Chrome or Firefox if Safari doesn't work

**Last Updated:** January 2025

