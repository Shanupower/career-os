#!/usr/bin/env node

/**
 * Cross-platform Career OS setup script.
 * Runs on Windows, macOS, and Linux without requiring WSL or Git Bash.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Helper to check command availability (safe to keep shell: true for global string commands without spaces)
function isCommandAvailable(cmd, args = ['--version']) {
  const check = spawnSync(cmd, args, { shell: true });
  return check.status === 0;
}

// Helper to clone a git repo if not present (using execSync with quotes to handle spaces in absoluteDest)
function cloneRepo(repoUrl, destDir, extraArgs = []) {
  const absoluteDest = path.join(ROOT, destDir);
  if (fs.existsSync(absoluteDest) && fs.readdirSync(absoluteDest).length > 0) {
    console.log(`[setup] Repository already exists at: ${destDir}`);
    return;
  }
  console.log(`[setup] Cloning ${repoUrl} to ${destDir}...`);
  const extraArgsStr = extraArgs.length ? extraArgs.join(' ') + ' ' : '';
  const cmd = `git clone ${extraArgsStr}"${repoUrl}" "${absoluteDest}"`;
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch {
    console.error(`[setup] Error: Failed to clone ${repoUrl}`);
    process.exit(1);
  }
}

// Main execution block
function run() {
  const args = process.argv.slice(2);
  const isJobspyMode = args.includes('--jobspy');
  const isJobsMode = args.includes('--jobs');
  const isAllMode = args.length === 0 || args.includes('--all') || (!isJobspyMode && !isJobsMode);

  console.log('====================================');
  console.log('         CAREER OS SETUP            ');
  console.log('====================================');

  // 1. Verify Git
  if (!isCommandAvailable('git')) {
    console.error('[setup] Error: Git is not installed or not in your system PATH.');
    process.exit(1);
  }

  // 2. Resolve Python Executable
  let pythonCmd = null;
  for (const cmd of ['python3', 'python', 'py']) {
    if (isCommandAvailable(cmd)) {
      pythonCmd = cmd;
      break;
    }
  }

  if (!pythonCmd) {
    console.error('[setup] Error: Python was not found. Please install Python 3.11+ and add it to your PATH.');
    process.exit(1);
  }
  console.log(`[setup] Found Python: ${pythonCmd}`);

  // 3. Create .env if missing
  const envPath = path.join(ROOT, '.env');
  const envExamplePath = path.join(ROOT, '.env.example');
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    console.log('[setup] Copying .env.example to .env...');
    fs.copyFileSync(envExamplePath, envPath);
  }

  // 4. Create external folder
  const externalDir = path.join(ROOT, 'external');
  if (!fs.existsSync(externalDir)) {
    fs.mkdirSync(externalDir, { recursive: true });
  }

  // 5. Clone submodules based on target
  if (isAllMode || isJobsMode) {
    cloneRepo('https://github.com/speedyapply/JobSpy', 'external/JobSpy');
    cloneRepo('https://github.com/vasu-devs/JustHireMe', 'external/JustHireMe');
    cloneRepo('https://github.com/santifer/career-ops', 'external/career-ops', ['--depth', '1']);
  } else if (isJobspyMode) {
    cloneRepo('https://github.com/speedyapply/JobSpy', 'external/JobSpy');
  }

  // 6. Setup Python Virtual Environment (.venv) (using quotes to handle spaces in venvDir)
  const venvDir = path.join(ROOT, '.venv');
  if (!fs.existsSync(venvDir)) {
    console.log('[setup] Creating virtual environment (.venv)...');
    try {
      execSync(`"${pythonCmd}" -m venv "${venvDir}"`, { stdio: 'inherit' });
    } catch {
      console.error('[setup] Error: Failed to create virtual environment.');
      process.exit(1);
    }
  }

  // 7. Resolve Virtual Environment Binaries Paths
  const isWindows = process.platform === 'win32';
  const pythonBinary = isWindows ? path.join(venvDir, 'Scripts', 'python.exe') : path.join(venvDir, 'bin', 'python');

  if (!fs.existsSync(pythonBinary)) {
    console.error(`[setup] Error: Python binary not found at ${pythonBinary}`);
    process.exit(1);
  }

  // 8. Upgrade pip & Install requirements (execSync with quoted paths handles space containing directories)
  console.log('[setup] Upgrading pip inside virtual environment...');
  try {
    execSync(`"${pythonBinary}" -m pip install --upgrade pip`, { stdio: 'inherit' });
  } catch {
    console.error('[setup] Error: Failed to upgrade pip.');
    process.exit(1);
  }

  const reqFile = isJobspyMode
    ? path.join(ROOT, 'python/job_discovery/requirements.txt')
    : path.join(ROOT, 'requirements.txt');

  console.log(`[setup] Installing Python requirements from: ${path.relative(ROOT, reqFile)}...`);
  try {
    execSync(`"${pythonBinary}" -m pip install -r "${reqFile}"`, { stdio: 'inherit' });
  } catch {
    console.error('[setup] Error: Failed to install Python dependencies.');
    process.exit(1);
  }

  // 9. Install Playwright browsers (using execSync with quotes to handle spaces in pythonBinary)
  if (isAllMode || isJobsMode) {
    try {
      console.log('[setup] Installing Playwright Chromium browser...');
      execSync(`"${pythonBinary}" -m playwright install chromium`, { stdio: 'inherit' });
      
      console.log('[setup] Installing Playwright Firefox browser...');
      execSync(`"${pythonBinary}" -m playwright install firefox`, { stdio: 'inherit' });
    } catch {
      console.error('[setup] Error: Failed to install Playwright browsers.');
      process.exit(1);
    }
  }

  console.log('\n====================================');
  console.log('        SETUP COMPLETE!             ');
  console.log('====================================');
  if (isAllMode) {
    console.log('\nTo start the application, run:');
    console.log('  npm run dev');
  } else {
    console.log('\nSetup finished for selected components.');
  }
}

run();
