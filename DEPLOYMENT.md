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
1. Build the project (`npm run build`)
2. Initialize a git repository in the `dist` folder
3. Commit all built files
4. Force-push to the `gh-pages` branch
5. Display the deployment URL

## Deployment URL

Your app will be available at: **https://rplsmn.github.io/DuckMSI/**

## How It Works

- **Source code** stays on your `main` branch
- **Built assets** are pushed to the `gh-pages` branch
- GitHub Pages serves the `gh-pages` branch
- The `dist/` folder is gitignored on `main` (no build artifacts in source control)

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
