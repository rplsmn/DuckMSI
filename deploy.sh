#!/bin/bash

# GitHub Pages Deployment Script
# Builds the project and deploys to gh-pages branch

set -e  # Exit on error

# Get the next deployment tag number
LAST_TAG=$(git tag -l "deploy-*" | sed 's/deploy-//' | sort -n | tail -1)
if [ -z "$LAST_TAG" ]; then
  NEXT_NUM=1
else
  NEXT_NUM=$((LAST_TAG + 1))
fi
DEPLOY_TAG="deploy-${NEXT_NUM}"

# Get current branch and commit info
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
CURRENT_COMMIT=$(git rev-parse --short HEAD)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "🏷️  Creating deployment tag: ${DEPLOY_TAG}"
git tag -a "${DEPLOY_TAG}" -m "Deployment ${NEXT_NUM}

Deployed: ${TIMESTAMP}
Branch: ${CURRENT_BRANCH}
Commit: ${CURRENT_COMMIT}
URL: https://rplsmn.github.io/DuckMSI/"

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

cd ..

echo "🏷️  Pushing deployment tag..."
git push origin "${DEPLOY_TAG}"

echo "✅ Deployment complete!"
echo "🌐 Your site will be available at: https://rplsmn.github.io/DuckMSI/"
echo "🏷️  Tagged as: ${DEPLOY_TAG}"
echo ""
echo "View deployment history:"
echo "  git tag -l 'deploy-*' -n9"
echo "  https://github.com/rplsmn/DuckMSI/tags"
echo ""
echo "Note: First deployment may take a few minutes to appear."
echo "Check status at: https://github.com/rplsmn/DuckMSI/settings/pages"
