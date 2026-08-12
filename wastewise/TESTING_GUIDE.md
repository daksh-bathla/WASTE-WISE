# Testing Guide - Fast-Track Analysis Fix

## Quick Test Steps

1. **Ensure both servers are running:**
   - Backend: http://localhost:5000 (should see "WasteWise backend running")
   - Frontend: http://localhost:5175 (or similar port)

2. **Open the app in browser:**
   - Go to http://localhost:5175
   - Log in with your credentials

3. **Perform a test scan:**
   - Click "Scan" or "Analyze Item"
   - Fill in item details (e.g., "Banana" for food, or any expired product)
   - Click "Analyze"

4. **Expected behavior:**
   - Analysis should complete in **8-12 seconds maximum**
   - Progress bar should move smoothly through the 4 steps
   - Should navigate to results page with suggestions
   - No infinite loading

5. **Check backend logs for Fast-Track messages:**
   ```
   [AnalysisPipeline] Starting analysis for user X
   [FastTrack] Starting suggestion generation for scan Y
   [FastTrack] Timeout reached (8000ms), using fast-track fallback
   [FastTrack] Generating fast-track suggestions for Z components
   [FastTrack] Suggestion generation completed in XXXXms
   [AnalysisPipeline] Completed in XXXXms
   ```

## What to Test

### Test Case 1: Simple Food Item
- **Item:** Banana peels
- **Expected:** Composting and cattle feed suggestions
- **Time:** Should complete in 8-12 seconds

### Test Case 2: Packaging
- **Item:** Plastic bottle
- **Expected:** Repurpose and recycling suggestions
- **Time:** Should complete in 8-12 seconds

### Test Case 3: Electronics
- **Item:** Old phone
- **Expected:** E-waste recycling suggestions
- **Time:** Should complete in 8-12 seconds

### Test Case 4: Retry After Failure
1. Try a scan that might fail initially
2. Click "Retry analysis"
3. **Expected:** Should complete successfully on retry (not hang)

## Troubleshooting

### If analysis still hangs:

1. **Check backend logs:**
   ```powershell
   Get-Content wastewise/backend/run.out.log -Tail 50
   ```

2. **Look for errors:**
   - Authentication errors (401)
   - Database errors
   - API timeout errors

3. **Restart servers:**
   ```powershell
   # Stop both servers (Ctrl+C in their terminals)
   # Then restart:
   cd wastewise/backend; .\run-server.ps1
   cd wastewise/frontend; npm run dev
   ```

4. **Check authentication:**
   - Make sure you're logged in
   - Token might be expired - try logging out and back in

5. **Check database:**
   - The fake DB should auto-initialize
   - Check `wastewise/backend/config/fake-db-state.json` exists

### Common Issues

**Issue:** "Can't analyse your item" error on first try
**Solution:** Click "Retry analysis" - this is expected when AI services are slow

**Issue:** Infinite loading on retry
**Solution:** Check backend logs for specific errors, restart backend if needed

**Issue:** No suggestions shown
**Solution:** Check if fast-track fallback was triggered (look for `[FastTrack]` logs)

## Success Indicators

✅ Analysis completes in ≤12 seconds
✅ Progress bar moves through all 4 steps
✅ Results page shows suggestions
✅ Backend logs show `[FastTrack]` messages when AI is slow
✅ Retry works if first attempt fails
✅ No console errors in browser DevTools

## Performance Metrics

- **Target:** 8-12 seconds for complete analysis
- **Maximum:** 12 seconds (hard timeout)
- **AI mode:** 20-60 seconds (if all AI services respond quickly)
- **Fast-track mode:** 3-8 seconds (when AI services are slow/unavailable)

## Monitoring

Watch for these log patterns in backend:

```
[AnalysisPipeline] Starting analysis for user X
[FastTrack] Starting suggestion generation for scan Y
[FastTrack] Timeout reached (8000ms), using fast-track fallback
[FastTrack] Generating fast-track suggestions for Z components
[FastTrack] Suggestion generation completed in XXXXms
[AnalysisPipeline] Completed in XXXXms
```

The presence of "Timeout reached" and "using fast-track fallback" messages indicates the system is working correctly - it's falling back to fast-track when AI services are slow, ensuring users always get results quickly.