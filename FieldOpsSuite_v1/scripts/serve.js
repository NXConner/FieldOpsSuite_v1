'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

app.use(express.static(publicDir));

app.get('/api/repos', (_req, res) => {
  const reposPath = path.join(publicDir, 'repos.json');
  if (!fs.existsSync(reposPath)) {
    return res.status(404).json({ error: 'repos.json not found. Run scan:repos' });
  }
  const data = JSON.parse(fs.readFileSync(reposPath, 'utf8'));
  res.json(data);
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const port = process.env.PORT || 5173;
app.listen(port, () => {
  console.log(`📦 FieldOpsSuite server running at http://localhost:${port}`);
});

