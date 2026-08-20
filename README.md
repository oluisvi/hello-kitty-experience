# a little world for you ♡

A self-contained interactive Hello Kitty-inspired digital scrapbook built as a static frontend experience. It uses the provided portraits, a local `.glb` model, custom WebGL rendering, scroll motion, draggable Polaroids, Easter eggs, responsive layouts and reduced-motion fallbacks.

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

- The 3D scene is rendered from the bundled local GLB using a tiny dependency-free WebGL2 renderer, so the experience does not rely on a CDN for its 3D runtime.
- Motion is simplified automatically for touch devices and for `prefers-reduced-motion`.
- The eight supplied photos are converted to optimized local WebP assets.
- If WebGL2 is unavailable, the page keeps working and shows a lightweight visual fallback.

## 3D asset attribution

`Hello Kitty` 3D model by **FreshHyena4258**, sourced from Sketchfab and distributed under **CC BY 4.0**:
https://sketchfab.com/3d-models/hello-kitty-31cfcb2328af4f8eb4da75e13d922258
