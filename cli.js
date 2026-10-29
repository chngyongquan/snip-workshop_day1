#!/usr/bin/env node
'use strict';

const { spawn } = require('node:child_process');

const apiBase = (process.env.SNIP_API || 'http://localhost:3000').replace(/\/+$/, '');

function printUsage() {
  console.log(`Snip URL shortener CLI

Usage:
  snip add <url>    Create a short link
  snip ls           List saved links
  snip open <code>  Open a short link's destination in your browser
  snip help         Show this help`);
}

function parseHttpUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Provide a valid HTTP or HTTPS URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Provide a valid HTTP or HTTPS URL.');
  }
  return url;
}

async function responseBody(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function responseError(response) {
  const body = await responseBody(response);
  return body && typeof body.error === 'string'
    ? body.error
    : `Request failed with HTTP ${response.status}.`;
}

async function addLink(value) {
  const url = parseHttpUrl(value.trim());
  const response = await fetch(`${apiBase}/api/links`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: url.href }),
  });
  if (!response.ok) throw new Error(await responseError(response));

  const link = await responseBody(response);
  if (!link || typeof link.shortUrl !== 'string') {
    throw new Error('The API returned an invalid link response.');
  }
  console.log(link.shortUrl);
}

async function listLinks() {
  const response = await fetch(`${apiBase}/api/links`);
  if (!response.ok) throw new Error(await responseError(response));

  const links = await responseBody(response);
  if (!Array.isArray(links)) throw new Error('The API returned an invalid links response.');
  if (links.length === 0) {
    console.log('No links yet.');
    return;
  }

  const rows = links.map((link) => ({
    code: String(link.code ?? ''),
    hits: String(link.hits ?? 0),
    url: String(link.url ?? ''),
  }));
  const codeWidth = Math.max(4, ...rows.map((row) => row.code.length));
  const hitsWidth = Math.max(4, ...rows.map((row) => row.hits.length));
  console.log(`${'CODE'.padEnd(codeWidth)}  ${'HITS'.padStart(hitsWidth)}  URL`);
  for (const row of rows) {
    console.log(`${row.code.padEnd(codeWidth)}  ${row.hits.padStart(hitsWidth)}  ${row.url}`);
  }
}

function openInBrowser(url) {
  let command;
  let args;

  if (process.platform === 'win32') {
    command = 'cmd.exe';
    args = ['/d', '/s', '/c', `start "" "${url.replaceAll('"', '""')}"`];
  } else if (process.platform === 'darwin') {
    command = 'open';
    args = [url];
  } else {
    command = 'xdg-open';
    args = [url];
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}

async function openLink(code) {
  const response = await fetch(`${apiBase}/${encodeURIComponent(code)}`, { redirect: 'manual' });
  if (response.status === 404) throw new Error(`Unknown short code: ${code}`);

  const destination = response.headers.get('location');
  if (response.status < 300 || response.status >= 400 || !destination) {
    throw new Error(await responseError(response));
  }

  const url = parseHttpUrl(destination);
  await openInBrowser(url.href);
  console.log(`Opened ${url.href}`);
}

async function main() {
  const [command, argument, ...extra] = process.argv.slice(2);
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printUsage();
    return;
  }

  if (extra.length > 0) throw new Error('Too many arguments.');
  if (command === 'add' && argument) return addLink(argument);
  if (command === 'ls' && !argument) return listLinks();
  if (command === 'open' && argument) return openLink(argument);
  throw new Error('Invalid command or missing argument. Run "snip help" for usage.');
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});