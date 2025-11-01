#!/bin/bash

# XSonic GPU Worker Setup Script
# Run this on your GPU server (ckey.vn, runpod, etc.)

set -e

echo "🚀 XSonic GPU Worker Setup"
echo "=========================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Please run as root (use sudo)${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Running as root${NC}"

# Update system
echo ""
echo "📦 Updating system packages..."
apt-get update -qq

# Install essential tools
echo ""
echo "🔧 Installing essential tools..."
apt-get install -y -qq \
  git \
  curl \
  wget \
  build-essential \
  ffmpeg \
  htop \
  tmux \
  vim

echo -e "${GREEN}✓ Essential tools installed${NC}"

# Check GPU
echo ""
echo "🎮 Checking GPU..."
if command -v nvidia-smi &> /dev/null; then
  nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader
  echo -e "${GREEN}✓ GPU detected${NC}"
else
  echo -e "${YELLOW}⚠ nvidia-smi not found. Make sure NVIDIA drivers are installed.${NC}"
fi

# Check CUDA
echo ""
echo "🔥 Checking CUDA..."
if command -v nvcc &> /dev/null; then
  nvcc --version | grep "release"
  echo -e "${GREEN}✓ CUDA installed${NC}"
else
  echo -e "${YELLOW}⚠ CUDA not found${NC}"
fi

# Check Python
echo ""
echo "🐍 Checking Python..."
if command -v python3 &> /dev/null; then
  python3 --version
  echo -e "${GREEN}✓ Python installed${NC}"
else
  echo -e "${RED}✗ Python not found. Installing...${NC}"
  apt-get install -y python3 python3-pip
fi

# Check PyTorch
echo ""
echo "🔥 Checking PyTorch..."
if python3 -c "import torch" 2>/dev/null; then
  python3 -c "import torch; print(f'PyTorch {torch.__version__}')"
  python3 -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}')"
  echo -e "${GREEN}✓ PyTorch installed${NC}"
else
  echo -e "${YELLOW}⚠ PyTorch not found${NC}"
  read -p "Install PyTorch? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
  fi
fi

# Install Node.js
echo ""
echo "📦 Installing Node.js..."
if command -v node &> /dev/null; then
  node --version
  echo -e "${GREEN}✓ Node.js already installed${NC}"
else
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt-get install -y nodejs
  echo -e "${GREEN}✓ Node.js installed${NC}"
fi

# Install AI models for audio processing
echo ""
echo "🎵 Installing AI audio processing libraries..."
pip3 install --upgrade pip -q

echo "  - Installing Demucs (stem separation)..."
pip3 install demucs -q

echo "  - Installing Whisper (speech recognition)..."
pip3 install openai-whisper -q

echo "  - Installing audio processing libraries..."
pip3 install librosa soundfile pydub numpy scipy -q

echo -e "${GREEN}✓ AI libraries installed${NC}"

# Verify installations
echo ""
echo "✅ Verifying installations..."
python3 -c "import demucs; print('  ✓ Demucs')" 2>/dev/null || echo -e "${RED}  ✗ Demucs${NC}"
python3 -c "import whisper; print('  ✓ Whisper')" 2>/dev/null || echo -e "${RED}  ✗ Whisper${NC}"
python3 -c "import librosa; print('  ✓ Librosa')" 2>/dev/null || echo -e "${RED}  ✗ Librosa${NC}"

# Clone XSonic repository
echo ""
echo "📥 Setting up XSonic..."
read -p "Enter your XSonic repository URL: " REPO_URL

if [ -z "$REPO_URL" ]; then
  echo -e "${YELLOW}⚠ No repository URL provided. Skipping clone.${NC}"
else
  cd /root
  if [ -d "xsonic" ]; then
    echo -e "${YELLOW}⚠ xsonic directory already exists. Skipping clone.${NC}"
  else
    git clone "$REPO_URL" xsonic
    cd xsonic
    npm install
    echo -e "${GREEN}✓ XSonic cloned and dependencies installed${NC}"
  fi
fi

# Setup environment variables
echo ""
echo "⚙️  Setting up environment variables..."
read -p "Enter SUPABASE_URL: " SUPABASE_URL
read -p "Enter SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_KEY
read -p "Enter UPSTASH_REDIS_REST_URL: " REDIS_URL
read -p "Enter UPSTASH_REDIS_REST_TOKEN: " REDIS_TOKEN
read -p "Enter GPU Worker ID (from admin panel): " WORKER_ID

cat > /root/xsonic/apps/worker-gpu/.env << EOF
PORT=8080
SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_KEY
UPSTASH_REDIS_REST_URL=$REDIS_URL
UPSTASH_REDIS_REST_TOKEN=$REDIS_TOKEN
WORKER_ID=$WORKER_ID
LOG_LEVEL=info
NODE_ENV=production
EOF

echo -e "${GREEN}✓ Environment variables configured${NC}"

# Build worker
echo ""
echo "🔨 Building GPU worker..."
cd /root/xsonic/packages/core
npm run build

cd /root/xsonic/apps/worker-gpu
npm run build

echo -e "${GREEN}✓ Worker built${NC}"

# Install PM2 for process management
echo ""
echo "📦 Installing PM2..."
npm install -g pm2
echo -e "${GREEN}✓ PM2 installed${NC}"

# Create startup script
echo ""
echo "📝 Creating startup script..."
cat > /root/start-worker.sh << 'EOF'
#!/bin/bash
cd /root/xsonic/apps/worker-gpu
pm2 start npm --name "xsonic-gpu-worker" -- start
pm2 save
pm2 logs xsonic-gpu-worker
EOF

chmod +x /root/start-worker.sh
echo -e "${GREEN}✓ Startup script created at /root/start-worker.sh${NC}"

# Setup PM2 startup
echo ""
echo "🚀 Setting up PM2 auto-startup..."
pm2 startup systemd -u root --hp /root
echo -e "${GREEN}✓ PM2 auto-startup configured${NC}"

# Summary
echo ""
echo "================================"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "================================"
echo ""
echo "📋 Next steps:"
echo "  1. Start the worker:"
echo "     cd /root/xsonic/apps/worker-gpu"
echo "     npm start"
echo ""
echo "  2. Or use PM2 for background process:"
echo "     /root/start-worker.sh"
echo ""
echo "  3. Check worker status:"
echo "     pm2 status"
echo "     pm2 logs xsonic-gpu-worker"
echo ""
echo "  4. Test worker health:"
echo "     curl http://localhost:8080/healthz"
echo ""
echo "  5. Monitor GPU usage:"
echo "     watch -n 1 nvidia-smi"
echo ""
echo "🎉 Your GPU worker is ready!"

