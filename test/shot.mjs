// test/shot.mjs — nutzt playwright-core aus dem Codex-Runtime + gecachtes Chromium (kein npm nötig)
// playwright-core: per npm installiert oder Pfad zu einer vorhandenen Installation via PLAYWRIGHT_CORE.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const BIN = process.env.BIN || `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const browser = await chromium.launch({ executablePath: BIN, headless: true, args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 520, height: 900 } });
const errors = [];
const logs = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); else logs.push(m.text()); });
await page.goto('file://' + path.join(here, 'harness.html'));
await page.waitForTimeout(500);
if (process.argv[2]) { await page.evaluate(`(async () => { ${process.argv[2]} })()`); await page.waitForTimeout(400); }
await page.screenshot({ path: path.join(here, 'harness.png') });
const text = await page.evaluate(() => [...(document.getElementById('card').shadowRoot?.children || [])].filter(n => n.tagName !== 'STYLE').map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim());
console.log('TEXT:', text.slice(0, 600));
console.log('LOG:', logs.filter(l => !l.startsWith('subscribe')).join(' | '));
console.log('ERRORS:', errors);
await browser.close();
process.exit(errors.length ? 1 : 0);
