# GPU Worker Setup Guide

Hướng dẫn setup GPU worker cho XSonic trên ckey.vn hoặc các nền tảng khác.

## 📋 Thông tin GPU của bạn

Từ thông tin bạn cung cấp:

```
Host: n1.ckey.vn
SSH Port: 1584
Web Terminal Port: 1585
Worker Port: 1586
GPU: RTX 3080 Ti
CPU: 8 cores
RAM: 32 GB
Storage: 190 GB
Price: 1.060 VND/hour
Rented Until: 02-11-2025 13:02:42
```

## 🚀 Bước 1: Kết nối SSH

```bash
ssh -p 1584 root@n1.ckey.vn
```

Nhập password bạn đã đặt khi thuê GPU.

## 📦 Bước 2: Chạy script setup tự động

```bash
# Download setup script
curl -o setup-gpu-worker.sh https://raw.githubusercontent.com/YOUR_REPO/main/scripts/setup-gpu-worker.sh

# Hoặc nếu đã clone repo:
cd /root
git clone YOUR_REPO_URL xsonic
cd xsonic
chmod +x scripts/setup-gpu-worker.sh
sudo ./scripts/setup-gpu-worker.sh
```

Script sẽ tự động:
- ✅ Cài đặt Node.js, Python, ffmpeg
- ✅ Cài đặt PyTorch, Demucs, Whisper
- ✅ Clone XSonic repository
- ✅ Build worker
- ✅ Setup PM2 cho auto-restart

## ⚙️ Bước 3: Thêm GPU Worker vào Admin Panel

1. **Truy cập Admin Panel:**
   ```
   https://your-domain.com/admin/gpu-workers
   ```

2. **Click "Add GPU Worker"**

3. **Điền thông tin:**
   ```
   Name: ckey-rtx3080ti-1
   Provider: ckey
   Host: n1.ckey.vn
   Worker Port: 1586
   SSH Port: 1584
   Web Terminal Port: 1585
   GPU Model: RTX 3080 Ti
   GPU Count: 1
   CPU Cores: 8
   RAM (GB): 32
   Storage (GB): 190
   Price/Hour: 1.06
   Currency: VND
   Rented Until: 2025-11-02T13:02:42
   Auto Stop: ✅ (checked)
   Auto Stop Idle (min): 10
   ```

4. **Click "Add Worker"**

5. **Copy Worker ID** từ danh sách workers (UUID)

## 🔧 Bước 4: Cấu hình Worker trên GPU Server

SSH vào GPU server và tạo file `.env`:

```bash
cd /root/xsonic/apps/worker-gpu
nano .env
```

Paste nội dung sau (thay thế bằng thông tin thực):

```env
PORT=8080
WORKER_ID=<UUID_FROM_ADMIN_PANEL>
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token
API_BASE_URL=https://your-domain.com
LOG_LEVEL=info
NODE_ENV=production
```

Lưu file: `Ctrl+X` → `Y` → `Enter`

## 🚀 Bước 5: Chạy Worker

### Option 1: Chạy trực tiếp (để test)

```bash
cd /root/xsonic/apps/worker-gpu
npm run build
npm start
```

### Option 2: Chạy với PM2 (khuyến nghị)

```bash
cd /root/xsonic/apps/worker-gpu
pm2 start npm --name "xsonic-gpu-worker" -- start
pm2 save
pm2 startup
```

Xem logs:
```bash
pm2 logs xsonic-gpu-worker
```

## ✅ Bước 6: Kiểm tra Worker hoạt động

### 1. Test local trên GPU server:

```bash
curl http://localhost:8080/healthz
```

Kết quả mong đợi:
```json
{
  "status": "healthy",
  "workerId": "your-worker-id",
  "uptime": 123.45
}
```

### 2. Test từ bên ngoài:

```bash
curl http://n1.ckey.vn:1586/healthz
```

### 3. Kiểm tra trong Admin Panel:

- Vào `https://your-domain.com/admin/gpu-workers`
- Worker status phải là **"running"** (màu xanh)
- "Last seen" phải cập nhật mỗi 30 giây

