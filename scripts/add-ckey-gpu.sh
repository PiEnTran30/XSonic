#!/bin/bash

# Quick script to add ckey.vn GPU worker
# Usage: ./scripts/add-ckey-gpu.sh

echo "🎮 Add ckey.vn GPU Worker to XSonic"
echo "===================================="
echo ""

# Get ckey.vn GPU info
read -p "GPU Name (e.g., ckey-rtx3080ti-1): " GPU_NAME
read -p "Host (e.g., n1.ckey.vn): " HOST
read -p "Worker Port (default: 1586): " WORKER_PORT
WORKER_PORT=${WORKER_PORT:-1586}
read -p "SSH Port (default: 1584): " SSH_PORT
SSH_PORT=${SSH_PORT:-1584}
read -p "Web Terminal Port (default: 1585): " WEB_PORT
WEB_PORT=${WEB_PORT:-1585}

read -p "GPU Model (e.g., RTX 3080 Ti): " GPU_MODEL
read -p "GPU Count (default: 1): " GPU_COUNT
GPU_COUNT=${GPU_COUNT:-1}
read -p "CPU Cores (default: 8): " CPU_CORES
CPU_CORES=${CPU_CORES:-8}
read -p "RAM GB (default: 32): " RAM_GB
RAM_GB=${RAM_GB:-32}
read -p "Storage GB (default: 190): " STORAGE_GB
STORAGE_GB=${STORAGE_GB:-190}

read -p "Price per hour (default: 1.06): " PRICE
PRICE=${PRICE:-1.06}
read -p "Currency (default: VND): " CURRENCY
CURRENCY=${CURRENCY:-VND}

read -p "Rented until (YYYY-MM-DD HH:MM:SS): " RENTED_UNTIL

# Create JSON payload
JSON_PAYLOAD=$(cat <<EOF
{
  "name": "$GPU_NAME",
  "provider": "ckey",
  "host": "$HOST",
  "port": $WORKER_PORT,
  "ssh_port": $SSH_PORT,
  "web_terminal_port": $WEB_PORT,
  "gpu_model": "$GPU_MODEL",
  "gpu_count": $GPU_COUNT,
  "cpu_cores": $CPU_CORES,
  "ram_gb": $RAM_GB,
  "storage_gb": $STORAGE_GB,
  "price_per_hour": $PRICE,
  "currency": "$CURRENCY",
  "rented_until": "$RENTED_UNTIL",
  "auto_stop": true,
  "auto_stop_idle_minutes": 10
}
EOF
)

echo ""
echo "📋 GPU Worker Info:"
echo "$JSON_PAYLOAD" | jq '.'
echo ""

read -p "Add this worker? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

# Get API URL
read -p "API URL (e.g., http://localhost:3000 or https://your-domain.com): " API_URL

# Call API
echo ""
echo "🚀 Adding GPU worker..."

RESPONSE=$(curl -s -X POST "$API_URL/api/admin/gpu-workers" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD")

# Check if successful
if echo "$RESPONSE" | jq -e '.worker.id' > /dev/null 2>&1; then
  WORKER_ID=$(echo "$RESPONSE" | jq -r '.worker.id')
  echo ""
  echo "✅ GPU Worker added successfully!"
  echo ""
  echo "📋 Worker ID: $WORKER_ID"
  echo ""
  echo "📝 Next steps:"
  echo ""
  echo "1. SSH to GPU server:"
  echo "   ssh -p $SSH_PORT root@$HOST"
  echo ""
  echo "2. Create .env file in /root/xsonic/apps/worker-gpu/.env:"
  echo "   PORT=8080"
  echo "   WORKER_ID=$WORKER_ID"
  echo "   SUPABASE_URL=https://your-project.supabase.co"
  echo "   SUPABASE_SERVICE_ROLE_KEY=your_key"
  echo "   UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io"
  echo "   UPSTASH_REDIS_REST_TOKEN=your_token"
  echo "   API_BASE_URL=$API_URL"
  echo "   LOG_LEVEL=info"
  echo "   NODE_ENV=production"
  echo ""
  echo "3. Start worker:"
  echo "   cd /root/xsonic/apps/worker-gpu"
  echo "   pm2 start npm --name xsonic-gpu-worker -- start"
  echo ""
  echo "4. Check status:"
  echo "   $API_URL/admin/gpu-workers"
  echo ""
else
  echo ""
  echo "❌ Failed to add GPU worker"
  echo "$RESPONSE" | jq '.'
  exit 1
fi

