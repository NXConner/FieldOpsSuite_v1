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
const logsDir = path.join(rootDir, 'logs');
fs.mkdirSync(logsDir, { recursive: true });
const vitalsLogPath = path.join(logsDir, 'vitals.log');

// Security headers with CSP
const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", 'https://unpkg.com'],
  styleSrc: ["'self'", 'https://unpkg.com', "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'blob:', 'https://demotiles.maplibre.org'],
  connectSrc: ["'self'", 'https://api.github.com', 'https://*.supabase.co', 'https://demotiles.maplibre.org'],
  fontSrc: ["'self'", 'data:'],
  workerSrc: ["'self'", 'blob:'],
  frameAncestors: ["'self'"],
  baseUri: ["'self'"],
};
app.use(helmet({
  contentSecurityPolicy: { directives: cspDirectives },
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
    // Optional Lovable entries
    const lovablePath = path.join(publicDir, 'lovable.json');
    const lovableRaw = fs.existsSync(lovablePath) ? JSON.parse(fs.readFileSync(lovablePath, 'utf8')) : [];
    const githubUser = (req.query.github || '').toString().trim();
    let remote = [];
    if (githubUser) {
      remote = await fetchGithubRepos(githubUser, process.env.GITHUB_TOKEN || process.env.GH_TOKEN);
    }
    // Normalize lovable entries into repo records
    const lovable = Array.isArray(lovableRaw) ? lovableRaw.map((p) => ({
      name: p.name || p.title || 'Lovable Project',
      path: null,
      remote: p.projectUrl || p.url || null,
      provider: 'Lovable',
      buildsUrl: null,
      previewUrl: p.previewUrl || p.embedUrl || p.url || null,
    })) : [];

    const combined = [...local, ...lovable];
    const seen = new Set(combined.map(r => r.remote || r.path || r.name));
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
  const bearer = (req.headers['authorization'] || '').toString();
  const required = process.env.INSTALL_BEARER_TOKEN;
  if (required && bearer !== `Bearer ${required}`) {
    return res.status(401).json({ error: 'Unauthorized' });
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

// Web Vitals endpoint (optional metrics ingestion)
app.post('/api/vitals', express.json({ type: '*/*' }), (req, res) => {
  try {
    const metric = req.body || {};
    // For now, just log. In production, forward to analytics.
    const line = JSON.stringify({ ts: Date.now(), ...metric }) + '\n';
    fs.appendFileSync(vitalsLogPath, line, 'utf8');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/vitals/summary', (_req, res) => {
  try {
    const required = process.env.ADMIN_BEARER_TOKEN;
    if (required) {
      const bearer = ( _req.headers['authorization'] || '').toString();
      if (bearer !== `Bearer ${required}`) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }
    if (!fs.existsSync(vitalsLogPath)) return res.json({ count: 0, byName: {} });
    const lines = fs.readFileSync(vitalsLogPath, 'utf8').trim().split('\n').slice(-1000);
    const byName = new Map();
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const name = entry.name || 'UNKNOWN';
        const value = Number(entry.value);
        if (!byName.has(name)) byName.set(name, { count: 0, sum: 0, min: Infinity, max: -Infinity });
        const agg = byName.get(name);
        agg.count += 1;
        if (!Number.isNaN(value)) {
          agg.sum += value;
          if (value < agg.min) agg.min = value;
          if (value > agg.max) agg.max = value;
        }
      } catch (_) {}
    }
    const result = {};
    for (const [k, v] of byName.entries()) {
      result[k] = { count: v.count, avg: v.count ? v.sum / v.count : 0, min: isFinite(v.min) ? v.min : 0, max: isFinite(v.max) ? v.max : 0 };
    }
    res.json({ count: lines.length, byName: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const port = Number(process.env.PORT) || 5174;
app.listen(port, () => {
  console.log(`📦 FieldOpsSuite server running at http://localhost:${port}`);
});

