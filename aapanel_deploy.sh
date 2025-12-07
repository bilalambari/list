#!/bin/bash
echo $(date)

# 1. Pastikan di folder yang benar (Sesuai script bawaan aaPanel)
cd /www/wwwroot/list.ambaritek.com

# 2. Pull perubahan terbaru
echo "⬇️  Pulling latest changes..."
git pull origin main

# 3. Install dependencies (PENTING untuk build)
echo "📦 Installing dependencies..."
# Cek apakah npm ada
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm/node tidak ditemukan. Pastikan Node.js terinstall via Website -> Node Project atau PM2."
    exit 1
fi

if [ -f "package-lock.json" ]; then
    npm ci
else
    npm install
fi

# 4. Build aplikasi
echo "🔨 Building application..."
npm run build

# 5. Cek hasil build
if [ -d "dist" ]; then
    echo "✅ Build successful! 'dist' folder is updated."
else
    echo "❌ Build failed! 'dist' folder missing."
    exit 1
fi

echo "🚀 Application deployed!"
echo ""
