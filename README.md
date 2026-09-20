# NORTHSTAR's tools

> Tools made for NORTHSTAR, and maybe for some people

A fast, lightweight, zero-bloat tools hub built with a 2018 indie developer aesthetic and a default dark theme (`#002B36`).

---

## Features

- **Indie 2018 Aesthetic**: Minimalist, clean typography, no decorative emojis in the general UI, deep Solarized dark theme (`#002B36`).
- **Folder-Based Tool Architecture**: Every tool is contained in its own folder under `tools/<tool-slug>/` with direct, permanent, shareable URLs.
- **Instant Sharing**: Built-in "Copy Link" / "Share Tool" clipboard buttons.
- **Zero Build Step**: Native HTML/CSS/JS, instantaneous page loads, zero runtime dependencies.
- **Vercel-Ready**: Deploys in seconds to Vercel.

---

## Tools

| Tool | Path | Description |
| :--- | :--- | :--- |
| **Hunt: 20 Pizza Place Trophy Brute Forcer** | `/tools/hunt-20-pizza-place-trophy/` | Calculates all 24 emoji permutations for the 20-trophy puzzle in Work at a Pizza Place and tests random untried combinations until solved. |

---

## How to Add a New Tool

Adding a tool takes less than a minute:

1. **Create a tool folder** under `tools/`:
   ```text
   tools/
   └── my-new-tool/
       ├── index.html
       ├── tool.css (optional)
       └── tool.js (optional)
   ```

2. **Register the tool** in `js/hub.js`:
   ```javascript
   TOOLS.push({
     id: "my-new-tool",
     title: "My New Tool",
     description: "What this tool does in a sentence or two.",
     path: "tools/my-new-tool/",
     tag: "Category",
     date: "2024"
   });
   ```

That's it! The tool will immediately appear on the hub with its card, search filtering, and unique shareable link.

---

## Repository

- **GitHub**: [https://github.com/BlackwellArchitecture/-NORTHSTAR-tools](https://github.com/BlackwellArchitecture/-NORTHSTAR-tools)

To push future updates:
```bash
git add .
git commit -m "Your update description"
git push
```

---

## Deploying to Vercel

1. Log into your [Vercel Dashboard](https://vercel.com/).
2. Click **Add New** &rarr; **Project**.
3. Import your `NORTHSTAR tools` GitHub repository.
4. Leave framework preset as **Other** (Root directory: `./`).
5. Click **Deploy**!
