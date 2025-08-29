# FieldOpsSuite_v1

Modular Logistics Intelligence Platform

Real-time sourcing, certification, compliance, and public engagement across multi-state operations.

## Modules
- EXE/APK builds for crew deployment
- QR launch kits for sourcing and certification
- Dashboards with crew density overlays and scan heatmaps
- Digest automation and webhook sync via GitHub Actions

## Local Development
Requires Node.js 18+ (Node 20 recommended).

```bash
npm install
npm run scans # generates data/qrScans.json and public/heatmapOverlay.json
npm run digest # generates digests/weekly.md
npm start     # runs API on 5174 and Vite dev server on 5173
```

### Optional: Desktop (Tauri)

- Requires Rust toolchain and Tauri CLI installed.
- Dev points to Vite dev server; build serves `dist/`.

```bash
# Dev (start Vite then run tauri dev in another terminal)
npm run desktop:dev

# Build (prepare dist and then run tauri build manually)
npm run desktop:build
```

### Admin Analytics

- Set `ADMIN_BEARER_TOKEN` in server environment.
- Open `/admin.html`. Store token in localStorage:
  - Open devtools console and run: `localStorage.setItem('ADMIN_BEARER_TOKEN', '<your token>')`

Artifacts are written to `digests/weekly.md`, `data/qrScans.json`, and `public/heatmapOverlay.json`.

### Dashboard (widgets: drag, drop, pin, persist)

Open `http://localhost:5173` in a browser. Features:

- Drag and drop widgets to rearrange when **Customize** is enabled
- Pin widgets to lock their position (disables dragging for pinned)
- Layout and pin states persist in `localStorage` under key `fieldOpsDashboardV1`
- Heatmap widget reads from `public/heatmapOverlay.json`
- QR scans preview reads from `data/qrScans.json`
- Digest preview reads from `digests/weekly.md`

To reset layout, click "Reset Layout" or clear the localStorage key.

### Build

```bash
npm run build   # outputs to dist/
node scripts/serve.js  # serves dist/ on http://localhost:5174 (and proxies /api when using Vite dev)
```

### Android (Capacitor)

```bash
# Ensure dist/ exists
npm run build

# Sync Android platform
npm run android:add   # first time
npm run android:sync

# Open Android Studio
npm run android:open

# Notes:
# - App uses dist/ as webDir.
# - External links open in system browser via Capacitor Browser plugin if available.
# - All asset URLs are relative for offline support.
```

### Icon Dock (icons: drag, drop, pin, persist)

- Icons are shown below the top bar.
- Enable **Customize** to drag icons and change order.
- Pin icons to lock them; pinned icons cannot be dragged while pinned.
- Icon order and pin states persist under `localStorage` key `fieldOpsDashboardIconsV1`.

## CI/CD
- Weekly digest runs every Monday 06:00 UTC.
- Heatmap update runs every 6 hours.
- Enhancement logger updates on pushes that change `js`, `ts`, `apk`, or `exe` files.
- Quality gates (lint, test, build) run on pushes and PRs.
- Artifacts (digest, heatmap, site) are uploaded instead of committing to `main`.
- Optional Supabase storage upload when `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_BUCKET` are configured.

## Deployment
- CI/CD via Supabase + GitHub
- Public syndication via microsite, press room, and investor dashboard

## Security & Observability
- CSP via helmet allows required CDNs (MapLibre, Sentry, web-vitals) and self.
- `/api/install` gated by `ENABLE_INSTALL_API=1`, localhost-only, and optional `INSTALL_BEARER_TOKEN`.
- Optional Sentry: set `SENTRY_DSN` (served to client via `window.SENTRY_DSN`).
- Web Vitals posted to `/api/vitals`; currently logged server-side.

## License
MIT or custom licensing logic

