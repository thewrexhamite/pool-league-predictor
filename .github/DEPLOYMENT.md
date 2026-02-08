# Vercel Deployment Setup

This guide documents the steps to set up automated deployment to Vercel for the Pool League Predictor application.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Initial Vercel Setup](#initial-vercel-setup)
- [Environment Variables](#environment-variables)
- [Preview Deployments](#preview-deployments)
- [Verifying Deployments](#verifying-deployments)
- [Troubleshooting](#troubleshooting)

## Overview

This application uses Vercel for automated deployments:

- **Production deployments**: Triggered automatically on every merge to `main`
- **Preview deployments**: Created automatically for every pull request
- **CI Integration**: GitHub Actions runs tests before Vercel deploys

## Prerequisites

Before setting up Vercel deployment, ensure:

- [ ] You have a [Vercel account](https://vercel.com/signup) (free tier is sufficient)
- [ ] The repository is pushed to GitHub
- [ ] You have the required API keys and credentials:
  - Gemini API key
  - Firebase project credentials
- [ ] GitHub Actions CI workflow is passing (see `.github/workflows/ci.yml`)

## Initial Vercel Setup

### 1. Connect GitHub Repository to Vercel

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"** or **"Import Project"**
3. Select **"Import Git Repository"**
4. Choose **GitHub** as your Git provider
5. If prompted, authorize Vercel to access your GitHub account
6. Search for and select the `pool-league-predictor` repository
7. Click **"Import"**

### 2. Configure Project Settings

Vercel should automatically detect the Next.js framework. Verify the following settings:

- **Framework Preset**: `Next.js`
- **Root Directory**: `./` (leave blank for root)
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install` (auto-detected)
- **Development Command**: `npm run dev` (auto-detected)

> **Note**: These settings are defined in `vercel.json` and should be automatically detected.

### 3. Configure Production Branch

1. In Project Settings → Git
2. Set **Production Branch** to `main`
3. Ensure **"Automatic deployments"** is enabled for the production branch

## Environment Variables

Environment variables must be configured in Vercel for the application to function correctly. These variables are referenced in `vercel.json` using the `@variable-name` syntax.

### Required Environment Variables

Navigate to **Project Settings → Environment Variables** and add the following:

#### Gemini AI Configuration

| Variable Name | Description | Example Value |
|--------------|-------------|---------------|
| `GEMINI_API_KEY` | Your Gemini API key | `AIzaSy...` |
| `GEMINI_MODEL` | Gemini model identifier | `googleai/gemini-2.0-flash` |

#### Firebase Client SDK Configuration

| Variable Name | Description | Example Value |
|--------------|-------------|---------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key | `AIzaSy...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | `pool-league-predictor.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | `pool-league-predictor` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket | `pool-league-predictor.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | `123456789012` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID | `1:123456789012:web:abc...` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Firebase Analytics measurement ID | `G-XXXXXXXXXX` |

### Adding Environment Variables

For each variable:

1. Click **"Add New"** under Environment Variables
2. Enter the **Key** (variable name exactly as shown above)
3. Enter the **Value** (your actual credential or configuration value)
4. Select the environments where this variable should be available:
   - ✅ **Production** (for main branch deployments)
   - ✅ **Preview** (for PR deployments)
   - ✅ **Development** (for local development via `vercel dev`)
5. Click **"Save"**

> **Security Note**: The `GEMINI_API_KEY` is a secret and should NOT have the `NEXT_PUBLIC_` prefix. Variables with `NEXT_PUBLIC_` are exposed to the browser.

### Vercel Environment Variable References

The `vercel.json` file references these variables using the `@` prefix syntax:

```json
"env": {
  "GEMINI_API_KEY": "@gemini-api-key",
  "GEMINI_MODEL": "@gemini-model",
  ...
}
```

This means Vercel will look for environment variables named exactly as listed in the table above (without the `@` prefix).

### Updating Environment Variables

After adding or changing environment variables:

1. Navigate to **Deployments** in the Vercel dashboard
2. Click the **"..."** menu on the latest deployment
3. Select **"Redeploy"**
4. Ensure **"Use existing Build Cache"** is **unchecked** to pick up new variables
5. Click **"Redeploy"**

## Preview Deployments

Preview deployments are automatically created for every pull request, allowing you to verify changes before merging to production.

### How Preview Deployments Work

1. **Push to a feature branch** and open a pull request
2. **Vercel automatically deploys** a preview version
3. **Preview URL is posted** as a comment on the PR by the Vercel bot
4. **Each new commit** to the PR triggers a new preview deployment
5. **Preview URLs** remain accessible until the PR is closed or merged

### Accessing Preview Deployments

- **In GitHub PR**: Look for the Vercel bot comment with the preview URL
- **In Vercel Dashboard**: Navigate to the project → Deployments → filter by branch
- **In PR Checks**: Click "Details" next to the Vercel deployment check

### Preview Deployment Best Practices

- ✅ **Visually verify** changes on the preview URL before merging
- ✅ **Test all user flows** affected by your changes
- ✅ **Check mobile responsiveness** if UI changes were made
- ✅ **Verify environment variables** are working correctly
- ⚠️ **Remember**: Preview deployments use the same environment variables as production

## Verifying Deployments

### Successful Production Deployment

After merging to `main`, verify the deployment succeeded:

1. **Check Vercel Dashboard**
   - Navigate to **Deployments**
   - The latest deployment should show status: **"Ready"**
   - Domain should be your production URL

2. **Check GitHub Actions**
   - The CI workflow should complete successfully
   - All checks (typecheck, lint, test, build) must pass
   - Vercel deployment check should show ✅

3. **Verify Live Site**
   - Visit your production URL
   - Verify the changes are live
   - Check browser console for errors
   - Test critical user flows

### Deployment Timeline

Typical deployment timeline:

1. **Code pushed to `main`** (0:00)
2. **GitHub Actions CI starts** (0:05)
   - Install dependencies
   - Type check
   - Lint
   - Test
   - Build
3. **CI completes** (~2-3 minutes)
4. **Vercel deployment starts** (automatically after CI passes)
5. **Vercel build completes** (~2-3 minutes)
6. **Site is live** (~4-6 minutes total)

> **Note**: Vercel deployments can run in parallel with GitHub Actions, but it's recommended to configure Vercel to wait for CI checks to pass first.

### Failed Deployment Recovery

If a deployment fails:

1. **Check Vercel deployment logs**
   - Click on the failed deployment in the dashboard
   - Review build logs for errors

2. **Common failure causes**
   - Missing or incorrect environment variables
   - TypeScript errors (should be caught by CI)
   - Build errors or out-of-memory issues
   - Next.js configuration issues

3. **Recovery steps**
   - Fix the issue in a new commit
   - Push to `main` or create a hotfix PR
   - Vercel will automatically deploy the fix

4. **Emergency rollback**
   - In Vercel Dashboard → Deployments
   - Find the last working deployment
   - Click **"..."** → **"Promote to Production"**

## Troubleshooting

### Preview Deployment Not Created

**Problem**: PR opened but no preview deployment created

**Solutions**:
- Verify Vercel GitHub app is installed and has access to the repository
- Check Project Settings → Git → ensure "Automatic deployments for PRs" is enabled
- Verify the PR branch is not ignored in Vercel settings
- Check Vercel deployment logs for errors

### Environment Variables Not Working

**Problem**: Application crashes or features don't work in deployment

**Solutions**:
- Verify all environment variables are set in Vercel Dashboard
- Check variable names match exactly (case-sensitive)
- Ensure `NEXT_PUBLIC_` prefix is only on client-side variables
- Redeploy without cache after adding/updating variables
- Check build logs for "undefined" environment variable errors

### Build Timeout

**Problem**: Deployment fails with timeout error

**Solutions**:
- Check for infinite loops in build scripts
- Verify dependencies install correctly
- Consider upgrading Vercel plan for longer build times
- Optimize build process (reduce dependencies, use caching)

### CI Passing but Vercel Build Failing

**Problem**: GitHub Actions succeeds but Vercel build fails

**Solutions**:
- Node.js version mismatch: Verify `vercel.json` or Project Settings specify Node.js 20
- Environment differences: Check for environment-specific code paths
- Build command differences: Ensure Vercel uses the same `npm run build` as CI
- Check Vercel build logs for specific error messages

### Preview URL Shows Old Version

**Problem**: Preview deployment doesn't reflect latest changes

**Solutions**:
- Hard refresh the browser (Cmd+Shift+R / Ctrl+Shift+R)
- Verify the deployment corresponds to the latest commit
- Check deployment logs to confirm the correct commit SHA
- Clear browser cache and revisit the preview URL

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel GitHub Integration](https://vercel.com/docs/concepts/git/vercel-for-github)

## Support

For issues related to:
- **Vercel platform**: [Vercel Support](https://vercel.com/support)
- **Application bugs**: Create an issue in this repository
- **CI/CD pipeline**: See `.github/workflows/ci.yml` and related documentation
