import { readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';

const TARGETS = {
  testflight: {
    channel: 'testflight',
    environment: 'preview',
  },
  production: {
    channel: 'production',
    environment: 'production',
  },
};

function fail(message) {
  console.error(`\nOTA blocked: ${message}\n`);
  process.exit(1);
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const targetName = args.shift();
const target = TARGETS[targetName];

if (!target) {
  fail('use either `yarn ota:testflight --message "..."` or the protected Production workflow.');
}

let message = '';
while (args.length > 0) {
  const argument = args.shift();
  if (argument === '--message' && args.length > 0) {
    message = args.shift().trim();
    continue;
  }
  fail(`unknown or incomplete argument: ${argument}`);
}

if (!message) {
  fail('an update message is required. Add `--message "변경 내용"`.');
}

const commitSha = git('rev-parse', 'HEAD');

if (targetName === 'production') {
  if (process.env.GITHUB_ACTIONS !== 'true') {
    fail('Production OTA can run only in GitHub Actions. Local Production publishing is disabled.');
  }
  if (process.env.GITHUB_REF !== 'refs/heads/main') {
    fail('Production OTA can run only from the main branch workflow.');
  }
  if (process.env.GITHUB_SHA !== commitSha) {
    fail('the checked-out commit does not match the GitHub workflow commit.');
  }
  if (process.env.LOTTO_PRODUCTION_OTA_APPROVAL !== 'PRODUCTION') {
    fail('the protected workflow approval marker is missing.');
  }
}

const worktreeStatus = git('status', '--porcelain');
if (worktreeStatus) {
  fail('commit or stash every change before publishing an OTA update.');
}

const appConfig = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
const appVersion = appConfig.expo?.version ?? 'unknown';
const runtimePolicy = appConfig.expo?.runtimeVersion?.policy ?? 'unknown';

console.log('\nOTA deployment target');
console.log(`- target: ${targetName}`);
console.log(`- channel: ${target.channel}`);
console.log(`- environment: ${target.environment}`);
console.log(`- app version: ${appVersion}`);
console.log(`- runtime policy: ${runtimePolicy}`);
console.log(`- commit: ${commitSha}`);
console.log(`- message: ${message}\n`);

const result = spawnSync(
  'eas',
  [
    'update',
    '--channel',
    target.channel,
    '--environment',
    target.environment,
    '--platform',
    'all',
    '--message',
    message,
    '--non-interactive',
  ],
  { stdio: 'inherit' },
);

if (result.error) {
  if (result.error.code === 'ENOENT') {
    fail('the EAS CLI is not installed or is not available on PATH.');
  }
  fail(result.error.message);
}

process.exit(result.status ?? 1);
