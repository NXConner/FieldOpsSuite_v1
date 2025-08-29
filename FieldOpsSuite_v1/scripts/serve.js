'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const { createDesktopEntryForRepo, getDesktopEntryPathForRepo } = require('./createDesktopEntries');
const { fetchGithubRepos } = require('./github');

const app = express();
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');
const staticDir = fs.existsSync(distDir) ? distDir : publicDir;

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // keep simple for dev; add CSP later if needed
  crossOriginEmbedderPolicy: false,
}));

// Optional COOP/COEP for advanced features; gate via env
app.use((req, res, next) => {
  if (process.env.ENABLE_COOP === '1') {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  }
  if (req.path.endsWith('.webmanifest')) {
    res.setHeader('Content-Type', 'application/manifest+json');
  }
  if (req.path === '/sw.js') {
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache');
  }
  next();
});

app.use(express.static(staticDir, { maxAge: '1h', extensions: ['html'] }));

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
  // Gate the endpoint to explicit opt-in and local-only requests
  if (process.env.ENABLE_INSTALL_API !== '1') {
    return res.status(403).json({ error: 'Install API disabled' });
  }
  const ip = req.ip || req.connection?.remoteAddress || '';
  const isLocal = ip.includes('127.0.0.1') || ip.includes('::1') || req.hostname === 'localhost';
  if (!isLocal) {
    return res.status(403).json({ error: 'Local access only' });
  }
  try {
    const repo = req.body && req.body.repo;
    if (!repo || !repo.name || !repo.path) {
      return res.status(400).json({ error: 'Invalid repo payload' });
    }
    // Basic validation
    if (typeof repo.name !== 'string' || typeof repo.path !== 'string') {
      return res.status(400).json({ error: 'Invalid repo fields' });
    }
    if (repo.remote && !/^https?:\/\//.test(String(repo.remote))) {
      return res.status(400).json({ error: 'Invalid remote URL' });
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
  const indexPath = path.join(staticDir, 'index.html');
  res.sendFile(indexPath);
});

const port = Number(process.env.PORT) || 5174;
app.listen(port, () => {
  console.log(`📦 FieldOpsSuite server running at http://localhost:${port}`);
});

