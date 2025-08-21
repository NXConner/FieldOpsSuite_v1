'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const logPath = path.join(__dirname, '..', 'logs', 'enhancements.log');

function getGitDiff() {
  try {
    const output = execSync('git diff --name-only HEAD~1 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    if (!output) return [];
    return output.split('\n');
  } catch (_err) {
    return [];
  }
}

function logEnhancements() {
  const changes = getGitDiff();
  const timestamp = new Date().toISOString();
  const formattedChanges = changes.map((file) => `- ${file}`).join('\n') || '- No file changes detected';
  const logEntry = `\n[${timestamp}]\nFiles changed:\n${formattedChanges}\n`;

  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, logEntry, 'utf8');
  console.log('✅ Enhancement log updated');
}

logEnhancements();

