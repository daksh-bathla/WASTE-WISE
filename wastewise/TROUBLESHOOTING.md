# Troubleshooting Guide - Analysis Issues

## If Analysis Still Fails

### Step 1: Check Authentication
The most common issue is authentication. Make sure you're logged in:

1. Go to the login page
2. Log in with your credentials
3. Try the scan again

### Step 2: Check Backend Logs
Open a new terminal and watch the backend logs in real-time:

```powershell
Get-Content wastewise/backend/run.out.log -Wait -Tail 20
```

Look for these messages when you try to analyze:
- `[ScanController] Starting scan for user X`
- `[AnalysisPipeline] Starting analysis for user X`
- `[FastTrack] Starting suggestion generation`
- `[ScanController] Scan completed in Xms`

If you see errors, they will show as:
- `[ScanController] Error after Xms:`
- `[AnalysisPipeline] Error after Xms:`

### Step 3: Test Backend Directly
Open browser and go to: http://localhost:5000/api/health

You should see:
```json
{"status":"Backend server is running","timestamp":"..."}
```

If this doesn't work, the backend isn't running properly.

### Step 4: Restart Everything
Sometimes a clean restart helps:

1. **Stop both servers** (Ctrl+C in their terminals)
2. **Clear any stuck processes:**
   ```powershell
   # Kill any node processes
   taskkill /F /IM node.exe
   ```
3. **Start backend:**
   ```powershell
   cd wastewise/backend
   .\run-server.ps1
   ```
4. **Start frontend (in a new terminal):**
   ```powershell
   cd wastewise/frontend
   npm run dev
   ```
5. **Try the scan again**

### Step 5: Check for Specific Errors

#### Error: "Authentication required"
**Cause:** You're not logged in or token expired
**Solution:** Log in again

#### Error: "Failed to analyse your item"
**Cause:** Backend encountered an error
**Solution:** Check backend logs for details

#### Error: "Network Error" or "Failed to fetch"
**Cause:** Backend not running or wrong URL
**Solution:** Make sure backend is running on port 5000

#### Infinite Loading
**Cause:** Request is hanging
**Solution:** 
1. Check backend logs for timeouts
2. Restart backend
3. Try retry button

### Step 6: Verify Database
The fake database should auto-initialize. Check if the file exists:

```powershell
Test-Path wastewise/backend/config/fake-db-state.json
```

Should return: `True`

If it returns `False`, the database hasn't initialized. Try:
1. Stop backend
2. Delete any existing `fake-db-state.json` file
3. Start backend again

### Step 7: Check Port Conflicts
Make sure port 5000 isn't being used by something else:

```powershell
netstat -ano | findstr :5000
```

If you see another process using port 5000, either:
1. Kill that process, or
2. Change the backend port in `.env` file

### Step 8: Environment Variables
Make sure all required environment variables are set in `wastewise/backend/.env`:

```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=TARANG
DB_NAME=wastewise
JWT_SECRET=your_secret_key_here_change_this_in_production
GEMINI_API_KEY=...
GROQ_API_KEY=...
OPENROUTER_API_KEY=...
TAVILY_API_KEY=...
ELEVENLABS_API_KEY=...
NODE_ENV=development
```

### Step 9: Check Node Version
Make sure you have Node.js installed and it's working:

```powershell
node --version
npm --version
```

Should show version numbers (e.g., v18.x.x, 9.x.x)

### Step 10: Clear Browser Cache
Sometimes browser cache causes issues:

1. Open browser DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

Or try opening in incognito/private mode.

## Quick Diagnostic Commands

Run these commands to check system status:

```powershell
# Check if backend is responding
Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing

# Check if frontend is responding
Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing

# Check for node processes
Get-Process node -ErrorAction SilentlyContinue

# Check ports in use
netstat -ano | findstr ":5000 :5173"

# View recent backend logs
Get-Content wastewise/backend/run.out.log -Tail 10
```

## What to Share if You Need Help

If you're still having issues, share:

1. **Backend logs** (last 20 lines):
   ```powershell
   Get-Content wastewise/backend/run.out.log -Tail 20
   ```

2. **Frontend console errors** (from browser DevTools)

3. **Error message** you see on screen

4. **What step fails:**
   - First attempt?
   - Retry attempt?
   - After how many seconds?

## Expected Behavior

When everything works correctly:

1. **Login** → Success
2. **Start scan** → Progress bar appears
3. **Progress** → Moves through 4 steps (8-12 seconds)
4. **Results** → Shows suggestions page
5. **Retry** → Works if first attempt fails

## Common Success Indicators

✅ Backend logs show `[FastTrack]` messages (means fallback is working)
✅ Analysis completes in 8-12 seconds
✅ No console errors in browser
✅ Results page loads with suggestions
✅ Retry button works

## Still Stuck?

If none of these steps work, there may be a deeper issue. Try:

1. **Complete clean install:**
   ```powershell
   # Delete node_modules and reinstall
   cd wastewise/backend
   Remove-Item -Recurse -Force node_modules
   npm install
   
   cd ../frontend
   Remove-Item -Recurse -Force node_modules
   npm install
   ```

2. **Check Windows Firewall** - Make sure it's not blocking port 5000

3. **Run as Administrator** - Sometimes helps with port binding

4. **Check antivirus** - May be blocking node processes