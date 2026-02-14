# Sync Daemon Troubleshooting Guide

## Issue: Sync Not Starting

If your sync daemon is not starting and you see "No sync state found (sync not started)", follow this guide to diagnose and fix the issue.

## Quick Diagnosis Checklist

### 1. Check if Sync is Enabled

```bash
# Check your environment variable
echo $SYNC_ENABLED

# Or check in PM2
pm2 describe rtm-sync | grep SYNC_ENABLED
```

**Expected:** `SYNC_ENABLED=true`  
**Problem:** If not set or set to anything other than `true`, sync will be disabled

### 2. Check if Daemon Process is Running

```bash
# Check PM2 status
pm2 list

# Check for errors
pm2 logs rtm-sync --lines 50

# Or check system processes
ps aux | grep sync-daemon
```

**Expected:** Process should be running with no errors  
**Problem:** If process is not running or restarting constantly, there's a configuration issue

### 3. Check Environment Variables

```bash
# View current PM2 environment
pm2 show rtm-sync

# Or check .env file
cat .env | grep -E 'SYNC_ENABLED|MONGODB_URI|RAPTOREUMD'
```

**Expected:** All required variables should be set:
- `MONGODB_URI`
- `RAPTOREUMD_HOST`
- `RAPTOREUMD_PORT`
- `RAPTOREUMD_USER`
- `RAPTOREUMD_PASSWORD`
- `SYNC_ENABLED=true`

### 4. Check Service Dependencies

```bash
# Check MongoDB
mongosh $MONGODB_URI --eval "db.runCommand({ ping: 1 })"

# Check Raptoreumd RPC
curl --user "$RAPTOREUMD_USER:$RAPTOREUMD_PASSWORD" \
  --data-binary '{"jsonrpc":"1.0","id":"test","method":"getblockcount","params":[]}' \
  -H 'content-type: text/plain;' \
  http://$RAPTOREUMD_HOST:$RAPTOREUMD_PORT/
```

**Expected:** Both services should respond successfully  
**Problem:** If either fails, the sync daemon cannot start

## Recent Fixes (v1.0.1)

### Bug Fix: SYNC_ENABLED Logic

**Previous Behavior:**
```javascript
// OLD (BROKEN)
this.syncEnabled = process.env.SYNC_ENABLED !== 'false';
```

This had several problems:
- ❌ Sync was **enabled by default** if `SYNC_ENABLED` was not set
- ❌ Any value except the string `'false'` would enable sync
- ❌ Values like `0`, `False`, `FALSE`, empty string all enabled sync
- ❌ Silent failures if configuration was incomplete

**New Behavior:**
```javascript
// NEW (FIXED)
this.syncEnabled = process.env.SYNC_ENABLED === 'true';
```

Now:
- ✅ Sync is **disabled by default** if not explicitly set to `'true'`
- ✅ Only the exact string `'true'` enables sync
- ✅ Clear error messages if sync is disabled or misconfigured
- ✅ Validates all required environment variables at startup

### Bug Fix: Environment Variable Validation

The daemon now validates all required variables at startup:

```
Missing required environment variables: MONGODB_URI, RAPTOREUMD_USER, RAPTOREUMD_PASSWORD
Please check your .env file or PM2 configuration.
```

### Bug Fix: Better Error Messages

The daemon now outputs clear diagnostic information:

```
==========================================
RTM Asset Explorer - Sync Daemon Starting
==========================================
SYNC_ENABLED: true
NODE_ENV: production
Working Directory: /path/to/backend
==========================================
```

## Common Issues & Solutions

### Issue 1: "Sync is disabled" Message

**Symptom:** Console shows sync disabled even though you set `SYNC_ENABLED=true`

**Causes:**
1. Environment variable not loaded correctly
2. Typo in variable name
3. Case sensitivity (must be lowercase `true`)

**Solution:**
```bash
# For PM2, check the environment:
pm2 show rtm-sync

# Restart with explicit environment:
pm2 restart rtm-sync --update-env

# Or set directly:
pm2 set rtm-sync:SYNC_ENABLED true
```

### Issue 2: "Missing required environment variables"

**Symptom:** Daemon fails to start with list of missing variables

**Solution:**
```bash
# Create .env file from example
cd backend
cp .env.example .env

# Edit .env and fill in actual values
nano .env

# Restart daemon
pm2 restart rtm-sync
```

### Issue 3: "MONGODB_URI not configured"

