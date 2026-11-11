/**
 * Headless walk through the app at phone size: takes screenshots and prints what each screen says.
 * Run: node scripts/routing-v2/screens.mjs [scenario]     (output in .taste-skill/v2/, git-ignored)
 * Needs Chrome or Edge installed. Uses the DevTools protocol directly, no extra dependency.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';

const BROWSERS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const PORT = 5187;
const DEBUG_PORT = 9237;
const OUT = path.resolve('.taste-skill/v2');
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2, mobile: true };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Each step: [label, action]. Actions run in the page. `click:Text` clicks the first control containing the text. */
const SCENARIOS = {
  default: [
    ['01-home', null],
    ['02-results', 'click:Cari Rute'],
    ['03-journey', 'clickCard'],
  ]
};

async function connect() {
  for (let i = 0; i < 50; i++) {
    await sleep(200);
    try {
      const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
  }
  throw new Error('Could not reach the browser');
}

function cdp(ws) {
  let id = 0;
  const waiting = new Map();
  const events = [];
  ws.addEventListener('message', e => {
    const msg = JSON.parse(e.data);
    if (msg.id && waiting.has(msg.id)) { waiting.get(msg.id)(msg.result ?? msg.error); waiting.delete(msg.id); }
    else if (msg.method === 'Runtime.exceptionThrown') events.push('EXCEPTION ' + (msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text));
    else if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
      events.push(msg.params.type.toUpperCase() + ' ' + msg.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 300));
    }
  });
  const send = (method, params = {}) => new Promise(resolve => { waiting.set(++id, resolve); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value;
  return { send, evaluate, events };
}

const PAGE_HELPERS = `
  window.__click = text => {
    const all = [...document.querySelectorAll('button, [role=button], a')];
    const el = all.find(e => e.innerText && e.innerText.includes(text));
    if (!el) return 'NOT FOUND: ' + text;
    el.click(); return 'clicked ' + text;
  };
  window.__clickCard = () => {
    const el = document.querySelector('main [role=button], main [tabindex="0"], main .cursor-pointer');
    if (!el) return 'NO CARD';
    el.click(); return 'clicked card';
  };
`;

async function main() {
  const scenario = SCENARIOS[process.argv[2] ?? 'default'];
  const browser = BROWSERS.find(p => fs.existsSync(p));
  if (!browser) throw new Error('No Chrome or Edge found');
  fs.mkdirSync(OUT, { recursive: true });

  const server = await createServer({ logLevel: 'error', server: { port: PORT, strictPort: true } });
  await server.listen();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'tj-screens-'));
  const proc = spawn(browser, ['--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank']);
  try {
    const ws = new WebSocket(await connect());
    await new Promise(r => ws.addEventListener('open', r));
    const { send, evaluate, events } = cdp(ws);
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', VIEWPORT);
    await send('Page.navigate', { url: `http://localhost:${PORT}/` });
    for (let i = 0; i < 60; i++) {
      await sleep(250);
      if (await evaluate(`document.body.innerText.includes('Cari Rute')`)) break;
    }
    await sleep(1500);
    await evaluate(PAGE_HELPERS);

    for (const [label, action] of scenario) {
      if (action) {
        const expr = action === 'clickCard' ? 'window.__clickCard()' : `window.__click(${JSON.stringify(action.slice(6))})`;
        console.log(`  action ${action}: ${await evaluate(expr)}`);
        await sleep(1200);
      }
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(OUT, `${label}.png`), Buffer.from(shot.data, 'base64'));
      const text = await evaluate('document.body.innerText');
      console.log(`\n=== ${label} ===\n${String(text).split('\n').filter(l => l.trim()).join(' | ').slice(0, 1400)}`);
    }
    if (events.length) console.log('\nCONSOLE PROBLEMS:\n' + [...new Set(events)].slice(0, 15).join('\n'));
    ws.close();
  } finally {
    proc.kill();
    await server.close();
  }
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
