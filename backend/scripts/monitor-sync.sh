#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Raptoreum Asset Explorer Sync Status ===${NC}"
echo

# Get blockchain height
echo -e "${YELLOW}Fetching blockchain status...${NC}"
CHAIN_HEIGHT=$(raptoreum-cli getblockcount 2>/dev/null)
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Blockchain Height: $CHAIN_HEIGHT${NC}"
else
  echo -e "${RED}Blockchain Height: Unable to connect to raptoreum-cli${NC}"
  CHAIN_HEIGHT="N/A"
fi

echo

# Get database height using mongosh or mongo
echo -e "${YELLOW}Fetching database status...${NC}"
MONGODB_URI=${MONGODB_URI:-"mongodb://localhost:27017/rtm_explorer"}

# Try mongosh first, fallback to mongo
DB_HEIGHT=$(mongosh --quiet "$MONGODB_URI" --eval "db.sync_states.findOne({service:'blocks'})?.currentBlock || 0" 2>/dev/null)
if [ $? -ne 0 ]; then
  DB_HEIGHT=$(mongo --quiet "$MONGODB_URI" --eval "db.sync_states.findOne({service:'blocks'})?.currentBlock || 0" 2>/dev/null)
fi

if [ -n "$DB_HEIGHT" ] && [ "$DB_HEIGHT" != "0" ]; then
  echo -e "${GREEN}Database Height: $DB_HEIGHT${NC}"
else
  echo -e "${RED}Database Height: Unable to fetch (sync may not be started)${NC}"
  DB_HEIGHT="0"
fi

# Calculate sync progress
if [ "$CHAIN_HEIGHT" != "N/A" ] && [ "$DB_HEIGHT" != "0" ]; then
  DIFF=$((CHAIN_HEIGHT - DB_HEIGHT))
  echo -e "${BLUE}Blocks Behind: $DIFF${NC}"
  
  if command -v bc &> /dev/null; then
    PERCENT=$(echo "scale=2; ($DB_HEIGHT / $CHAIN_HEIGHT) * 100" | bc)
    echo -e "${BLUE}Sync Progress: ${PERCENT}%${NC}"
    
    # Color code based on progress
    if (( $(echo "$PERCENT >= 99.5" | bc -l) )); then
      echo -e "${GREEN}Status: Fully Synced ✓${NC}"
    elif (( $(echo "$PERCENT >= 90" | bc -l) )); then
      echo -e "${YELLOW}Status: Almost Synced (90%+)${NC}"
    else
      echo -e "${RED}Status: Syncing... (${PERCENT}%)${NC}"
    fi
  fi
fi

echo
echo -e "${BLUE}=== Database Statistics ===${NC}"

# Get asset stats using mongosh or mongo
mongosh --quiet "$MONGODB_URI" --eval "
  print('Total Assets: ' + db.assets.countDocuments());
  print('Root Assets: ' + db.assets.countDocuments({isSubAsset: false}));
  print('Sub-Assets: ' + db.assets.countDocuments({isSubAsset: true}));
  print('Total Blocks: ' + db.blocks.countDocuments());
  print('Total Transactions: ' + db.transactions.countDocuments());
  print('Total Transfers: ' + db.asset_transfers.countDocuments());
  print('Locked Futures: ' + db.future_outputs.countDocuments({status: 'locked'}));
  print('Unlocked Futures: ' + db.future_outputs.countDocuments({status: 'unlocked'}));
" 2>/dev/null || mongo --quiet "$MONGODB_URI" --eval "
  print('Total Assets: ' + db.assets.count());
  print('Root Assets: ' + db.assets.count({isSubAsset: false}));
  print('Sub-Assets: ' + db.assets.count({isSubAsset: true}));
  print('Total Blocks: ' + db.blocks.count());
  print('Total Transactions: ' + db.transactions.count());
  print('Total Transfers: ' + db.asset_transfers.count());
  print('Locked Futures: ' + db.future_outputs.count({status: 'locked'}));
  print('Unlocked Futures: ' + db.future_outputs.count({status: 'unlocked'}));
" 2>/dev/null

echo
echo -e "${BLUE}=== PM2 Process Status ===${NC}"

if command -v pm2 &> /dev/null; then
  pm2 list | grep -E "rtm-api|rtm-sync" || echo -e "${RED}No RTM processes found${NC}"
else
  echo -e "${RED}PM2 not installed${NC}"
fi

echo
echo -e "${BLUE}=== Recent Sync Logs (last 10 lines) ===${NC}"

if [ -f "logs/sync.log" ]; then
  tail -n 10 logs/sync.log
elif [ -f "../logs/sync.log" ]; then
  tail -n 10 ../logs/sync.log
else
  echo -e "${RED}Sync log file not found${NC}"
fi

echo
echo -e "${GREEN}=== Monitoring Complete ===${NC}"
