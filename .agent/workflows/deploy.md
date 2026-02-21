---
description: Deploy changes to Vercel via GitHub
---

Whenever you make changes to the codebase that should be reflected on the live site:

1. **Verify Changes**: Ensure the code builds and works as expected locally.
2. **Commit Changes**: Commit the changes with a descriptive message.
   ```powershell
   git add .
   git commit -m "Your descriptive commit message"
   ```
3. **Push to GitHub**: Push the changes to the `master` branch (or the active branch tracking Vercel).
   // turbo
   ```powershell
   git push origin master
   ```
4. **Monitor Vercel**: Vercel will automatically trigger a build once the push is successful.
