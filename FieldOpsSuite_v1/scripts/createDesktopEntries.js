'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const reposIndexPath = path.join(__dirname, '..', 'public', 'repos.json');

function getApplicationsDir() {
  const xdgDataHome = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(xdgDataHome, 'applications');
}

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function createDesktopEntryForRepo(repo) {
  const applicationsDir = getApplicationsDir();
  fs.mkdirSync(applicationsDir, { recursive: true });

  const fileName = `fieldops-${sanitizeFileName(repo.name)}.desktop`;
  const targetPath = path.join(applicationsDir, fileName);

  // Use xdg-open to open the repo path in the default file manager or code editor
  // If a remote is present and is https, opening remote in browser can be useful
  const execCommand = repo.remote && /^https?:\/\//.test(repo.remote)
    ? `xdg-open ${repo.remote}`
    : `xdg-open ${repo.path}`;

  const desktopFile = [
    '[Desktop Entry]',
    'Type=Application',
    `Name=FieldOps: ${repo.name}`,
    `Comment=Open ${repo.name} repository`,
    `Exec=${execCommand}`,
    'Terminal=false',
    'Categories=Development;Utility;',
    'StartupNotify=false'
  ].join('\n');

  fs.writeFileSync(targetPath, desktopFile, { encoding: 'utf8', mode: 0o644 });
  return targetPath;
}

function main() {
  if (!fs.existsSync(reposIndexPath)) {
    console.error('⚠️ repos.json not found. Run: node scripts/scanRepos.js');
    process.exit(1);
  }
  const repos = JSON.parse(fs.readFileSync(reposIndexPath, 'utf8'));
  const created = [];
  for (const repo of repos) {
    try {
      const file = createDesktopEntryForRepo(repo);
      created.push(file);
    } catch (err) {
      console.warn(`Failed to create desktop entry for ${repo.name}: ${err.message}`);
    }
  }

  if (created.length) {
    console.log(`✅ Created ${created.length} desktop entries in ${getApplicationsDir()}`);
  } else {
    console.log('No desktop entries created.');
  }
}

main();

