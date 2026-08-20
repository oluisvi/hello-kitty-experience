# a little world for you ♡

A self-contained interactive Hello Kitty-inspired digital scrapbook built as a static frontend experience. It uses the provided portraits, three local `.glb` models, custom WebGL rendering, scroll motion, draggable Polaroids, Easter eggs, responsive layouts and reduced-motion fallbacks.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Production build

```bash
npm run build
```

The static production output is written to `dist/`.

## Deploy on Vercel

1. Push this folder to a GitHub repository.
2. Import the repository in Vercel.
3. Vercel will use `npm run build` and publish `dist/` automatically through `vercel.json`.
4. No environment variables, backend, database or external runtime service is required.

## Notes

- All three supplied Hello Kitty GLBs are bundled locally and appear in different moments of the experience.
- Each model starts in a front-facing orientation, auto-rotates through 360°, pauses while being dragged, and can be rotated horizontally and vertically with mouse or touch.
- The heavier 3D scenes initialize only when the visitor approaches them in the page, reducing unnecessary startup work.
- Motion and rendering density are simplified automatically for smaller/touch devices and for `prefers-reduced-motion`.
- The eight supplied photos are converted to optimized local WebP assets.
- If WebGL2 is unavailable, the page keeps working and shows a lightweight visual fallback.
- Responsive tuning covers phone, tablet, short laptop, desktop and wide desktop layouts without horizontal overflow.

## 3D asset attribution

The original lightweight Hello Kitty model already used in this project is credited to **FreshHyena4258** on Sketchfab under **CC BY 4.0**:
https://sketchfab.com/3d-models/hello-kitty-31cfcb2328af4f8eb4da75e13d922258

The two additional GLB files are project-provided assets. Keep any original author/license attribution associated with those source files when known.