**Symptom:** Daemon exits immediately after starting

**Causes:**
1. `.env` file doesn't exist
2. `MONGODB_URI` not set in PM2 or environment
3. MongoDB connection string is invalid

**Solution:**
```bash
# Test MongoDB connection manually
mongosh "mongodb://user:pass@localhost:27017/rtm_explorer?authSource=admin"

# If successful, set in .env:
MONGODB_URI=mongodb://user:pass@localhost:27017/rtm_explorer?authSource=admin

# Or in PM2 ecosystem.config.js:
env: {
  MONGODB_URI: 'mongodb://user:pass@localhost:27017/rtm_explorer?authSource=admin'
}
```

### Issue 4: "Blockchain not available"

**Symptom:** Daemon fails at blockchain health check

**Causes:**
1. Raptoreumd is not running
2. RPC credentials are incorrect
3. RPC port is blocked

**Solution:**
```bash
# Check if raptoreumd is running
ps aux | grep raptoreumd

# Test RPC connection
curl --user "rpcuser:rpcpass" \
  --data-binary '{"jsonrpc":"1.0","id":"test","method":"getblockcount","params":[]}' \
  -H 'content-type: text/plain;' \
  http://127.0.0.1:10225/

# Check raptoreum.conf for RPC settings
cat ~/.raptoreum/raptoreum.conf | grep -E 'rpcuser|rpcpassword|rpcport'
```

## Manual Testing

### Test 1: Verify SYNC_ENABLED Logic

```bash
cd backend
node test-sync-enabled.js
```

Expected output: All tests pass with new logic

### Test 2: Check Environment Variables

```bash
cd backend
node test-env-validation.js
```

Expected output: Shows which variables are set/missing

### Test 3: Dry Run Sync Daemon

```bash
cd backend

# Set test environment
export SYNC_ENABLED=true
export MONGODB_URI="mongodb://test@localhost:27017/test"
export RAPTOREUMD_HOST=localhost
export RAPTOREUMD_PORT=10225
export RAPTOREUMD_USER=testuser
export RAPTOREUMD_PASSWORD=testpass

# Run daemon (will fail on connection but shows validation)
node src/services/sync-daemon.js
```

Expected output: Clear startup banner and validation messages

## Monitoring Sync Status

### Using the Monitor Script

```bash
cd backend/scripts
./monitor-sync.sh
```

This shows:
- Blockchain height
- Database height
- Sync progress percentage
- Sync status
- Asset statistics

### Using PM2 Logs

```bash
# Watch sync daemon logs in real-time
pm2 logs rtm-sync

# Show last 100 lines
pm2 logs rtm-sync --lines 100

# Filter for errors
pm2 logs rtm-sync --err
```

### Using MongoDB

```bash
# Check sync state directly
mongosh $MONGODB_URI --eval "
  db.sync_state.find({service: 'blocks'}).pretty()
"

# Check recent blocks
mongosh $MONGODB_URI --eval "
  db.blocks.find().sort({height: -1}).limit(5).pretty()
"
```

## Best Practices

1. **Always use PM2 for production**
   - Handles process management
   - Provides logging
   - Auto-restart on failures
   - Environment variable management

2. **Use .env file for local development**
   - Never commit .env to git
   - Keep .env.example updated
   - Document required variables

3. **Monitor logs regularly**
   - Check PM2 logs daily
   - Set up log rotation
   - Use monitoring tools for alerts

4. **Test configuration changes**
   - Test on staging first
   - Verify sync continues after changes
   - Check error logs after restarts

## Getting Help

If you're still having issues:

1. **Collect diagnostic information:**
   ```bash
   pm2 logs rtm-sync --lines 200 > sync-logs.txt
   pm2 show rtm-sync > sync-config.txt
   ./scripts/monitor-sync.sh > sync-status.txt
   ```

2. **Check the logs for:**
   - Startup banner showing configuration
   - Environment variable values
   - Error messages with troubleshooting steps
   - MongoDB connection status
   - Blockchain connection status

3. **Common log patterns:**
   - `SYNC DISABLED` - Need to set SYNC_ENABLED=true
   - `Missing required environment variables` - Configuration incomplete
   - `MONGODB_URI not configured` - Database credentials missing
   - `Blockchain not available` - RPC connection failed

4. **Report issues with:**
   - Full error message
   - Environment (OS, Node version, PM2 version)
   - Configuration (sanitized, no passwords)
   - Steps to reproduce
