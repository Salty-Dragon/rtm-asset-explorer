# Sync Daemon Debugging Guide

## Recent Improvements (Latest Version)

This guide documents recent improvements made to the sync daemon to eliminate silent failures and improve debuggability.

## What Was Fixed

### Problem: Silent Failures
Previously, the sync daemon could fail to sync data without providing clear error messages, making it impossible to diagnose issues. Common scenarios included:
- Environment variables not loading properly
- MongoDB or blockchain connection failures not being clearly reported
- Errors being caught and logged but not visible in console output
- No indication that the daemon was still running when synced

### Solution: Comprehensive Error Logging

All critical paths now have detailed console logging with clear prefixes:
- `[ENV]` - Environment variable loading
- `[SYNC INIT]` - Initialization steps
- `[SYNC LOOP]` - Sync loop iterations
- `[SYNC STATE]` - State updates
- `[BLOCKCHAIN RPC]` - RPC calls to blockchain
- `[BLOCKCHAIN HEALTH]` - Health checks

## How to Debug Sync Issues

### Step 1: Check the Startup Banner

When the sync daemon starts, you should see:

```
[ENV] Loading environment from: /path/to/backend/.env
[ENV] Environment variables loaded successfully
==========================================
RTM Asset Explorer - Sync Daemon Starting
==========================================
SYNC_ENABLED: true
NODE_ENV: production
Working Directory: /path/to/backend

Environment Variables Check:
- MONGODB_URI: ✓ Set
- RAPTOREUMD_HOST: 127.0.0.1 (default)
- RAPTOREUMD_PORT: 10225 (default)
- RAPTOREUMD_USER: ✓ Set
- RAPTOREUMD_PASSWORD: ✓ Set
==========================================
```

**What to look for:**
- ✓ All required environment variables should show "✓ Set"
- ✓ SYNC_ENABLED should be `true`
- ✓ No `✗ Missing` indicators

### Step 2: Check Initialization

After startup, you should see:

```
[SYNC INIT] Starting initialization...
[SYNC INIT] Checking required environment variables...
[SYNC INIT] All required environment variables present
[SYNC INIT] Connecting to MongoDB...
[SYNC INIT] MongoDB connected successfully
[SYNC INIT] Checking blockchain connection...
[BLOCKCHAIN HEALTH] Checking blockchain health...
[BLOCKCHAIN RPC] Calling getblockchaininfo at http://127.0.0.1:10225
[BLOCKCHAIN RPC] getblockchaininfo succeeded
[BLOCKCHAIN HEALTH] Connected to main at block 123456
[SYNC INIT] Blockchain connected: main at block 123456
[SYNC INIT] Initializing sync state...
[SYNC INIT] Initialization complete!
```

**What to look for:**
- ✓ Each step should complete successfully
- ✓ MongoDB connection should succeed
- ✓ Blockchain RPC calls should succeed
- ✗ Any `[SYNC INIT ERROR]` messages indicate a problem

### Step 3: Monitor Sync Loop

During syncing, you should see periodic messages:

```
[SYNC] Calling syncLoop...
[SYNC LOOP] Starting sync loop iteration...
[SYNC LOOP] Fetching sync state from database...
[SYNC LOOP] Current block: 150000
[SYNC LOOP] Fetching blockchain info...
[BLOCKCHAIN RPC] Calling getblockchaininfo at http://127.0.0.1:10225
[BLOCKCHAIN RPC] getblockchaininfo succeeded
[SYNC LOOP] Target block: 200000
[SYNC LOOP] Syncing blocks 150001 to 150100
[SYNC STATE] Updated: {"targetBlock":200000}
[SYNC STATE] Updated: {"status":"syncing"}
[SYNC STATE] Updated: {"currentBlock":150100,"lastSyncedAt":"2024-02-14T21:00:00.000Z"}
[SYNC LOOP] Successfully synced to block 150100
```

**What to look for:**
- ✓ Continuous progress (current block increasing)
- ✓ No error messages
- ✓ Regular state updates

### Step 4: When Synced

When fully synced, you'll see heartbeat messages:

```
[SYNC] Calling syncLoop...
[SYNC LOOP] Starting sync loop iteration...
[SYNC LOOP] Fetching sync state from database...
[SYNC LOOP] Current block: 200000
[SYNC LOOP] Fetching blockchain info...
[BLOCKCHAIN RPC] Calling getblockchaininfo at http://127.0.0.1:10225
[BLOCKCHAIN RPC] getblockchaininfo succeeded
[SYNC LOOP] Target block: 200000
[SYNC LOOP] Already synced at block 200000, waiting for new blocks...
```

This confirms the daemon is still running and monitoring for new blocks.

## Common Issues and Solutions

### Issue 1: Environment Not Loading

