# GitHub Branch Protection Setup

This guide documents the steps to configure branch protection rules for the Pool League Predictor repository to ensure code quality and prevent broken code from reaching production.

## Table of Contents

- [Overview](#overview)
- [Why Branch Protection](#why-branch-protection)
- [Prerequisites](#prerequisites)
- [Configuring Branch Protection Rules](#configuring-branch-protection-rules)
- [Testing Branch Protection](#testing-branch-protection)
- [Managing Protected Branches](#managing-protected-branches)
- [Troubleshooting](#troubleshooting)

## Overview

Branch protection rules enforce quality gates before code can be merged into the `main` branch. This is especially critical for solo developers without code reviewers, as automated checks become the only safety net between changes and production.

### What Branch Protection Provides

- **Automated quality gates**: CI checks must pass before merging
- **Consistency**: All code follows the same quality standards
- **Safety**: Prevents accidental force pushes or deletions
- **Confidence**: Deploy knowing tests and checks have passed

## Why Branch Protection

Without branch protection, it's possible to:

- ❌ Merge failing tests directly to `main`
- ❌ Skip linting and type checking
- ❌ Deploy broken code to production
- ❌ Accidentally delete or force-push to `main`
- ❌ Merge without verifying changes pass CI

With branch protection enabled:

- ✅ CI workflow must complete successfully before merging
- ✅ All quality checks (typecheck, lint, test, build) are enforced
- ✅ Changes must be reviewed on preview deployments before merging
- ✅ Production branch is protected from destructive operations
- ✅ Consistent workflow for all code changes

## Prerequisites

Before configuring branch protection, ensure:

- [ ] Repository is hosted on GitHub
- [ ] You have **Admin** access to the repository
- [ ] GitHub Actions CI workflow is set up (see `.github/workflows/ci.yml`)
- [ ] CI workflow is passing successfully on the `main` branch

> **Note**: You must be a repository administrator to configure branch protection rules. Organization-owned repositories may require organization owner permissions.

## Configuring Branch Protection Rules

### Step 1: Navigate to Branch Protection Settings

1. Go to your repository on GitHub
2. Click **Settings** (in the repository navigation bar)
3. In the left sidebar, click **Branches** (under "Code and automation")
4. Under "Branch protection rules", click **Add rule** or **Add branch protection rule**

### Step 2: Specify Branch Name Pattern

1. In the **Branch name pattern** field, enter: `main`
2. This rule will apply to the `main` branch specifically

> **Tip**: You can use patterns like `main` or `release/*` to protect multiple branches. For this project, we only need to protect `main`.

### Step 3: Configure Protection Settings

Enable the following settings by checking their boxes:

#### ✅ Require a pull request before merging

This ensures all changes go through a pull request workflow.

- **Check this box**
- Under this option, **uncheck** "Require approvals" (since you're a solo developer)
- This allows you to merge your own PRs after CI passes

#### ✅ Require status checks to pass before merging

This is the most critical setting—it prevents merging if CI checks fail.

1. **Check this box**
2. **Check** "Require branches to be up to date before merging"
   - This ensures the branch has the latest `main` changes before merging
   - Prevents integration issues where tests pass on an outdated branch
3. In the search box under "Status checks that are required", search for and select:
   - **`CI`** - This is the workflow name from `.github/workflows/ci.yml`

   > **Note**: The status check won't appear in the search until it has run at least once on a branch. If you don't see "CI", push a branch and open a PR first, then return to add this status check.

#### ✅ Require conversation resolution before merging (Optional)

- **Optional**: Check this if you want to require all PR comments to be resolved
- Useful for self-review workflows where you leave yourself notes

#### ✅ Do not allow bypassing the above settings

- **Check this box**
- This ensures even administrators (you) cannot bypass the checks
- Forces discipline even when you're in a hurry
- **Critical for solo developers**: This is your safety net

#### ⚠️ Other Settings

Leave the following **unchecked** (not needed for solo development):

- ❌ Require deployments to succeed before merging
- ❌ Require signed commits (unless you use GPG signing)
- ❌ Require linear history (unless you prefer rebase-only workflow)
- ❌ Lock branch (would prevent all pushes)
- ❌ Allow force pushes (keep disabled for safety)
- ❌ Allow deletions (keep disabled for safety)

### Step 4: Save the Branch Protection Rule

1. Scroll to the bottom of the page
2. Click **Create** or **Save changes**
3. The `main` branch is now protected

## Testing Branch Protection

After configuring branch protection, verify it works correctly:

### Test 1: Verify Direct Push is Blocked

1. Try to push directly to `main`:
   ```bash
   git checkout main
   git commit --allow-empty -m "test: direct push"
   git push origin main
   ```

2. **Expected result**: Push should be rejected with an error like:
   ```
   remote: error: GH006: Protected branch update failed
   remote: error: Changes must be made through a pull request
   ```

3. Clean up:
   ```bash
   git reset --hard HEAD~1
   ```

### Test 2: Verify CI Checks are Required

1. Create a test branch and PR:
   ```bash
   git checkout -b test/branch-protection
   echo "# Test" >> README.md
   git add README.md
   git commit -m "test: verify branch protection"
   git push origin test/branch-protection
   ```

2. Open a pull request on GitHub targeting `main`

3. **Expected behavior**:
   - GitHub Actions CI workflow runs automatically
   - PR shows "Merging is blocked" until CI completes
   - After CI passes, "Merge pull request" button becomes available
   - If CI fails, merge button remains disabled

4. Verify the status checks section shows:
   - ✅ **CI** - Required check
   - Status: ✅ Passing or ⏳ In progress

5. Clean up:
   - Close the PR without merging
   - Delete the test branch: `git branch -D test/branch-protection`

### Test 3: Verify Up-to-Date Requirement

1. Create two test branches from `main`:
   ```bash
   git checkout main
   git pull
   git checkout -b test/branch-a
   echo "A" >> test.txt
   git add test.txt
   git commit -m "test: branch A"
   git push origin test/branch-a

   git checkout main
   git checkout -b test/branch-b
   echo "B" >> test.txt
   git add test.txt
   git commit -m "test: branch B"
   git push origin test/branch-b
   ```

2. Open PRs for both branches

3. Merge the first PR (branch-a)

4. On the second PR (branch-b), you should see:
   - ⚠️ "This branch is out-of-date with the base branch"
   - "Update branch" button required before merging

5. **Expected result**: Must update branch-b before merging

6. Clean up:
   - Close or merge branch-b
   - Delete test branches

## Managing Protected Branches

### Temporarily Bypassing Protection (Emergency Use Only)

If you absolutely must bypass protection (e.g., emergency hotfix):

1. Go to **Settings** → **Branches**
2. Click **Edit** on the `main` branch protection rule
3. **Uncheck** "Do not allow bypassing the above settings"
4. **Save changes**
5. Perform your emergency operation
6. **Immediately re-enable** "Do not allow bypassing the above settings"

> **⚠️ WARNING**: Only use this for genuine emergencies. If you find yourself doing this regularly, investigate why your workflow isn't working.

### Updating Status Check Requirements

When you rename or add new CI workflows:

1. Go to **Settings** → **Branches** → **Edit** rule for `main`
2. Scroll to "Require status checks to pass before merging"
3. Search for the new status check name
4. Select it to add to required checks
5. Remove old/renamed checks if necessary
6. Save changes

### Viewing Protection Status

To see which branches are protected:

1. Go to **Settings** → **Branches**
2. All protected branches are listed under "Branch protection rules"
3. Click **Edit** to view or modify a rule
4. Click **Delete** to remove protection (use with caution)

## Troubleshooting

### Can't Find Status Check in Search

**Problem**: The "CI" status check doesn't appear when searching

**Solutions**:
- The status check must run at least once before it appears in the search
- Create a test branch and open a PR to trigger the CI workflow
- Once CI has run, return to branch protection settings and search again
- Verify the workflow name in `.github/workflows/ci.yml` matches what you're searching for (line `name: CI`)

### Merge Button Still Disabled After CI Passes

**Problem**: CI checks pass but merge button remains disabled

**Solutions**:
- Check for required checks that haven't run yet
- Verify all conversations are resolved (if that setting is enabled)
- Ensure branch is up-to-date with base branch
- Check for required reviewers (should be disabled for solo dev)
- Hard refresh the page (Cmd+Shift+R / Ctrl+Shift+R)

### "Update Branch" Required on Every PR

**Problem**: Every PR requires updating branch before merging

**Explanation**: This is intentional behavior when "Require branches to be up to date" is enabled

**Solutions**:
- This is expected and ensures integration safety
- Click "Update branch" before merging
- Alternatively, rebase your branch locally: `git rebase main`
- If this is too burdensome, you can disable "Require branches to be up to date" (not recommended)

### Force Push Blocked on Feature Branch

**Problem**: Can't force push to clean up feature branch history

**Explanation**: Branch protection rules don't apply to feature branches by default

**Solutions**:
- Verify you're on a feature branch, not `main`
- If protection was applied to a pattern (e.g., `*`), it affects all branches
- Edit the rule to only protect `main` specifically
- Use `git push --force-with-lease` for safer force pushes

### Accidentally Committed to Main Locally

**Problem**: Made commits to local `main` branch and can't push

**Solutions**:
1. Create a new branch from your current position:
   ```bash
   git checkout -b feature/your-changes
   git push origin feature/your-changes
   ```
2. Reset local `main` to match remote:
   ```bash
   git checkout main
   git reset --hard origin/main
   ```
3. Open a PR for `feature/your-changes`

### CI Check Shows "Expected" but Never Runs

**Problem**: PR shows "Waiting for status to be reported"

**Solutions**:
- Verify `.github/workflows/ci.yml` exists in the branch
- Check GitHub Actions tab for workflow run errors
- Ensure workflow has correct triggers (`on: [push, pull_request]`)
- Verify Actions are enabled: Settings → Actions → General → "Allow all actions"
- Check for workflow syntax errors in the YAML file

## Best Practices

### Recommended Workflow

1. **Create feature branch** from up-to-date `main`
   ```bash
   git checkout main
   git pull
   git checkout -b feature/your-feature
   ```

2. **Make changes** and commit regularly
   ```bash
   git add .
   git commit -m "feat: add feature"
   ```

3. **Push and open PR**
   ```bash
   git push origin feature/your-feature
   ```
   Then open PR on GitHub

4. **Wait for CI** to pass (automatic)

5. **Review preview deployment** (automatic Vercel preview)

6. **Update branch** if needed (if main has changed)

7. **Merge** when CI passes and preview looks good

### Commit Message Conventions

Use clear, descriptive commit messages:

- `feat: add user authentication`
- `fix: resolve calculation error in predictions`
- `refactor: simplify stats computation`
- `test: add coverage for match validator`
- `docs: update API documentation`
- `chore: update dependencies`

### When to Use PR Workflow

**Always use PRs** for:
- ✅ New features
- ✅ Bug fixes
- ✅ Refactoring
- ✅ Dependency updates
- ✅ Configuration changes

**Optional for**:
- Documentation-only changes (though PR is still recommended)

## Additional Resources

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Managing Required Status Checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [PR Best Practices](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests)

## Support

For issues related to:
- **Branch protection**: Review this guide and GitHub documentation
- **CI workflow**: See `.github/workflows/ci.yml` and workflow logs
- **Deployment**: See `.github/DEPLOYMENT.md`
- **Application bugs**: Create an issue in this repository
