# Deploying

Target: **`https://anas-sec9.github.io`** — a GitHub Pages *user site*, served at the root.

`astro.config.mjs` is already set for this (`site: 'https://anas-sec9.github.io'`, `base: '/'`), so
there is nothing to change in the code. Just make sure `anas-sec9` really is your GitHub username —
if it isn't, fix the `site:` line before pushing.

---

## Step 1 — Create the repository

On GitHub, create a new repository named **exactly**:

```
anas-sec9.github.io
```

The name has to match `<your-username>.github.io` — **including the digit**. A repo called
`anas-sec.github.io` owned by `anas-sec9` is not a user site; it's a project site served at
`anas-sec9.github.io/anas-sec.github.io/`, and the CSS won't load because `base` is `/`.

If you got this wrong, no need to start over: **Settings → General → Repository name** to rename,
then point your local clone at the new URL:

```bash
git remote set-url origin https://github.com/anas-sec9/anas-sec9.github.io.git
```

Settings for the new repo:

- **Public** — required for Pages on a free account
- **Do not** add a README, .gitignore, or licence. Start it completely empty, otherwise the first
  push is rejected as a non-fast-forward.

---

## Step 2 — Push the site

Unzip `groundtruth-site.zip` somewhere sensible, then from inside the `groundtruth` folder:

```bash
git init -b main
git add .
git commit -m "Ground Truth: initial site"
git remote add origin https://github.com/anas-sec9/anas-sec9.github.io.git
git push -u origin main
```

On Windows you can run these in Git Bash, PowerShell, or the VS Code terminal — they're identical.

If you have the GitHub CLI, steps 1 and 2 collapse into:

```bash
gh repo create anas-sec9.github.io --public --source=. --remote=origin --push
```

---

## Step 3 — Turn on Pages (the step people miss)

In the repo: **Settings → Pages → Build and deployment → Source**, choose **GitHub Actions**.

Do *not* leave it on "Deploy from a branch". That mode runs Jekyll against your source files, which
has nothing to do with an Astro build, and it will either fail or publish the wrong thing.

The workflow at `.github/workflows/deploy.yml` handles everything else: it runs on every push to
`main`, does `npm ci && npm run build`, and publishes `dist/`.

---

## Step 4 — Watch it deploy

Go to the **Actions** tab. The first run takes about two minutes. When it's green, the site is live
at:

```
https://anas-sec9.github.io
```

First deploys occasionally take a few extra minutes for DNS to settle. If you get a 404 right away,
wait five minutes before assuming something broke.

---

## Publishing from now on

Adding a post is a commit:

```bash
git add .
git commit -m "Add Saitama analysis"
git push
```

Push to `main`, the Action rebuilds, the site updates. Nothing else to run.

Check it locally first with `npm run dev` — the build is strict about frontmatter, so a bad `date`
or a missing required field fails the CI build rather than publishing something broken. That's
deliberate.

---

## Troubleshooting

**Push rejected: "refusing to allow a Personal Access Token to create or update workflow
`.github/workflows/deploy.yml` without `workflow` scope".** Your token can't write to
`.github/workflows/`. Fix the token rather than deleting the workflow:

- *Classic PAT* — Settings → Developer settings → Personal access tokens → Tokens (classic) → open
  the token → tick **`workflow`** → Update. The token string is unchanged, so your saved Windows
  credential still works. Just push again.
- *Fine-grained PAT* — Repository permissions → **Workflows: Read and write**.
- *Or skip tokens* — `gh auth login` (GitHub CLI) or switch the remote to SSH.

Last resort if you can't change the token: `git rm --cached .github/workflows/deploy.yml`, commit
and push the rest, then create the workflow file through the GitHub web editor, which isn't subject
to the scope restriction.

**Site loads but has no CSS or images.** The `base` in `astro.config.mjs` doesn't match where the
site is actually served. For a user site it must be `'/'`. For a project repo it must be
`'/repo-name'`.

**Action fails on `npm ci`.** `package-lock.json` is out of sync with `package.json`. Run
`npm install` locally, commit the updated lockfile, push again.

**Action fails with a content error.** Read the message — Astro names the exact file and field. Most
often it's a `date` that isn't a real date, or an `attack:` entry missing `id` or `name`.

**Pages tab shows "Deploy from a branch" again.** Someone (or a template) reset it. Set it back to
GitHub Actions; the setting lives on the repo, not in the code.

---

## Later: a custom domain

If you buy a domain, it's three changes:

1. `site: 'https://yourdomain.tld'` in `astro.config.mjs`
2. Create `public/CNAME` containing just `yourdomain.tld`
3. Point a `CNAME` DNS record at `anas-sec9.github.io`, then set the domain in Settings → Pages and
   tick **Enforce HTTPS**

`base` stays `'/'`.
