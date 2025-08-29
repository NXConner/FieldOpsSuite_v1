'use strict';

const fs = require('fs');
const path = require('path');

const workspaceRoot = path.join(__dirname, '..');
const publicDir = path.join(workspaceRoot, 'public');
const outputPath = path.join(publicDir, 'repos.json');

function isGitRepository(directoryPath) {
  try {
    const stat = fs.statSync(path.join(directoryPath, '.git'));
    return stat && stat.isDirectory();
  } catch (_err) {
    return false;
  }
}

function listCandidateRepositories(rootDir) {
  const repos = [];
  // Include the root itself if it's a repository
  if (isGitRepository(rootDir)) {
    repos.push(rootDir);
  }

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    // Skip common large or irrelevant directories
    if (name === '.git' || name === 'node_modules' || name === '.next' || name === 'dist' || name === 'build') {
      continue;
    }
    const childPath = path.join(rootDir, name);
    if (isGitRepository(childPath)) {
      repos.push(childPath);
    }
  }
  return repos;
}

function listRepositoriesRecursively(rootDir, maxDepth = 3) {
  const discovered = new Set();

  function walk(currentDir, depth) {
    if (depth > maxDepth) return;
    try {
      // Add current dir if repo
      if (isGitRepository(currentDir)) {
        discovered.add(currentDir);
      }
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const name = entry.name;
        if (name === '.git' || name === 'node_modules' || name.startsWith('.cache')) continue;
        const next = path.join(currentDir, name);
        // If this subdir is a repo, add and do not traverse deeper inside it to avoid nested mono-repo noise
        if (isGitRepository(next)) {
          discovered.add(next);
          continue;
        }
        walk(next, depth + 1);
      }
    } catch (_err) {
      // Ignore traversal errors
    }
  }

  walk(rootDir, 0);
  return Array.from(discovered);
}

function buildRepositoryRecord(repoDir) {
  const name = path.basename(repoDir);
  let remoteUrl = null;
  const gitConfigPath = path.join(repoDir, '.git', 'config');
  if (fs.existsSync(gitConfigPath)) {
    const config = fs.readFileSync(gitConfigPath, 'utf8');
    const match = config.match(/url\s*=\s*(.+)/);
    if (match) {
      remoteUrl = match[1].trim();
    }
  }
  return {
    name,
    path: repoDir,
    remote: remoteUrl,
  };
}

function generateRepos() {
  const rootsToScan = [workspaceRoot, path.resolve(workspaceRoot, '..')];

  const discovered = new Map();

  for (const root of rootsToScan) {
    let repos = [];
    try {
      // First check immediate repos, then recurse a bit for nested ones
      const immediate = listCandidateRepositories(root);
      const recursive = listRepositoriesRecursively(root, 2);
      repos = Array.from(new Set([...immediate, ...recursive]));
    } catch (_err) {
      // ignore permission or IO errors for this root
    }
    for (const repoPath of repos) {
      const record = buildRepositoryRecord(repoPath);
      discovered.set(record.path, record);
    }
  }

  fs.mkdirSync(publicDir, { recursive: true });
  const list = Array.from(discovered.values()).sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(outputPath, JSON.stringify(list, null, 2), 'utf8');
  console.log(`✅ Repo index written: ${outputPath} (${list.length} repos)`);
}

generateRepos();

