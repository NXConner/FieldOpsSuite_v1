'use strict';

const fs = require('fs');
const path = require('path');
const scanPath = path.join(__dirname, '..', 'data', 'qrScans.json');
const heatmapPath = path.join(__dirname, '..', 'public', 'heatmapOverlay.json');
const heatmapGeoPath = path.join(__dirname, '..', 'public', 'heatmap.geojson');

function generateHeatmap() {
  if (!fs.existsSync(scanPath)) {
    console.log('No scan data found. Skipping heatmap generation.');
    return;
  }

  const scans = JSON.parse(fs.readFileSync(scanPath, 'utf8'));
  const heatmap = scans.map((scan) => ({
    zone: scan.zone,
    intensity: scan.count > 150 ? 'high' : scan.count > 75 ? 'medium' : 'low',
    count: scan.count
  }));

  fs.mkdirSync(path.dirname(heatmapPath), { recursive: true });
  fs.writeFileSync(heatmapPath, JSON.stringify(heatmap, null, 2), 'utf8');
  console.log('✅ Heatmap overlay generated');

  // Also emit GeoJSON for mapping
  const zoneToCoords = {
    'VA-North': [-77.5, 38.3],
    'GA-Delta': [-84.4, 33.7],
    'TX-East': [-95.4, 30.1],
  };
  const fc = {
    type: 'FeatureCollection',
    features: heatmap.map((h) => {
      const coords = zoneToCoords[h.zone];
      return {
        type: 'Feature',
        geometry: coords ? { type: 'Point', coordinates: coords } : null,
        properties: {
          zone: h.zone,
          intensity: h.intensity,
          count: h.count,
        },
      };
    }),
  };
  fs.writeFileSync(heatmapGeoPath, JSON.stringify(fc, null, 2), 'utf8');
  console.log('✅ Heatmap GeoJSON generated');
}

if (require.main === module) {
  generateHeatmap();
}

module.exports = { generateHeatmap };