## 🎮 Bước 7: Test GPU Processing

### Test Demucs (Stem Separation):

```bash
python3 << EOF
import demucs.separate
print("Demucs is ready!")
EOF
```

### Test Whisper (Speech Recognition):

```bash
python3 << EOF
import whisper
model = whisper.load_model("base")
print("Whisper is ready!")
EOF
```

### Monitor GPU usage:

```bash
watch -n 1 nvidia-smi
```

## 🛑 Quản lý Worker

### Dừng worker:

```bash
pm2 stop xsonic-gpu-worker
```

### Khởi động lại:

```bash
pm2 restart xsonic-gpu-worker
```

### Xóa worker:

```bash
pm2 delete xsonic-gpu-worker
```

### Xem logs:

```bash
pm2 logs xsonic-gpu-worker
pm2 logs xsonic-gpu-worker --lines 100
```

## 💰 Auto-Stop để tiết kiệm chi phí

Worker sẽ tự động shutdown khi idle (không có job) sau 10 phút.

### Tạo script auto-shutdown:

```bash
nano /root/auto-shutdown.sh
```

Paste:

```bash
#!/bin/bash
IDLE_TIME=10  # minutes

while true; do
  GPU_USAGE=$(nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits)
  
  if [ "$GPU_USAGE" -lt 5 ]; then
    echo "GPU idle ($GPU_USAGE%), waiting $IDLE_TIME minutes..."
    sleep $((IDLE_TIME * 60))
    
    GPU_USAGE=$(nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits)
    if [ "$GPU_USAGE" -lt 5 ]; then
      echo "GPU still idle, shutting down..."
      pm2 stop all
      shutdown -h now
    fi
  fi
  
  sleep 300  # Check every 5 minutes
done
```

Chạy:

```bash
chmod +x /root/auto-shutdown.sh
nohup /root/auto-shutdown.sh &
```

## 🔍 Troubleshooting

### Worker không kết nối được:

1. **Kiểm tra port mapping:**
   ```bash
   netstat -tulpn | grep 8080
   ```

2. **Kiểm tra firewall:**
   ```bash
   ufw status
   ufw allow 8080
   ```

3. **Kiểm tra logs:**
   ```bash
   pm2 logs xsonic-gpu-worker --lines 50
   ```

### Heartbeat không gửi được:

1. **Kiểm tra API_BASE_URL:**
   ```bash
   echo $API_BASE_URL
   ```

2. **Test kết nối:**
   ```bash
   curl -X POST https://your-domain.com/api/admin/gpu-workers/YOUR_WORKER_ID/heartbeat \
     -H "Content-Type: application/json" \
     -d '{"status":"running"}'
   ```

### GPU không được nhận diện:

```bash
nvidia-smi
nvcc --version
python3 -c "import torch; print(torch.cuda.is_available())"
```

## 📊 Monitoring

### Xem GPU usage real-time:

```bash
watch -n 1 nvidia-smi
```

### Xem worker metrics:

```bash
pm2 monit
```

### Xem system resources:

```bash
htop
```

## 🎯 Next Steps

1. ✅ Worker đang chạy và gửi heartbeat
2. ✅ Admin panel hiển thị worker status
3. 🔄 Test xử lý job thực tế
4. 🔄 Setup monitoring và alerts
5. 🔄 Optimize performance

## 💡 Tips

- **Backup code thường xuyên** - GPU có thể bị shutdown bất cứ lúc nào
- **Monitor chi phí** - 1.06 VND/giờ = ~25k VND/ngày
- **Dùng tmux/screen** - Để giữ session khi SSH disconnect
- **Setup alerts** - Để biết khi worker down

## 🆘 Support

Nếu gặp vấn đề, kiểm tra:
1. Logs: `pm2 logs xsonic-gpu-worker`
2. Admin panel: Status và Last Heartbeat
3. GPU health: `nvidia-smi`
4. Network: `curl http://localhost:8080/healthz`

