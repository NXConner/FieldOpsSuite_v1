'use strict';

const https = require('https');

function httpGetJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'GET', headers: { 'User-Agent': 'FieldOpsSuite', 'Accept': 'application/vnd.github+json', ...headers } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchGithubRepos(username, token) {
  if (!username) return [];
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const repos = [];

  // Public repos by user
  const base = `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&type=all&sort=updated`;
  try {
    const page = await httpGetJson(base, headers);
    for (const r of page) repos.push(r);
  } catch (_e) {
    // ignore
  }

  // If token present, also try authenticated repos (may include private if authorized)
  if (token) {
    try {
      const authed = await httpGetJson('https://api.github.com/user/repos?per_page=100&sort=updated', headers);
      for (const r of authed) {
        if (r.owner && r.owner.login && r.owner.login.toLowerCase() === username.toLowerCase()) {
          repos.push(r);
        }
      }
    } catch (_e) {
      // ignore
    }
  }

  // Dedupe by full_name
  const byKey = new Map();
  for (const r of repos) {
    const key = r.full_name || r.id || r.html_url;
    if (!byKey.has(key)) byKey.set(key, r);
  }

  // Map to FieldOps repo record schema
  const records = Array.from(byKey.values()).map((r) => ({
    name: r.name,
    path: null,
    remote: r.html_url,
    provider: 'GitHub Actions',
    buildsUrl: r.html_url ? `${r.html_url}/actions` : null,
  }));

  return records;
}

module.exports = { fetchGithubRepos };

