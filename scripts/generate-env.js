const fs = require('fs');
const path = require('path');
require('dotenv').config();

const outDir = path.join(__dirname, '..', 'src', 'app', 'config');
fs.mkdirSync(outDir, { recursive: true });

// Prefer a relative path so the domain is not embedded in the frontend bundle.
// Use dev/prod reverse proxies to route '/api' to the actual backend.
const apiBaseUrl = process.env.API_BASE_URL || '/api';

const content = `export const AppEnv = {\n  API_BASE_URL: '${apiBaseUrl}'\n};\n`;

fs.writeFileSync(path.join(outDir, 'env.ts'), content, 'utf8');
console.log('Generated AppEnv at src/app/config/env.ts');

// Also update dev proxy for '/login' to use URL from .env when available.
try {
  const proxyPath = path.join(__dirname, '..', 'proxy.conf.json');
  const raw = fs.readFileSync(proxyPath, 'utf8');
  const proxy = JSON.parse(raw);

  // Prefer a dedicated env var; fall back to API_BASE_URL if it is absolute.
  let loginTarget = process.env.LOGIN_PROXY_TARGET || process.env.LOGIN_URL || process.env.API_BASE_URL;

  const isAbsoluteUrl = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);
  if (isAbsoluteUrl(loginTarget)) {
    proxy['/login'] = proxy['/login'] || {};
    proxy['/login'].target = loginTarget;
    proxy['/login'].changeOrigin = true;
    proxy['/login'].logLevel = proxy['/login'].logLevel || 'debug';
    // Toggle 'secure' based on protocol
    proxy['/login'].secure = /^https:\/\//i.test(loginTarget);
    // Keep existing headers if present; otherwise set a sane default Origin
    proxy['/login'].headers = proxy['/login'].headers || { Origin: 'http://localhost:4200' };

    fs.writeFileSync(proxyPath, JSON.stringify(proxy, null, 2) + "\n", 'utf8');
    console.log(`Updated proxy.conf.json '/login' target -> ${loginTarget}`);
  } else {
    console.log("Skipped updating '/login' proxy target: env value is not an absolute URL.");
  }
} catch (err) {
  console.warn('Could not update proxy.conf.json from .env:', err.message);
}