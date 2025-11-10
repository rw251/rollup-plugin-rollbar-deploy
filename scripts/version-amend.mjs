#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const version = process.env.npm_package_version;

if (!version) {
  console.error('npm_package_version is not defined. Did you run this via npm scripts?');
  process.exit(1);
}

const message = `Release v${version}`;

try {
  execFileSync('git', ['commit', '--amend', '-m', message], { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to amend git commit message:', error.message);
  process.exit(error.status || 1);
}
