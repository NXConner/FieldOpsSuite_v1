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

## CI/CD
- Weekly digest runs every Monday 06:00 UTC.
- Heatmap update runs every 6 hours.
- Enhancement logger updates on pushes that change `js`, `ts`, `apk`, or `exe` files.

## Deployment
- CI/CD via Supabase + GitHub
- Public syndication via microsite, press room, and investor dashboard

## License
MIT or custom licensing logic

