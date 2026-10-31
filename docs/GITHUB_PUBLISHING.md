# Publish to a public GitHub repository

This project cannot be pushed to your GitHub account without your explicit account authentication and repository action. To publish from Windows PowerShell:

1. Create a **public empty repository** on GitHub named `hr-lifecycle-management` (do not initialize it with a README if using the commands below).
2. Open PowerShell in this project folder.
3. Run:

```powershell
git init
git add .
git commit -m "Build HR lifecycle management system"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/hr-lifecycle-management.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username. Authenticate using Git Credential Manager or the official GitHub CLI; never put a token in the remote URL or commit secrets. Confirm the repository visibility is Public and `.env` is not committed.
