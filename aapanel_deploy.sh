#!/bin/bash
export HOME=/www/wwwroot    # Set HOME untuk menghindari error Git config
echo "Time: $(date)"

# 1. Pastikan di folder yang benar
cd /www/wwwroot/list.ambaritek.com

# 2. Fix Git ownership issue (Sekarang dengan HOME yang diset)
echo "🔧 Fixing git permissions..."
git config --global --add safe.directory /www/wwwroot/list.ambaritek.com
git config --global --add safe.directory "*"

# 3. Pull perubahan terbaru
echo "⬇️  Pulling latest changes..."
git pull origin main

# 4. Cari Node.js secara otomatis
echo "🔍 Searching for Node.js..."

# Coba cari di folder standar aaPanel
NODE_PATH=""
if [ -d "/www/server/nodejs" ]; then
    # Cari versi terbaru
    LATEST_NODE=$(ls -d /www/server/nodejs/*/bin 2>/dev/null | sort -V | tail -n 1)
    if [ -n "$LATEST_NODE" ]; then
        NODE_PATH="$LATEST_NODE"
        echo "Found Node.js at: $NODE_PATH"
    fi
fi

# Jika ketemu, tambahkan ke PATH
if [ -n "$NODE_PATH" ]; then
    export PATH=$NODE_PATH:$PATH
fi

# Tambahkan path standar lain
export PATH=$PATH:/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin

# Cek apakah npm tersedia
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm tidak ditemukan!"
    echo "Files in /www/server/nodejs/ (jika ada):"
    ls -R /www/server/nodejs/ | head -n 20
    exit 1
fi

echo "✅ Node version: $(node -v)"
echo "✅ NPM version: $(npm -v)"

# 5. Install dependencies
echo "📦 Installing dependencies..."
if [ -f "package-lock.json" ]; then
    npm ci --prefer-offline
else
    npm install
fi

# 6. Build aplikasi
echo "🔨 Building application..."
npm run build

# 7. Cek hasil build
if [ -d "dist" ]; then
    echo "✅ Build successful! 'dist' folder is updated."
else
    echo "❌ Build failed!"
    exit 1
fi

echo "🚀 Application deployed!"
echo ""
