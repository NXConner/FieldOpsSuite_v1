'use strict';

const fs = require('fs');
const path = require('path');
const scanPath = path.join(__dirname, '..', 'data', 'qrScans.json');
const heatmapPath = path.join(__dirname, '..', 'public', 'heatmapOverlay.json');

function generateHeatmap() {
  if (!fs.existsSync(scanPath)) {
    console.log('No scan data found. Skipping heatmap generation.');
    return;
  }

  const scans = JSON.parse(fs.readFileSync(scanPath, 'utf8'));
  const heatmap = scans.map((scan) => ({
    zone: scan.zone,
    intensity: scan.count > 150 ? 'high' : scan.count > 75 ? 'medium' : 'low',
  }));

  fs.mkdirSync(path.dirname(heatmapPath), { recursive: true });
  fs.writeFileSync(heatmapPath, JSON.stringify(heatmap, null, 2), 'utf8');
  console.log('✅ Heatmap overlay generated');
}

if (require.main === module) {
  generateHeatmap();
}

module.exports = { generateHeatmap };

