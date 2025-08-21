'use strict';

const fs = require('fs');
const path = require('path');
const scanPath = path.join(__dirname, '..', 'data', 'qrScans.json');

function fetchQRScans() {
  const scans = [
    { zone: 'VA-North', count: 128 },
    { zone: 'GA-Delta', count: 94 },
    { zone: 'TX-East', count: 203 },
  ];

  fs.mkdirSync(path.dirname(scanPath), { recursive: true });
  fs.writeFileSync(scanPath, JSON.stringify(scans, null, 2), 'utf8');
  console.log('✅ QR scan data fetched');
}

fetchQRScans();

