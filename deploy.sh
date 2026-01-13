#!/bin/bash

# GitHub Pages Deployment Script
# Builds the project and deploys to gh-pages branch

set -e  # Exit on error

echo "🏗️  Building project..."
npm run build

echo "📦 Navigating to dist folder..."
cd dist

# Initialize git if needed
if [ ! -d .git ]; then
  echo "🎬 Initializing git in dist..."
  git init
  git config user.name "$(git config --get user.name)"
  git config user.email "$(git config --get user.email)"
fi

echo "📝 Adding files..."
git add -A

echo "💾 Creating commit..."
git commit -m "Deploy to GitHub Pages - $(date '+%Y-%m-%d %H:%M:%S')"

echo "🚀 Pushing to gh-pages branch..."
git push -f git@github.com:rplsmn/DuckMSI.git HEAD:gh-pages

echo "✅ Deployment complete!"
echo "🌐 Your site will be available at: https://rplsmn.github.io/DuckMSI/"
echo ""
echo "Note: First deployment may take a few minutes to appear."
echo "Check status at: https://github.com/rplsmn/DuckMSI/settings/pages"

cd ..
