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
node scripts/generateDigest.js
node scripts/fetchQRScans.js && node scripts/generateHeatmap.js
```

Artifacts are written to `digests/weekly.md`, `data/qrScans.json`, and `public/heatmapOverlay.json`.

### Dashboard (widgets: drag, drop, pin, persist)

Open `public/index.html` in a browser. Features:

- Drag and drop widgets to rearrange when **Customize** is enabled
- Pin widgets to lock their position (disables dragging for pinned)
- Layout and pin states persist in `localStorage` under key `fieldOpsDashboardV1`
- Heatmap widget reads from `public/heatmapOverlay.json`
- QR scans preview reads from `data/qrScans.json`
- Digest preview reads from `digests/weekly.md`

To reset layout, click "Reset Layout" or clear the localStorage key.

### Icon Dock (icons: drag, drop, pin, persist)

- Icons are shown below the top bar.
- Enable **Customize** to drag icons and change order.
- Pin icons to lock them; pinned icons cannot be dragged while pinned.
- Icon order and pin states persist under `localStorage` key `fieldOpsDashboardIconsV1`.

## CI/CD
- Weekly digest runs every Monday 06:00 UTC.
- Heatmap update runs every 6 hours.
- Enhancement logger updates on pushes that change `js`, `ts`, `apk`, or `exe` files.

## Deployment
- CI/CD via Supabase + GitHub
- Public syndication via microsite, press room, and investor dashboard

## License
MIT or custom licensing logic

