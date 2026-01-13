# Deployment Guide

This project deploys to GitHub Pages using a manual shell script approach.

## Initial Setup (One-time)

1. **Enable GitHub Pages** in your repository:
   - Go to: https://github.com/rplsmn/DuckMSI/settings/pages
   - Under "Source", select: `Deploy from a branch`
   - Under "Branch", select: `gh-pages` / `root`
   - Click "Save"

2. **Ensure the script is executable**:
   ```bash
   chmod +x deploy.sh
   ```

## Deploying

To deploy your latest changes:

```bash
./deploy.sh
```

This script will:
1. Create an annotated git tag (`deploy-N`) with deployment metadata
2. Build the project (`npm run build`)
3. Initialize a git repository in the `dist` folder
4. Commit all built files
5. Force-push to the `gh-pages` branch
6. Push the deployment tag to origin
7. Display the deployment URL and tag

## Deployment URL

Your app will be available at: **https://rplsmn.github.io/DuckMSI/**

## How It Works

- **Source code** stays on your `main` branch
- **Built assets** are pushed to the `gh-pages` branch
- GitHub Pages serves the `gh-pages` branch
- The `dist/` folder is gitignored on `main` (no build artifacts in source control)

## Deployment Tags

Each deployment automatically creates an annotated git tag with the format `deploy-N` (e.g., `deploy-1`, `deploy-2`, etc.).

### View Deployment History

```bash
# List all deployment tags
git tag -l "deploy-*"

# View tag details (timestamp, branch, commit)
git tag -l "deploy-*" -n9

# View a specific deployment's details
git show deploy-1
```

You can also view all tags on GitHub: https://github.com/rplsmn/DuckMSI/tags

### Tag Contents

Each tag includes:
- Deployment number
- Timestamp
- Source branch
- Commit SHA
- Deployment URL

This makes it easy to track when changes were deployed and what code version was live at any given time.

## Testing Before Deploy

Run the preview server to test the production build locally:

```bash
npm run build
npm run preview
```

## Troubleshooting

### First deployment not showing up?
- GitHub Pages can take 2-5 minutes to build after first push
- Check deployment status at: https://github.com/rplsmn/DuckMSI/deployments

### 404 errors for assets?
- Ensure `base: '/DuckMSI/'` is set in `vite.config.js`
- The base path must match your repository name

### Script fails with "permission denied"?
- Run: `chmod +x deploy.sh`

## Future: GitHub Actions

If you want to automate deployments later, you can switch to GitHub Actions. The manual script gives you control while the project is early-stage.
