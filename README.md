# VisionCart

A display-first shopping list designed for a fixed 600 × 600 viewport and keyboard or Neural Band-style arrow/Enter navigation.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL Vite prints in the terminal.

## Publish as a GitHub Page

1. Create a new GitHub repository.
2. Upload every file in this folder to the repository root.
3. Make sure the default branch is named `main`.
4. Open **Settings → Pages** on GitHub.
5. Set the source to **GitHub Actions**.
6. Push to `main` or run **Actions → Deploy VisionCart to GitHub Pages → Run workflow**.

The included workflow automatically builds and publishes the site. It detects the repository name and configures the correct Vite path:

- `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/` for a normal repository
- `https://YOUR-USERNAME.github.io/` when the repository is named `YOUR-USERNAME.github.io`

## Included behavior

- Add items with the plus button, text input, or Enter.
- Use arrow keys to move focus and Enter to open item actions.
- Complete or delete an item after opening its actions.
- Clear all items or clear all checked items.
- Persist the list in browser local storage.