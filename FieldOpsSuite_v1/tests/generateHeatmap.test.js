/* eslint-env node */
'use strict';
/* global describe, it, beforeEach, expect */

const fs = require('fs');
const path = require('path');
const { generateHeatmap } = require('../scripts/generateHeatmap');

const dataDir = path.join(__dirname, '..', 'data');
const publicDir = path.join(__dirname, '..', 'public');
const scansPath = path.join(dataDir, 'qrScans.json');
const heatmapPath = path.join(publicDir, 'heatmapOverlay.json');

describe('generateHeatmap', () => {
  beforeEach(() => {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.mkdirSync(publicDir, { recursive: true });
    if (fs.existsSync(heatmapPath)) fs.unlinkSync(heatmapPath);
  });

  it('writes heatmap with intensity buckets', () => {
    const scans = [
      { zone: 'A', count: 10 },
      { zone: 'B', count: 100 },
      { zone: 'C', count: 250 },
    ];
    fs.writeFileSync(scansPath, JSON.stringify(scans, null, 2), 'utf8');
    generateHeatmap();
    const output = JSON.parse(fs.readFileSync(heatmapPath, 'utf8'));
    expect(output).toEqual([
      { zone: 'A', intensity: 'low' },
      { zone: 'B', intensity: 'medium' },
      { zone: 'C', intensity: 'high' },
    ]);
  });
});

