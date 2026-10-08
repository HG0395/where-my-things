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
      assert.equal([...html.matchAll(/<script\b/g)].length, 1);
      const head = html.split('</head>')[0];
      assert.ok(head.includes('<meta name="google-adsense-account" content="ca-pub-2685311477810917">'));
      assert.ok(head.includes('<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2685311477810917" crossorigin="anonymous"></script>'));
      const links = [...html.matchAll(/href="(\/[^"?#]*)"/g)].map(m => m[1]);
      for (const path of links) await access(`dist${path}${path.endsWith('/') ? 'index.html' : ''}`);
    }
  }
  const app = await readFile('dist/app/index.html', 'utf8');
  const assets = [...app.matchAll(/(?:src|href)="(\/assets\/[^" ]+)"/g)].map(m => m[1]);
  assert.ok(assets.length >= 2);
  assert.ok(app.includes('noindex'));
  assert.ok(!app.includes('adsbygoogle.js'));
  assert.ok(app.includes('name="google-adsense-account"'));
  for (const path of assets) await access(`dist${path}`);
  const sitemap = await readFile('dist/sitemap.xml', 'utf8');
  assert.equal([...sitemap.matchAll(/<loc>/g)].length, 10);
  assert.ok(!sitemap.includes('/app/'));
  const errorPage = await readFile('dist/404.html', 'utf8');
  assert.ok(errorPage.includes('noindex'));
  assert.ok(!errorPage.includes('adsbygoogle.js'));
  assert.equal((await readFile('dist/ads.txt', 'utf8')).trim(), 'google.com, pub-2685311477810917, DIRECT, f08c47fec0942fa0');
});
