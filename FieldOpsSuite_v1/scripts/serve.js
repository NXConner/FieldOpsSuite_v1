'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { createDesktopEntryForRepo, getDesktopEntryPathForRepo } = require('./createDesktopEntries');

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

app.post('/api/install', express.json(), (req, res) => {
  try {
    const repo = req.body && req.body.repo;
    if (!repo || !repo.name || !repo.path) {
      return res.status(400).json({ error: 'Invalid repo payload' });
    }
    const file = createDesktopEntryForRepo(repo);
    return res.json({ ok: true, desktopEntry: file });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/install/status', (_req, res) => {
  try {
    const reposPath = path.join(publicDir, 'repos.json');
    const list = fs.existsSync(reposPath) ? JSON.parse(fs.readFileSync(reposPath, 'utf8')) : [];
    const status = list.map(r => ({ name: r.name, desktopEntry: getDesktopEntryPathForRepo(r), installed: fs.existsSync(getDesktopEntryPathForRepo(r)) }));
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const port = process.env.PORT || 5173;
app.listen(port, () => {
  console.log(`📦 FieldOpsSuite server running at http://localhost:${port}`);
});

