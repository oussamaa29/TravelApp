import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { createApp } from './app.js';

let server;
let base;
const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'travelmate-'));

before(async () => {
  server = createApp({ uploadDir, secret: 'secret-de-test' }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  fs.rmSync(uploadDir, { recursive: true, force: true });
});

const json = (method, url, body, token) =>
  fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

let counter = 0;
async function register() {
  const email = `voyageur${++counter}@exemple.fr`;
  const res = await json('POST', '/auth/register', { email, password: 'secret123', name: 'Voyageur' });
  assert.equal(res.status, 201);
  return { email, ...(await res.json()) };
}

const TRIP = { title: 'Japon', destination: 'Tokyo, Japon', startDate: '2027-04-01', endDate: '2027-04-15' };

describe('authentification', () => {
  test("l'inscription renvoie l'utilisateur et des jetons au format attendu par l'app", async () => {
    const { user, accessToken, refreshToken, expiresIn } = await register();
    assert.equal(user.name, 'Voyageur');
    assert.deepEqual(user.roles, ['user']);
    assert.ok(refreshToken);
    assert.equal(expiresIn, 900);
    // l'app lit l'expiration dans le JWT (utils/auth.ts)
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString());
    assert.ok(payload.exp > Date.now() / 1000);
  });

  test('email déjà utilisé : 409', async () => {
    const { email } = await register();
    const res = await json('POST', '/auth/register', { email, password: 'secret123', name: 'Autre' });
    assert.equal(res.status, 409);
  });

  test('connexion : bon puis mauvais mot de passe', async () => {
    const { email } = await register();
    assert.equal((await json('POST', '/auth/login', { email, password: 'secret123' })).status, 200);
    const bad = await json('POST', '/auth/login', { email, password: 'faux' });
    assert.equal(bad.status, 401);
    assert.ok((await bad.json()).error);
  });

  test('le jeton de rafraîchissement ne sert qu’une fois', async () => {
    const { refreshToken } = await register();
    const first = await json('POST', '/auth/refresh', { refreshToken });
    assert.equal(first.status, 200);
    assert.ok((await first.json()).accessToken);
    assert.equal((await json('POST', '/auth/refresh', { refreshToken })).status, 401);
  });

  test('la déconnexion révoque les jetons de rafraîchissement', async () => {
    const { accessToken, refreshToken } = await register();
    assert.equal((await json('POST', '/auth/logout', undefined, accessToken)).status, 204);
    assert.equal((await json('POST', '/auth/refresh', { refreshToken })).status, 401);
  });

  test('un jeton falsifié est refusé', async () => {
    const { accessToken } = await register();
    const [h, , s] = accessToken.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'autre', exp: 9999999999 })).toString('base64url');
    assert.equal((await json('GET', '/trips', undefined, `${h}.${forged}.${s}`)).status, 401);
  });
});

describe('voyages', () => {
  test('sans jeton : 401', async () => {
    assert.equal((await json('GET', '/trips')).status, 401);
    assert.equal((await json('POST', '/trips', TRIP)).status, 401);
  });

  test('chaque utilisateur ne voit que ses voyages', async () => {
    const alice = await register();
    const bob = await register();
    const created = await json('POST', '/trips', TRIP, alice.accessToken);
    assert.equal(created.status, 201);
    assert.equal((await created.json()).title, 'Japon');

    assert.equal((await (await json('GET', '/trips', undefined, alice.accessToken)).json()).length, 1);
    assert.deepEqual(await (await json('GET', '/trips', undefined, bob.accessToken)).json(), []);
  });

  test('champs obligatoires et dates vérifiés', async () => {
    const { accessToken } = await register();
    assert.equal((await json('POST', '/trips', { ...TRIP, title: '' }, accessToken)).status, 400);
    assert.equal((await json('POST', '/trips', { ...TRIP, endDate: '2027-03-01' }, accessToken)).status, 400);
    assert.equal((await json('POST', '/trips', { ...TRIP, startDate: 'demain' }, accessToken)).status, 400);
  });
});

describe('photos', () => {
  const send = (blob, name) => {
    const form = new FormData();
    form.append('file', blob, name);
    return fetch(`${base}/uploads`, { method: 'POST', body: form });
  };

  test('une image est enregistrée puis servie', async () => {
    const res = await send(new Blob([Buffer.from('89504e47', 'hex')], { type: 'image/png' }), 'photo.png');
    assert.equal(res.status, 201);
    const { url } = await res.json();
    assert.match(url, /\/uploads\/[0-9a-f-]+\.png$/);
    assert.equal((await fetch(url)).status, 200);
  });

  test("un fichier qui n'est pas une image est refusé", async () => {
    const res = await send(new Blob(['<script>'], { type: 'text/html' }), 'page.html');
    assert.equal(res.status, 400);
  });

  test('une image de plus de 5 Mo est refusée', async () => {
    const res = await send(new Blob([Buffer.alloc(5 * 1024 * 1024 + 1)], { type: 'image/jpeg' }), 'big.jpg');
    assert.equal(res.status, 400);
  });
});
