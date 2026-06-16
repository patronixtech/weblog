# Deployment Strategy

## Overview

This site uses Astro with GitHub Pages hosting. The deployment happens through two mechanisms:

### 1. Primary Deployment: `deploy-pages.yml` Workflow
- **Triggers**: Push to `main` branch or manual dispatch
- **Process**:
  1. Installs Node dependencies
  2. Builds the site with `npm run build`
  3. Generates static files in `./dist`
  4. Updates the `gh-pages` branch with new build
  5. Pushes to `gh-pages` branch for live deployment
- **Live URL**: `https://www.patronixtech.com/` (CNAME: patronixtech.com)

### 2. Secondary Workflow: `daily-brief.yml` 
- **Triggers**: Daily at 6am Central Time
- **Process**:
  1. Generates new daily tech brief post
  2. Commits to `main` branch
  3. Triggers `deploy-pages.yml` workflow
- **Important**: Only commits to `main`, never touches `gh-pages`

## Critical Configuration

### GitHub Pages Source
**Current**: `gh-pages` branch is the deployment source

> **Why?** The `deploy-pages.yml` workflow explicitly updates the `gh-pages` branch after each build. This ensures:
> - Static files are always available
> - No dependency on GitHub's artifact mechanism alone
> - Clear separation between source (`main`) and deployment (`gh-pages`)

### CNAME File
- **Location**: `CNAME` at repo root (also copied to `dist/` during build)
- **Content**: `patronixtech.com`
- **Purpose**: Directs GitHub Pages to use the custom domain
- **Note**: Must match the domain configured in `astro.config.mjs` (`site` setting)

## Troubleshooting

### Live site is stale
1. **Check workflow status**: Go to GitHub Actions, verify `deploy-pages.yml` succeeded
2. **Check branch sync**: Run `git log --oneline gh-pages -5` locally and compare to `origin/gh-pages`
3. **Manual re-deploy**:
   ```bash
   git checkout main
   npm ci && npm run build
   git worktree add /tmp/gh-pages-update gh-pages
   cd /tmp/gh-pages-update
   rm -rf *; cp -r ../dist/.; touch .nojekyll
   git add -A && git commit -m "Force deploy: $(date)" && git push origin gh-pages
   cd -
   git worktree remove /tmp/gh-pages-update
   ```
4. **Clear CDN cache**: Pages responses cache for 10 minutes; wait or use hard refresh

### Daily brief not updating
1. Check `daily-brief.yml` workflow execution
2. Verify it created a commit on `main`
3. Check if `deploy-pages.yml` was triggered (should auto-trigger on main push)

### New brief not appearing on homepage
1. Verify file exists: `src/pages/blog/daily-tech-brief-YYYY-MM-DD.md`
2. Check frontmatter has `title` field
3. Rebuild locally: `npm run build`
4. Inspect generated HTML in `dist/`

## Build Process

```bash
# Install deps
npm ci

# Build (runs astro + postbuild)
npm run build
# This:
# - Calls `astro build` (Astro static generator)
# - Calls `node scripts/postbuild.mjs` (copies CNAME to dist)

# Local preview
npx astro preview
```

## File Structure

```
src/pages/
├── index.astro          → homepage (lists latest briefs)
├── blog/
│   ├── index.astro      → blog listing
│   ├── archive.astro    → archive page
│   └── daily-tech-brief-*.md  → individual brief posts
└── briefs/
    └── [slug].astro     → dynamic brief detail page

scripts/
├── generate-daily-brief.mjs  → creates new brief markdown
└── postbuild.mjs             → copies CNAME to dist

.github/workflows/
├── deploy-pages.yml     → build & deploy (triggers on main push)
└── daily-brief.yml      → generate & commit new brief (daily 6am CT)
```

## Prevention Tips

1. **Never manually push to `gh-pages`**: Always push to `main`; the workflow handles `gh-pages` sync
2. **Monitor Actions tab**: Verify both workflows succeed on their schedules
3. **Test locally before pushing**: `npm run build && npx astro preview`
4. **Check Page build/deployment settings**: Ensure gh-pages branch is still the deployment source
