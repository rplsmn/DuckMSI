#!/bin/bash

# GitHub Pages Deployment Script
# Builds the project and deploys to gh-pages branch
# Usage:
#   ./deploy.sh           # Deploy Quarto version (default)
#   ./deploy.sh --quarto  # Deploy Quarto version
#   ./deploy.sh --vite    # Deploy Vite version

set -e  # Exit on error

# Parse arguments
BUILD_TYPE="quarto"
if [ "$1" = "--vite" ]; then
  BUILD_TYPE="vite"
elif [ "$1" = "--quarto" ]; then
  BUILD_TYPE="quarto"
fi

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
Build: ${BUILD_TYPE}
URL: https://rplsmn.github.io/DuckMSI/"

# Build based on type
if [ "$BUILD_TYPE" = "quarto" ]; then
  echo "🏗️  Building Quarto project..."
  quarto render quarto/
  DIST_DIR="quarto/_site"
else
  echo "🏗️  Building Vite project..."
  npm run build
  DIST_DIR="dist"
fi

echo "📦 Navigating to ${DIST_DIR} folder..."
cd "$DIST_DIR"

# Initialize git if needed
if [ ! -d .git ]; then
  echo "🎬 Initializing git in ${DIST_DIR}..."
  git init
  git config user.name "$(git config --get user.name)"
  git config user.email "$(git config --get user.email)"
fi

echo "📝 Adding files..."
git add -A

echo "💾 Creating commit..."
git commit -m "Deploy to GitHub Pages (${BUILD_TYPE}) - $(date '+%Y-%m-%d %H:%M:%S')"

echo "🚀 Pushing to gh-pages branch..."
git push -f git@github.com:rplsmn/DuckMSI.git HEAD:gh-pages

cd ..
if [ "$BUILD_TYPE" = "quarto" ]; then
  cd ..
fi

echo "🏷️  Pushing deployment tag..."
git push origin "${DEPLOY_TAG}"

echo "✅ Deployment complete!"
echo "🌐 Your site will be available at: https://rplsmn.github.io/DuckMSI/"
echo "🏷️  Tagged as: ${DEPLOY_TAG}"
echo "📦 Build type: ${BUILD_TYPE}"
echo ""
echo "View deployment history:"
echo "  git tag -l 'deploy-*' -n9"
echo "  https://github.com/rplsmn/DuckMSI/tags"
echo ""
echo "Note: First deployment may take a few minutes to appear."
echo "Check status at: https://github.com/rplsmn/DuckMSI/settings/pages"
