#!/bin/bash
# SORTED Bot — Quick Deploy Script
# Usage: ./deploy.sh

set -e

echo "🚀 SORTED Bot Deploy Script"
echo "============================"

# Check environment
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ TELEGRAM_BOT_TOKEN not set"
    echo "Set it with: export TELEGRAM_BOT_TOKEN=your_token"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Start the bot
echo "🤖 Starting SORTED bot..."
node dist/index.js
