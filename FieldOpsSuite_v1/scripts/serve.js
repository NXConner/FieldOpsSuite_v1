'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { createDesktopEntryForRepo, getDesktopEntryPathForRepo } = require('./createDesktopEntries');
const { fetchGithubRepos } = require('./github');

const app = express();
const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

app.use((req, res, next) => {
  // Encourage installability and correct content types
  if (req.path.endsWith('.webmanifest')) {
    res.setHeader('Content-Type', 'application/manifest+json');
  }
  if (req.path === '/sw.js') {
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache');
  }
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

app.use(express.static(publicDir, { maxAge: '1h', extensions: ['html'] }));

app.get('/api/repos', async (req, res) => {
  try {
    const reposPath = path.join(publicDir, 'repos.json');
    const local = fs.existsSync(reposPath) ? JSON.parse(fs.readFileSync(reposPath, 'utf8')) : [];
    const githubUser = (req.query.github || '').toString().trim();
    let remote = [];
    if (githubUser) {
      remote = await fetchGithubRepos(githubUser, process.env.GITHUB_TOKEN || process.env.GH_TOKEN);
    }
    const combined = [...local];
    const seen = new Set(local.map(r => r.remote || r.path || r.name));
    for (const r of remote) {
      const key = r.remote || r.name;
      if (!seen.has(key)) {
        combined.push(r);
        seen.add(key);
      }
    }
    res.json(combined);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

app.get('/api/github/:user/repos', async (req, res) => {
  try {
    const user = req.params.user;
    const records = await fetchGithubRepos(user, process.env.GITHUB_TOKEN || process.env.GH_TOKEN);
    res.json(records);
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