**Symptom:**
```
[ENV WARNING] Could not load .env file from /path/to/.env: ENOENT: no such file or directory
[ENV WARNING] Will use environment variables from system or PM2 config
```

**Solution:**
1. Create a `.env` file in the `backend/` directory
2. Copy from `.env.example`: `cp .env.example .env`
3. Fill in the required values
4. Restart the daemon

**OR** if using PM2, ensure environment variables are set in `ecosystem.config.js`

### Issue 2: Missing Environment Variables

**Symptom:**
```
[SYNC INIT ERROR] Missing required environment variables: MONGODB_URI, RAPTOREUMD_USER
```

**Solution:**
1. Check your `.env` file has all required variables:
   - MONGODB_URI
   - RAPTOREUMD_HOST (optional, defaults to 127.0.0.1)
   - RAPTOREUMD_PORT (optional, defaults to 10225)
   - RAPTOREUMD_USER
   - RAPTOREUMD_PASSWORD
2. Ensure SYNC_ENABLED=true
3. Restart the daemon

### Issue 3: MongoDB Connection Failed

**Symptom:**
```
[SYNC INIT] Connecting to MongoDB...
[SYNC INIT ERROR] connect ECONNREFUSED 127.0.0.1:27017
```

**Solution:**
1. Check MongoDB is running: `systemctl status mongod` or `brew services list | grep mongodb`
2. Test connection manually: `mongosh "mongodb://localhost:27017/rtm_explorer"`
3. Verify MONGODB_URI in `.env` matches your MongoDB setup
4. Check MongoDB authentication credentials

### Issue 4: Blockchain RPC Failed

**Symptom:**
```
[BLOCKCHAIN HEALTH] Checking blockchain health...
[BLOCKCHAIN RPC] Calling getblockchaininfo at http://127.0.0.1:10225
[BLOCKCHAIN RPC ERROR] getblockchaininfo failed: 401 Unauthorized
```

**Solution:**
1. Check Raptoreumd is running: `ps aux | grep raptoreumd`
2. Verify RPC credentials in `~/.raptoreum/raptoreum.conf` match your `.env`
3. Test RPC manually:
   ```bash
   curl --user "user:pass" \
     --data-binary '{"jsonrpc":"1.0","id":"test","method":"getblockcount","params":[]}' \
     http://127.0.0.1:10225/
   ```
4. Update RAPTOREUMD_USER and RAPTOREUMD_PASSWORD in `.env`

### Issue 5: Sync Disabled

**Symptom:**
```
==========================================
SYNC DISABLED
==========================================
SYNC_ENABLED is not set to "true"
Current value: false
```

**Solution:**
1. Set `SYNC_ENABLED=true` in your `.env` file
2. **Important:** Must be exactly the string "true" (lowercase)
3. Restart the daemon
4. If using PM2, ensure `ecosystem.config.js` has `SYNC_ENABLED: 'true'`

### Issue 6: Sync Stops with Max Retries

**Symptom:**
```
==========================================
[SYNC DAEMON FATAL] Max retry attempts reached
==========================================
The sync daemon will now stop.
```

**Solution:**
1. Check the logs above this message for the actual error
2. Fix the underlying issue (usually MongoDB or blockchain connection)
3. Restart the daemon
4. If using PM2, it will auto-restart and retry

## Viewing Logs

### Console Logs (PM2)
```bash
# Real-time logs
pm2 logs rtm-sync

# Last 100 lines
pm2 logs rtm-sync --lines 100

# Only errors
pm2 logs rtm-sync --err
```

### Log Files
```bash
# Sync output
tail -f logs/sync-out.log

# Sync errors
tail -f logs/sync-error.log

# All sync logs
tail -f logs/sync.log
```

## Monitoring Sync Progress

Use the monitoring script:
```bash
cd backend/scripts
./monitor-sync.sh
```

Or check via API:
```bash
curl http://localhost:4004/api/sync/status
```

## Getting More Help

If you're still experiencing issues:

1. **Collect logs:**
   ```bash
   pm2 logs rtm-sync --lines 500 > sync-debug.log
   ```

2. **Look for these patterns:**
   - `[SYNC INIT ERROR]` - Initialization failed
   - `[SYNC LOOP ERROR]` - Sync loop error
   - `[BLOCKCHAIN RPC ERROR]` - RPC call failed
   - `[SYNC STATE ERROR]` - State update failed

3. **Check system resources:**
   - MongoDB disk space
   - System memory
   - Network connectivity to blockchain node

4. **Review environment:**
   - All required variables set
   - SYNC_ENABLED=true
   - Correct credentials
   - Proper file permissions

## Summary

The improved logging should make it much easier to identify exactly where and why the sync daemon is failing. Every critical operation now produces visible console output with clear error messages and troubleshooting guidance.

If you see no output at all, the daemon is likely not starting - check PM2 status with `pm2 list` and `pm2 show rtm-sync`.
