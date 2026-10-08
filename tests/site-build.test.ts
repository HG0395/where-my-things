import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

// Run after npm run build: verify actual deployment artifacts, not source templates.
test('Pages deploys compiled assets and public pages contain navigation without JavaScript', async () => {
  const root = await readFile('dist/index.html', 'utf8');
  assert.ok(root.includes('새로고침'));
  assert.ok(root.includes('href="/app/"'));
  assert.ok(!root.includes('/src/main.tsx'));
  for (const route of ['', 'guide/', 'ai-guide/', 'privacy/', 'about/']) {
    for (const language of ['', 'en/']) {
      const html = await readFile(`dist/${language}${route}index.html`, 'utf8');
      assert.ok(html.includes('<main>'));
      assert.ok(html.includes('<section>'));
      assert.ok(html.includes('rel="canonical"'));
      assert.ok(html.includes('hreflang="en"'));
      assert.ok(!html.includes('<script'));
      const links = [...html.matchAll(/href="(\/[^"?#]*)"/g)].map(m => m[1]);
      for (const path of links) await access(`dist${path}${path.endsWith('/') ? 'index.html' : ''}`);
    }
  }
  const app = await readFile('dist/app/index.html', 'utf8');
  const assets = [...app.matchAll(/(?:src|href)="(\/assets\/[^" ]+)"/g)].map(m => m[1]);
  assert.ok(assets.length >= 2);
  assert.ok(app.includes('noindex'));
  for (const path of assets) await access(`dist${path}`);
  const sitemap = await readFile('dist/sitemap.xml', 'utf8');
  assert.equal([...sitemap.matchAll(/<loc>/g)].length, 10);
  assert.ok(!sitemap.includes('/app/'));
  assert.ok((await readFile('dist/404.html', 'utf8')).includes('noindex'));
});
