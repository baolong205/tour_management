import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const configure = require('../mobile/app.config.js');

function withEnv(values, run) {
  const before = { ...process.env };
  try {
    delete process.env.EXPO_PUBLIC_API_URL;
    delete process.env.EAS_PROJECT_ID;
    delete process.env.EAS_BUILD_PROFILE;
    Object.assign(process.env, values);
    return run();
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key];
    Object.assign(process.env, before);
  }
}

test('APK submission rejects missing, insecure and local API endpoints', () => {
  for (const profile of ['preview', 'production']) {
    for (const url of ['', 'http://api.example.com/api', 'https://localhost/api', 'https://192.168.1.2/api', 'https://10.0.2.2/api', 'https://api.example.com', 'https://user:pass@api.example.com/api', 'https://api.example.com/api?token=secret']) {
      withEnv({ EAS_BUILD_PROFILE: profile, EXPO_PUBLIC_API_URL: url }, () => {
        assert.throws(() => configure({ config: {} }), /public HTTPS/);
      });
    }
  }
});

test('APK uses HTTPS and preserves the Expo project ID and plugins', () => {
  withEnv({ EAS_BUILD_PROFILE: 'preview', EXPO_PUBLIC_API_URL: 'https://tourgo-api.onrender.com/api', EAS_PROJECT_ID: 'test-project' }, () => {
    const config = configure({ config: { plugins: ['expo-router'], extra: { existing: true } } });
    assert.equal(config.extra.eas.projectId, 'test-project');
    assert.equal(config.extra.existing, true);
    assert.deepEqual(config.plugins, ['expo-router', ['expo-build-properties', { android: { usesCleartextTraffic: false } }]]);
  });
});

test('local development still accepts HTTP LAN endpoints', () => {
  withEnv({ EXPO_PUBLIC_API_URL: 'http://192.168.1.2:3000/api' }, () => {
    assert.equal(configure({ config: {} }).plugins[0][1].android.usesCleartextTraffic, true);
  });
});

test('Vercel rewrites client routes, not assets or unavailable API endpoints', () => {
  const config = JSON.parse(readFileSync(new URL('../frontend/vercel.json', import.meta.url), 'utf8'));
  const route = new RegExp(`^${config.rewrites[0].source}$`);
  for (const path of ['/', '/tours', '/tours/ha-long', '/admin/users', '/payment/123']) assert.ok(route.test(path), path);
  for (const path of ['/api', '/api/tours', '/uploads/file.jpg', '/assets/main.js', '/images/tour.jpg', '/favicon.svg']) assert.ok(!route.test(path), path);
});