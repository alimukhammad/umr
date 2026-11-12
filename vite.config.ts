import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Writes dist/sw.js after the build, with the list of files to keep offline.
 * Latin Extended fonts (only needed for the 2027 alphabet) are cached when first used instead.
 */
function serviceWorker(): Plugin {
  let outDir = 'dist';
  return {
    name: 'umr-service-worker',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir;
    },
    closeBundle() {
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const f of readdirSync(dir)) {
          const p = join(dir, f);
          if (statSync(p).isDirectory()) walk(p);
          else files.push('/' + relative(outDir, p).split('\\').join('/'));
        }
      };
      walk(outDir);
      const precache = files.filter(
        (f) =>
          !/^\/(sw\.js|CNAME|\.well-known\/)/.test(f) && !/\.(txt|map)$/.test(f) && !/latin-ext/.test(f) && f !== '/index.html' && f !== '/policy/index.html',
      );
      const version = Date.now().toString(36);
      const tpl = SW_TEMPLATE.replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(['/', '/policy/', ...precache], null, 1));
      writeFileSync(join(outDir, 'sw.js'), tpl);
    },
  };
}

const SW_TEMPLATE = `// Umr service worker (generated at build time). Keeps the app working offline.
// Umr has no API: notes and birth dates live in the browser's own storage, never in this cache.
const CACHE = 'umr-__VERSION__';
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('umr-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Only this site's own files. Email sign-up (Google) and payment links pass straight through.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Pages: try the network for the newest version, fall back to the saved copy.
  // The app lives at '/', the privacy policy at '/policy/'; each is saved under its own key.
  if (req.mode === 'navigate') {
    const key = /^\/policy\/?$/.test(url.pathname) ? '/policy/' : '/';
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(key, copy));
          }
          return res;
        })
        .catch(() => caches.match(key).then((hit) => hit || caches.match('/'))),
    );
    return;
  }

  // Files: saved copy first, otherwise fetch and save it.
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
`;

// `npm run build` makes the static site for GitHub Pages, with the service worker.
// `npm run build:single` makes one self-contained index.html for sharing as a test link (no service worker).
export default defineConfig(({ mode }) => ({
  plugins: mode === 'single' ? [react(), viteSingleFile()] : [react(), serviceWorker()],
  // The single-file test build is served from a sub-path, so it loads public/ files relatively.
  base: mode === 'single' ? './' : '/',
  define: { __PWA__: JSON.stringify(mode !== 'single') },
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    // The privacy policy is a plain page of its own at /policy/, readable without the app.
    rollupOptions: mode === 'single' ? undefined : { input: { main: resolve(__dirname, 'index.html'), policy: resolve(__dirname, 'policy/index.html') } },
  },
  test: { environment: 'node' },
}));
