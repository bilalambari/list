#!/bin/bash
echo $(date)

# 1. Pastikan di folder yang benar
cd /www/wwwroot/list.ambaritek.com

# 2. Fix Git ownership issue
echo "🔧 Fixing git permissions..."
git config --global --add safe.directory /www/wwwroot/list.ambaritek.com

# 3. Pull perubahan terbaru
echo "⬇️  Pulling latest changes..."
git pull origin main

# 4. Setup Node.js PATH (aaPanel biasanya install di /www/server/nodejs/)
echo "🔍 Looking for Node.js..."
export PATH=/www/server/nodejs/v20.18.1/bin:$PATH
export PATH=/www/server/nodejs/v18.20.5/bin:$PATH
export PATH=/www/server/nodejs/v16.20.2/bin:$PATH
export PATH=$PATH:/usr/local/bin

# Cek apakah npm tersedia
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm tidak ditemukan!"
    echo "Coba install Node.js via: aaPanel -> Website -> Node Project -> Install Node Project Manager"
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
    echo "❌ Build failed! 'dist' folder missing."
    exit 1
fi

echo "🚀 Application deployed!"
echo ""
