import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { createServer } from 'vite';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.resolve('.taste-skill/audit');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function run() {
  console.log('[Audit] Starting Vite server...');
  const viteServer = await createServer({
    server: {
      port: 5174,
      watch: { ignored: ['**/.taste-skill/**', '**/scripts/**'] }
    }
  });
  await viteServer.listen();
  const serverUrl = 'http://localhost:5174';
  console.log(`[Audit] Vite server listening at ${serverUrl}`);

  const tempProfile = path.join(os.tmpdir(), `chrome-audit-${Date.now()}`);
  if (!fs.existsSync(tempProfile)) {
    fs.mkdirSync(tempProfile, { recursive: true });
  }

  console.log('[Audit] Launching Chrome headless with CDP...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9225',
    `--user-data-dir=${tempProfile}`,
    '--no-first-run',
    '--disable-gpu',
    '--hide-scrollbars',
    'about:blank'
  ]);

  // Wait for CDP endpoint
  let pageWsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch('http://127.0.0.1:9225/json/list');
      if (res.ok) {
        const list = await res.json();
        if (list.length > 0 && list[0].webSocketDebuggerUrl) {
          pageWsUrl = list[0].webSocketDebuggerUrl;
          break;
        }
      }
    } catch {}
  }

  if (!pageWsUrl) {
    throw new Error('Failed to connect to Chrome CDP');
  }

  console.log('[Audit] Connecting WebSocket to CDP...');
  const ws = new WebSocket(pageWsUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));

  let reqId = 1;
  const pendingRequests = new Map();

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pendingRequests.has(msg.id)) {
      const { resolve, reject } = pendingRequests.get(msg.id);
      pendingRequests.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  });

  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = reqId++;
      pendingRequests.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await sendCommand('Page.enable');
  await sendCommand('DOM.enable');

  async function setViewport(width, height, isMobile = false) {
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: isMobile
    });
  }

  async function setColorScheme(scheme) {
    await sendCommand('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: scheme }]
    });
  }

  async function evalJs(expr) {
    return await sendCommand('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true
    });
  }

  async function capture(filename) {
    await new Promise(r => setTimeout(r, 600)); // settle animation
    const { data } = await sendCommand('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(data, 'base64');
    const outPath = path.join(OUT_DIR, filename);
    fs.writeFileSync(outPath, buffer);
    console.log(`[Audit] Captured: ${filename}`);
  }

  // Load app
  console.log('[Audit] Navigating to app...');
  await sendCommand('Page.navigate', { url: serverUrl });
  await new Promise(r => setTimeout(r, 1500));

  // 1. Home 390 Light
  await setViewport(390, 844, true);
  await setColorScheme('light');
  await capture('home-390-light.png');

  // 2. Home 390 Dark
  await setColorScheme('dark');
  await capture('home-390-dark.png');
  await setColorScheme('light');

  // 3. ID/EN Toggle
  await evalJs(`
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'EN' || b.textContent.trim() === 'ID');
    if (btn) btn.click();
  `);
  await capture('home-en-390-light.png');
  // Toggle back to ID
  await evalJs(`
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'EN' || b.textContent.trim() === 'ID');
    if (btn) btn.click();
  `);

  // 4. Stop Picker Modal
  await evalJs(`
    const originCard = document.querySelector('[role="button"]');
    if (originCard) originCard.click();
  `);
  await capture('picker-390-light.png');
  await setColorScheme('dark');
  await capture('picker-390-dark.png');
  await setColorScheme('light');
  // Close picker
  await evalJs(`
    const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Batal') || b.textContent.includes('Cancel'));
    if (cancelBtn) cancelBtn.click();
  `);
  await new Promise(r => setTimeout(r, 400));

  // 5. Results Screen (Default Tebet -> Tosari)
  await evalJs(`
    const searchBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cari Rute') || b.textContent.includes('Search'));
    if (searchBtn) searchBtn.click();
  `);
  await new Promise(r => setTimeout(r, 1200));
  await capture('results-390-light.png');
  await setColorScheme('dark');
  await capture('results-390-dark.png');
  await setColorScheme('light');

  // 6. Journey Detail Screen
  await evalJs(`
    const cards = document.querySelectorAll('main [role="button"]');
    if (cards.length > 0) cards[0].click();
  `);
  await new Promise(r => setTimeout(r, 800));
  await capture('detail-390-light.png');
  await setColorScheme('dark');
  await capture('detail-390-dark.png');
  await setColorScheme('light');

  // 7. Live Radar Screen
  await evalJs(`
    const radarBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Radar'));
    if (radarBtn) radarBtn.click();
  `);
  await new Promise(r => setTimeout(r, 800));
  await capture('radar-390-light.png');
  await setColorScheme('dark');
  await capture('radar-390-dark.png');
  await setColorScheme('light');

  // Return to home
  await evalJs(`
    const backBtn = document.querySelector('header button');
    if (backBtn) backBtn.click();
  `);
  await new Promise(r => setTimeout(r, 400));

  // 8. Multi-leg Trip: Tebet -> Bundaran HI
  console.log('[Audit] Testing multi-leg trip Tebet -> Bundaran HI...');
  await sendCommand('Page.navigate', { url: serverUrl });
  await new Promise(r => setTimeout(r, 1200));

  // Open dest picker, search Bundaran HI, select MRT
  await evalJs(`
    const cards = document.querySelectorAll('[role="button"]');
    if (cards[1]) cards[1].click(); // destination card
  `);
  await new Promise(r => setTimeout(r, 500));
  await evalJs(`
    const input = document.querySelector('input');
    if (input) {
      input.value = 'Bundaran HI';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await evalJs(`
    const firstRow = document.querySelector('.overflow-y-auto [role="button"]');
    if (firstRow) firstRow.click();
  `);
  await new Promise(r => setTimeout(r, 600));
  // Search
  await evalJs(`
    const searchBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cari Rute'));
    if (searchBtn) searchBtn.click();
  `);
  await new Promise(r => setTimeout(r, 1200));
  await capture('results-multileg-390.png');

  // Detail for multi-leg
  await evalJs(`
    const cards = document.querySelectorAll('main [role="button"]');
    if (cards.length > 0) cards[0].click();
  `);
  await new Promise(r => setTimeout(r, 800));
  await capture('detail-multileg-390.png');

  // 9. Same-stop Alert
  console.log('[Audit] Testing same-stop state...');
  await sendCommand('Page.navigate', { url: serverUrl });
  await new Promise(r => setTimeout(r, 1200));
  await evalJs(`
    const cards = document.querySelectorAll('[role="button"]');
    if (cards[1]) cards[1].click(); // dest
  `);
  await new Promise(r => setTimeout(r, 500));
  await evalJs(`
    const input = document.querySelector('input');
    if (input) {
      input.value = 'Tebet';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await evalJs(`
    const firstRow = document.querySelector('.overflow-y-auto [role="button"]');
    if (firstRow) firstRow.click();
  `);
  await new Promise(r => setTimeout(r, 600));
  await capture('results-sameplace-390.png');

  // 10. No-route State: Pegangsaan Dua -> Ragunan
  console.log('[Audit] Testing no-route state Pegangsaan Dua -> Ragunan...');
  await sendCommand('Page.navigate', { url: serverUrl });
  await new Promise(r => setTimeout(r, 1200));
  // Origin Pegangsaan Dua
  await evalJs(`
    const cards = document.querySelectorAll('[role="button"]');
    if (cards[0]) cards[0].click();
  `);
  await new Promise(r => setTimeout(r, 500));
  await evalJs(`
    const input = document.querySelector('input');
    if (input) {
      input.value = 'Pegangsaan';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await evalJs(`
    const firstRow = document.querySelector('.overflow-y-auto [role="button"]');
    if (firstRow) firstRow.click();
  `);
  await new Promise(r => setTimeout(r, 500));

  // Dest Ragunan
  await evalJs(`
    const cards = document.querySelectorAll('[role="button"]');
    if (cards[1]) cards[1].click();
  `);
  await new Promise(r => setTimeout(r, 500));
  await evalJs(`
    const input = document.querySelector('input');
    if (input) {
      input.value = 'Ragunan';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  `);
  await new Promise(r => setTimeout(r, 600));
  await evalJs(`
    const firstRow = document.querySelector('.overflow-y-auto [role="button"]');
    if (firstRow) firstRow.click();
  `);
  await new Promise(r => setTimeout(r, 500));

  // Search
  await evalJs(`
    const searchBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cari Rute'));
    if (searchBtn) searchBtn.click();
  `);
  await new Promise(r => setTimeout(r, 1200));
  await capture('results-noroute-390.png');

  // 11. Desktop 1440
  console.log('[Audit] Testing Desktop 1440px...');
  await sendCommand('Page.navigate', { url: serverUrl });
  await new Promise(r => setTimeout(r, 1200));
  await setViewport(1440, 900, false);
  await setColorScheme('light');
  await capture('home-1440-light.png');

  await evalJs(`
    const searchBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cari Rute'));
    if (searchBtn) searchBtn.click();
  `);
  await new Promise(r => setTimeout(r, 1000));
  await capture('results-1440-light.png');

  // Cleanup
  console.log('[Audit] Shutting down browser and dev server...');
  ws.close();
  chromeProc.kill('SIGKILL');
  await viteServer.close();
  console.log('[Audit] Visual audit complete. All screenshots generated.');
}

run().catch(err => {
  console.error('[Audit Error]', err);
  process.exit(1);
});
