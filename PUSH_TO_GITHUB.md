# Push Studly to GitHub (IcyeyeLOL/Studly)

Run these commands in **PowerShell** or **Git Bash** from the **Studly** folder.  
If your Git repo is somewhere else (e.g. your user folder), see the note at the end.

---

## Option 1: This folder is not yet a Git repo (first time push)

Open a terminal and run:

```powershell
cd "c:\Users\lime7\Studly"

git init
git add .
git commit -m "Initial commit: Studly app and backend"

git branch -M main
git remote add origin https://github.com/IcyeyeLOL/Studly.git

git push -u origin main
```

When prompted for credentials, sign in with your GitHub account (or use a [Personal Access Token](https://github.com/settings/tokens) as the password).

---

## Option 2: This folder is already part of a Git repo (e.g. repo is at c:\Users\lime7)

If `git status` works when you’re in `c:\Users\lime7` and shows files from other projects (Stock Tracker, etc.), then your repo root is the **parent** of Studly. To push **only Studly** to https://github.com/IcyeyeLOL/Studly.git:

**A. Make Studly its own repo and push (recommended)**

```powershell
cd "c:\Users\lime7\Studly"

git init
git add .
git commit -m "Initial commit: Studly app and backend"

git branch -M main
git remote add origin https://github.com/IcyeyeLOL/Studly.git

git push -u origin main
```

After this, Studly will have its own `.git` and will push only to IcyeyeLOL/Studly.

**B. Or push from the parent repo**

If you prefer to keep one repo at `c:\Users\lime7` and have Studly as part of it:

```powershell
cd "c:\Users\lime7"

git remote add origin https://github.com/IcyeyeLOL/Studly.git
git branch -M main
git push -u origin main
```

That will push the **entire** repo (all folders under c:\Users\lime7), not only Studly. Use this only if that’s what you want.

---

## Add collaborators (on GitHub)

1. Open **https://github.com/IcyeyeLOL/Studly**
2. Go to **Settings** → **Collaborators** (or **Collaborators and teams**)
3. Click **Add people** and add by GitHub username or email
4. They’ll get an invite to accept

---

## If push is rejected (e.g. “failed to push some refs”)

If the GitHub repo already has a README or other content:

```powershell
git pull origin main --allow-unrelated-histories
# resolve any conflicts, then:
git push -u origin main
```

Or force-push (only if you’re fine overwriting the remote):

```powershell
git push -u origin main --force
```

---

## Summary

| Goal | Commands |
|------|----------|
| First-time push of Studly only | `cd c:\Users\lime7\Studly` → `git init` → `git add .` → `git commit -m "Initial commit..."` → `git branch -M main` → `git remote add origin https://github.com/IcyeyeLOL/Studly.git` → `git push -u origin main` |
| Add collaborators | GitHub → Repo → Settings → Collaborators → Add people |
