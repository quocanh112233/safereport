import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const init = readFileSync(new URL('../scripts/init-tidecloak.sh', import.meta.url), 'utf8');

test('bootstrap refuses inaccessible Docker before starting a container', () => {
  assert.ok(init.indexOf('docker info') < init.indexOf('docker run -d'));
});

test('bootstrap preserves existing containers and database files', () => {
  assert.doesNotMatch(init, /docker (?:stop|rm)\b|sudo rm|sudo chown/);
  assert.match(init, /docker container inspect "\$CONTAINER_NAME"/);
  assert.match(init, /Existing TideCloak data found/);
});

test('bootstrap requires operator secrets and explicit licence consent', () => {
  assert.match(init, /KC_BOOTSTRAP_ADMIN_PASSWORD is not set/);
  assert.match(init, /TIDE_TERMS_ACCEPTED:-.*!= "yes"/);
  assert.doesNotMatch(init, /KC_BOOTSTRAP_ADMIN_PASSWORD="(?:password|admin)"/);
});

test('DPoP HTML is byte-identical to the supplied Tide template', () => {
  assert.deepEqual(
    readFileSync(new URL('../public/tide_dpop_auth.html', import.meta.url)),
    readFileSync(new URL('../.tide-pack/templates/nextjs-e2ee-vault/public/tide_dpop_auth.html', import.meta.url)),
  );
});

const providers = readFileSync(new URL('../src/app/providers.tsx', import.meta.url), 'utf8');
const reportApp = readFileSync(new URL('../src/components/ReportApp.tsx', import.meta.url), 'utf8');

test('TideCloak provider enforces RFC 9449 strict ES256 DPoP inside config object', () => {
  assert.match(providers, /useDPoP:\s*\{\s*mode:\s*['"]strict['"],\s*alg:\s*['"]ES256['"]\s*\}/);
  assert.doesNotMatch(providers, /<TideCloakProvider[^>]*\buseDPoP=/);
});

test('ReportApp protects against React SSR hydration mismatch via mounted guard', () => {
  assert.match(reportApp, /const\s*\[mounted,\s*setMounted\]\s*=\s*useState\(false\)/);
  assert.match(reportApp, /useEffect\(\(\)\s*=>\s*\{\s*setMounted\(true\);?\s*\},/);
  assert.match(reportApp, /if\s*\(!mounted\)\s*\{/);
});

test('ReportApp intercepts cryptic DPoP offline errors and diagnoses TideCloak container', () => {
  assert.match(reportApp, /dpop_signing_alg_values_supported/);
  assert.match(reportApp, /safereport-tidecloak/);
});

const runScript = readFileSync(new URL('../run.sh', import.meta.url), 'utf8');

test('run.sh inspects container safereport-tidecloak and alerts when offline', () => {
  assert.match(runScript, /docker ps --filter "name=safereport-tidecloak"/);
  assert.match(runScript, /safereport-tidecloak/);
  assert.match(runScript, /run\.sh init/);
});

test('local environment .env exists and configures a high-entropy admin password', () => {
  const envContent = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  assert.match(envContent, /^KC_BOOTSTRAP_ADMIN_PASSWORD=\S+/m);
  const passwordMatch = envContent.match(/^KC_BOOTSTRAP_ADMIN_PASSWORD=(\S+)/m);
  assert.ok(passwordMatch && passwordMatch[1].length >= 12, 'Admin password must be at least 12 characters');
  assert.doesNotMatch(passwordMatch[1], /^(admin|password|123456|root)$/i, 'Default passwords are strictly forbidden');
});


