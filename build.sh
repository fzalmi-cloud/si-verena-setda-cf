#!/bin/bash
# Cloudflare Pages Build Script
set -e

echo "📦 Installing root dependencies..."
npm install

echo "📦 Installing frontend dependencies..."
cd frontend
npm install

echo "🔨 Building frontend..."
npm run build

echo "✅ Build complete!"
