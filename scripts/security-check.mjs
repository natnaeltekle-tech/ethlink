#!/usr/bin/env node
/**
 * Lightweight security hygiene check for Eth-Links.
 * Usage: npm run security:check
 *
 * Does NOT print secret values. Fails if common secret files are tracked
 * or if obvious high-risk patterns appear in non-ignored source files.
 */
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
let failed = false;

function fail(msg) {
  console.error(`✗ ${msg}`);
  failed = true;
}

function ok(msg) {
  console.log(`✓ ${msg}`);
}

// 1. Ensure secret files are not tracked by git
const forbiddenTracked = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'credentials.json',
  'service-account.json',
];

try {
  const tracked = execSync('git ls-files', { encoding: 'utf8' })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const name of forbiddenTracked) {
    if (tracked.includes(name) || tracked.some((t) => t.endsWith(`/${name}`))) {
      fail(`Secret file is tracked by git: ${name} — remove it and rotate keys`);
    }
  }
  ok('No common secret filenames tracked by git');

  // 2. Block .pem / .key tracked files
  const keyFiles = tracked.filter((t) => /\.(pem|key|pkcs12|pfx)$/i.test(t));
  if (keyFiles.length) {
    fail(`Key/cert files tracked: ${keyFiles.join(', ')}`);
  } else {
    ok('No key/cert files tracked');
  }
} catch {
  console.warn('! git not available — skipped tracked-file checks');
}

// 3. Scan source for hard-coded high-risk patterns (no secret values printed)
const SCAN_DIRS = ['app', 'lib', 'components', 'scripts'];
const SKIP = new Set(['node_modules', '.next', '.git', 'android', 'public']);
const RISK =
  /(?:sk_live_|sk_test_|CHAPA_SECRET_KEY\s*=\s*['"][^'"]+['"]|SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][^'"]+['"]|-----BEGIN (?:RSA )?PRIVATE KEY-----)/;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|jsx|mjs|cjs|json|md|env)$/i.test(name) && !name.endsWith('.example')) {
      out.push(p);
    }
  }
  return out;
}

let riskHits = 0;
for (const dir of SCAN_DIRS) {
  for (const file of walk(join(root, dir))) {
    try {
      const text = readFileSync(file, 'utf8');
      if (RISK.test(text)) {
        riskHits++;
        fail(`Possible hard-coded secret pattern in ${relative(root, file)}`);
      }
    } catch {
      /* ignore unreadable */
    }
  }
}
if (riskHits === 0) ok('No obvious hard-coded secret patterns in app/lib/components/scripts');

// 4. Remind about production env
ok('Reminder: production must use Vercel env vars (never commit real keys)');
ok('Reminder: run `npm audit` periodically and update dependencies');

if (failed) {
  console.error('\nSecurity check failed.');
  process.exit(1);
}

console.log('\n✓ Security check passed');
