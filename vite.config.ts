import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import pkg from './package.json' with { type: 'json' };

/** Files under public/ that ship with the app (progress.* are level-tool artifacts). */
function publicFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const rel = join(dir, e.name).replaceAll('\\', '/');
    if (e.isDirectory()) out.push(...publicFiles(rel));
    else if (!/^progress\./.test(e.name)) out.push(rel.replace(/^public\//, ''));
  }
  return out;
}

const SW_SOURCE = `// Generated at build time — precache list + version are baked in.
const VERSION = '__VERSION__';
const CACHE = 'angrybots-' + VERSION;
const FILES = __FILES__;
const scope = new URL(self.registration.scope);
const ROOT = scope.origin + scope.pathname;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(FILES.map((f) => ROOT + f)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('angrybots-') && k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || !url.pathname.startsWith(scope.pathname)) return;
  const rel = url.pathname.slice(scope.pathname.length);
  const isIndex = req.mode === 'navigate' || rel === '' || rel === 'index.html';
  if (isIndex) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(ROOT + 'index.html', res.clone()));
          return res;
        })
        .catch(() => caches.match(ROOT + 'index.html'))
    );
    return;
  }
  // Match by URL string: browser request objects carry headers that can fail the
  // cache's Vary check against entries stored by addAll.
  e.respondWith(
    caches.match(url.href).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(url.href, res.clone()));
          return res;
        })
    )
  );
});
`;

/** Emits a hand-written service worker whose precache list covers every built asset
 *  plus public/ files; cache version derives from the build's content hashes. */
function swPlugin(): Plugin {
  return {
    name: 'angrybots-sw',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const files = [...Object.keys(bundle), 'index.html', ...publicFiles('public')].filter(
        (f) => !f.endsWith('.map')
      );
      const version = createHash('sha256')
        .update(
          files
            .sort()
            .map((f) => {
              const out = bundle[f];
              return f + (out?.type === 'chunk' ? out.code : '');
            })
            .join()
        )
        .digest('hex')
        .slice(0, 12);
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: SW_SOURCE.replace('__VERSION__', version).replace(
          '__FILES__',
          JSON.stringify(files.sort())
        ),
      });
    },
  };
}

export default defineConfig({
  base: process.env.GITHUB_PAGES === '1' ? '/angrybots/' : '/',
  plugins: [swPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/]three[\\/]/ },
            { name: 'planck', test: /node_modules[\\/]planck[\\/]/ },
          ],
        },
      },
    },
  },
});
