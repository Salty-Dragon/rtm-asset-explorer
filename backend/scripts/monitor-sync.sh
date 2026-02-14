#!/bin/bash

echo "=== Raptoreum Asset Explorer Sync Status ==="
echo

# Load environment variables from .env
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ENV_FILE="$SCRIPT_DIR/../.env"

# Debug output (set DEBUG=1 to enable)
if [ "$DEBUG" = "1" ]; then
  echo "DEBUG: Script dir: $SCRIPT_DIR"
  echo "DEBUG: Looking for .env at: $ENV_FILE"
fi

if [ -f "$ENV_FILE" ]; then
  if [ "$DEBUG" = "1" ]; then
    echo "DEBUG: Found .env file, loading variables..."
  fi
  
  # Use set -a to automatically export all variables
  # This approach properly handles quotes, spaces, and special characters
  set -a
  source <(grep -v '^#' "$ENV_FILE" | grep -v '^$' | sed 's/\r$//')
  set +a
  
  if [ "$DEBUG" = "1" ]; then
    echo "DEBUG: Loaded environment variables"
    echo "DEBUG: RAPTOREUMD_HOST=$RAPTOREUMD_HOST"
    echo "DEBUG: RAPTOREUMD_PORT=$RAPTOREUMD_PORT"
    echo "DEBUG: RAPTOREUMD_USER=$RAPTOREUMD_USER"
    echo "DEBUG: RAPTOREUMD_PASSWORD set: $([ -n "$RAPTOREUMD_PASSWORD" ] && echo "yes" || echo "no")"
    echo "DEBUG: MONGODB_URI set: $([ -n "$MONGODB_URI" ] && echo "yes" || echo "no")"
  fi
else
  echo "WARNING: .env file not found at: $ENV_FILE"
fi

# Get blockchain height via RPC
echo "Fetching blockchain status..."
CHAIN_HEIGHT=$(curl -s --user "${RAPTOREUMD_USER}:${RAPTOREUMD_PASSWORD}" \
  --data-binary '{"jsonrpc":"1.0","id":"monitor","method":"getblockcount","params":[]}' \
  -H 'content-type: text/plain;' \
  http://${RAPTOREUMD_HOST:-127.0.0.1}:${RAPTOREUMD_PORT:-10225}/ 2>/dev/null | \
  grep -o '"result":[0-9]*' | cut -d':' -f2)

if [ -z "$CHAIN_HEIGHT" ]; then
  echo "Blockchain Height: Unable to connect (check RPC credentials)"
  CHAIN_HEIGHT=0
else
  echo "Blockchain Height: $CHAIN_HEIGHT"
fi

# Get database height
echo "Fetching database status..."
if [ -n "$MONGODB_URI" ]; then
  DB_HEIGHT=$(mongosh --quiet "${MONGODB_URI}" \
    --eval "const state = db.sync_state.findOne({service:'blocks'}); print(state ? state.currentBlock : 0);" 2>/dev/null)
  
  if [ -z "$DB_HEIGHT" ] || [ "$DB_HEIGHT" = "null" ]; then
    echo "Database Height: 0 (sync not started)"
    DB_HEIGHT=0
  else
    echo "Database Height: $DB_HEIGHT"
  fi
else
  echo "Database Height: Unable to connect (MONGODB_URI not set)"
  DB_HEIGHT=0
fi

# Calculate sync progress
echo
if [ "$CHAIN_HEIGHT" -gt 0 ] && [ "$DB_HEIGHT" -gt 0 ]; then
  DIFF=$((CHAIN_HEIGHT - DB_HEIGHT))
  echo "Blocks Behind: $DIFF"
  
  PERCENT=$(awk "BEGIN {printf \"%.2f\", ($DB_HEIGHT / $CHAIN_HEIGHT) * 100}")
  echo "Sync Progress: ${PERCENT}%"
  
  if [ "$DIFF" -le 5 ]; then
    echo "Status: ✅ SYNCED"
  elif [ "$DIFF" -le 100 ]; then
    echo "Status: ⚠️  CATCHING UP"
  else
    echo "Status: 🔄 SYNCING"
  fi
fi

# Asset statistics
echo
echo "=== Asset Statistics ==="
if [ -n "$MONGODB_URI" ]; then
  mongosh --quiet "${MONGODB_URI}" --eval "
    try {
      print('Total Assets: ' + db.assets.countDocuments());
      print('Root Assets: ' + db.assets.countDocuments({isSubAsset: false}));
      print('Sub-Assets: ' + db.assets.countDocuments({isSubAsset: true}));
      print('Total Transfers: ' + db.asset_transfers.countDocuments());
      
      const futures = db.future_outputs.countDocuments({status: 'locked'});
      print('Locked Futures: ' + futures);
    } catch(e) {
      print('Unable to fetch asset stats (collections may not exist yet)');
    }
  " 2>/dev/null || echo "Database query failed"
else
  echo "Unable to connect to database"
fi
echo
echo "=== Sync State Details ==="
if [ -n "$MONGODB_URI" ]; then
  mongosh --quiet "${MONGODB_URI}" --eval "
    try {
      const state = db.sync_state.findOne({service:'blocks'});
      if (state) {
        print('Status: ' + state.status);
        print('Last Synced: ' + (state.lastSyncedAt || 'Never'));
        if (state.averageBlockTime) {
          print('Avg Block Time: ' + state.averageBlockTime + 'ms');
        }
        if (state.lastError) {
          print('Last Error: ' + state.lastError);
        }
      } else {
        print('No sync state found (sync not started)');
      }
    } catch(e) {
      print('Sync state collection does not exist yet');
    }
  " 2>/dev/null
fi
echo
