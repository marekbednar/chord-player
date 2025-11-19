# chord-player

A simple browser-based chord progression composer and player powered by Tone.js.

This project has been converted to a buildable setup using Vite, and all JavaScript has been extracted from `index.html` into a proper module in `src/main.js`.

## Getting started

Prerequisites:
- Node.js 18+ (or 20+ recommended)
- npm (bundled with Node)

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

This will start Vite and open the app at http://localhost:5173

### Build for production

```bash
npm run build
```

The static build will be output to the `dist/` folder.

### Preview the production build locally

```bash
npm run preview
```

## Project structure

- `index.html` — app shell and styles; loads the JS module via `<script type="module" src="/src/main.js"></script>`
- `src/main.js` — all application logic (moved from inline script)
- `package.json` — scripts and dependencies (`vite`, `tone`)
- `vite.config.js` — minimal Vite configuration

## Notes

- Audio playback in browsers requires a user interaction. Click "Play Sequence" to unlock audio and start playback.
- If you see any CORS or module errors, ensure you are running via Vite (do not open `index.html` directly from the filesystem).