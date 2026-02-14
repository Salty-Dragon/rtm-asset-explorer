#!/bin/bash

echo "=== Raptoreum Asset Explorer Sync Status ==="
echo

# Load environment variables from .env
SCRIPT_DIR="$( cd "$( dirname ""${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ -f "$ENV_FILE" ]; then
  export \\$(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)
fi

# Get blockchain height via RPC
echo "Fetching blockchain status..."
CHAIN_HEIGHT=$(curl -s --user "",