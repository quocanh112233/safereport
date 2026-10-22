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
