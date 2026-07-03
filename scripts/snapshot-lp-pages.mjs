import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const LP_OLD_DELIVERABLE_TEXT = '司会台本（Wordファイル）';
const LP_NEW_DELIVERABLE_TEXTS = ['進行台本', '幹事メモ', '会場ご提案資料'];
const SNAPSHOT_ROUTES = [
  '/lawyer/',
  '/tax-accountant/',
  '/sharoshi/',
  '/gyosei/',
  '/fudosan-kantei/',
  '/lawyer/v2/',
];

const dist = join(fileURLToPath(new URL('../dist', import.meta.url)));
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.css': 'text/css',
};

function resolveDistFile(distDir, pathname) {
  const relative = decodeURIComponent(pathname).replace(/^\/+/, '');
  let filePath = join(distDir, relative);
  if (!existsSync(filePath)) return null;
  if (statSync(filePath).isDirectory()) filePath = join(filePath, 'index.html');
  return existsSync(filePath) ? filePath : null;
}

function finalizeStaticHtml(html) {
  let result = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  result = result.replace(/<\/?x-dc\b[^>]*>/gi, '');
  result = result.replace(/<\/?helmet\b[^>]*>/gi, '');
  if (!/^\s*<!doctype/i.test(result)) result = `<!DOCTYPE html>\n${result}`;
  return result;
}

function startDistServer(distDir) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const filePath = resolveDistFile(distDir, url.pathname);
      if (!filePath) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream',
      });
      res.end(readFileSync(filePath));
    });
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to bind static server'));
        return;
      }
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
    server.on('error', reject);
  });
}

async function captureRenderedHtml(browser, pageUrl, expectV3Deliverables) {
  const page = await browser.newPage();
  try {
    await page.goto(pageUrl, { waitUntil: 'load', timeout: 120_000 });
    if (expectV3Deliverables) {
      await page.waitForFunction(
        () => {
          const body = document.body?.innerText ?? '';
          return (
            body.includes('進行台本') &&
            body.includes('会場ご提案資料') &&
            !body.includes('司会台本（Wordファイル）')
          );
        },
        { timeout: 120_000 },
      );
      await page.waitForTimeout(1_000);
    } else {
      await page.waitForTimeout(3_000);
    }
    const html = await page.evaluate(() => {
      const runtime = document.getElementById('codex-lp-runtime-style');
      const adjustments = document.getElementById('codex-lp-adjustments-style');
      if (runtime && adjustments && runtime.textContent) {
        adjustments.textContent = runtime.textContent;
        runtime.remove();
      }
      document.querySelectorAll('[id^="__bundler"]').forEach((node) => node.remove());
      return `<!DOCTYPE html>\n${document.documentElement.outerHTML}`;
    });
    return finalizeStaticHtml(html);
  } finally {
    await page.close();
  }
}

const { server, baseUrl } = await startDistServer(dist);
const browser = await chromium.launch();
try {
  for (const route of SNAPSHOT_ROUTES) {
    const expectV3 = route !== '/lawyer/v2/';
    console.log(`snapshot ${route} ...`);
    const html = await captureRenderedHtml(browser, `${baseUrl}${route}`, expectV3);
    if (expectV3) {
      if (html.includes(LP_OLD_DELIVERABLE_TEXT)) {
        throw new Error(`Old text remains in ${route}`);
      }
      for (const text of LP_NEW_DELIVERABLE_TEXTS) {
        if (!html.includes(text)) throw new Error(`Missing "${text}" in ${route}`);
      }
    }
    const outputPath = resolveDistFile(dist, route);
    writeFileSync(outputPath, html, 'utf8');
    console.log(`wrote ${outputPath} (${html.length} bytes)`);
  }
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
}
