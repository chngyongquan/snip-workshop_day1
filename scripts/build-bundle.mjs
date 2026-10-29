#!/usr/bin/env node

import { execFileSync, execSync } from 'node:child_process';
import { cpSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FRONTEND = join(ROOT, 'frontend');
const BUNDLE = join(ROOT, 'bundle');
const DIST = join(FRONTEND, 'dist', 'snip-frontend', 'browser');
const PUSH = process.argv.includes('--push');

function runGit(args) {
  execFileSync('git', args, { cwd: ROOT, stdio: 'inherit' });
}

function captureGit(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function runNpm(args) {
  execSync(`npm ${args}`, { cwd: FRONTEND, stdio: 'inherit' });
}

if (!existsSync(BUNDLE)) {
  throw new Error('bundle/ is missing. Initialize the bundle submodule before building.');
}

console.log('> Updating backend, frontend, and cli submodules...');
runGit(['submodule', 'update', '--init', '--remote', 'backend', 'frontend', 'cli']);

console.log('> Installing frontend dependencies...');
runNpm('install --no-audit --no-fund');

console.log('> Building the Angular frontend...');
runNpm('run build');
if (!existsSync(join(DIST, 'index.html'))) {
  throw new Error(`Angular build output not found at ${join(DIST, 'index.html')}`);
}

console.log('> Assembling bundle/ ...');
rmSync(join(BUNDLE, 'public'), { recursive: true, force: true });
cpSync(join(ROOT, 'backend', 'server.js'), join(BUNDLE, 'server.js'));
cpSync(join(ROOT, 'cli', 'cli.js'), join(BUNDLE, 'cli.js'));
cpSync(DIST, join(BUNDLE, 'public'), { recursive: true });

writeFileSync(join(BUNDLE, '.env'), 'PUBLIC_DIR=./public\n');
writeFileSync(join(BUNDLE, 'package.json'), `${JSON.stringify({
  name: 'snip-bundle',
  version: '1.0.0',
  private: true,
  scripts: { start: 'bun server.js' },
}, null, 2)}\n`);
writeFileSync(join(BUNDLE, 'Dockerfile'), [
  'FROM oven/bun:1-alpine',
  'WORKDIR /app',
  'COPY . .',
  'ENV PORT=3000',
  'EXPOSE 3000',
  'CMD ["bun", "server.js"]',
  '',
].join('\n'));
writeFileSync(join(BUNDLE, '.dockerignore'), [
  '.git',
  'node_modules',
  'npm-debug.log',
  '',
].join('\n'));
writeFileSync(join(BUNDLE, 'railway.json'), `${JSON.stringify({
  $schema: 'https://railway.com/railway.schema.json',
  build: { builder: 'DOCKERFILE', dockerfilePath: 'Dockerfile' },
  deploy: { restartPolicyType: 'ON_FAILURE', restartPolicyMaxRetries: 3 },
}, null, 2)}\n`);

runGit(['-C', BUNDLE, 'add', '-A']);
if (captureGit(['-C', BUNDLE, 'diff', '--cached', '--name-only'])) {
  runGit(['-C', BUNDLE, 'commit', '-m', 'Rebuild bundle from source branches']);
  console.log('> Bundle changes committed.');
} else {
  console.log('> Bundle unchanged; nothing to commit.');
}

if (PUSH) {
  runGit(['-C', BUNDLE, 'push', 'origin', 'HEAD:bundle']);
}

runGit(['add', '--', 'backend', 'frontend', 'cli', 'bundle']);
if (captureGit(['diff', '--cached', '--name-only', '--', 'backend', 'frontend', 'cli', 'bundle'])) {
  runGit(['commit', '-m', 'Bump submodule pointers (bundle release)']);
  console.log('> Superproject pointers committed.');
} else {
  console.log('> Submodule pointers unchanged; nothing to commit.');
}

if (PUSH) {
  runGit(['push']);
  console.log('> Bundle branch and main pushed.');
} else {
  console.log('> Changes committed locally. Run with --push to publish bundle and main.');
}