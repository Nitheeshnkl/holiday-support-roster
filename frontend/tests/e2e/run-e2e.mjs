import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  TestSuiteRunner,
  ensureDevServer,
  loadPlaywright,
} from './lib/harness.mjs';
import { runTier1Screens } from './tier1-screens.mjs';
import { runTier2Boundaries } from './tier2-boundaries.mjs';
import { runTier3Journeys } from './tier3-journeys.mjs';
import { runTier4ResponsiveA11y } from './tier4-responsive-a11y.mjs';

function parseArgs(argv) {
  const opts = {
    tier: 'all',
    baseUrl: 'http://127.0.0.1:4173',
    noServer: false,
    screenshotsDir: null,
    jsonPath: null,
    headed: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--tier' && argv[i + 1]) {
      opts.tier = argv[++i].toLowerCase();
    } else if (arg.startsWith('--tier=')) {
      opts.tier = arg.slice('--tier='.length).toLowerCase();
    } else if (arg === '--base-url' && argv[i + 1]) {
      opts.baseUrl = argv[++i];
    } else if (arg.startsWith('--base-url=')) {
      opts.baseUrl = arg.slice('--base-url='.length);
    } else if (arg === '--no-server') {
      opts.noServer = true;
    } else if (arg === '--screenshots-dir' && argv[i + 1]) {
      opts.screenshotsDir = path.resolve(argv[++i]);
    } else if (arg.startsWith('--screenshots-dir=')) {
      opts.screenshotsDir = path.resolve(arg.slice('--screenshots-dir='.length));
    } else if (arg === '--json' && argv[i + 1]) {
      opts.jsonPath = path.resolve(argv[++i]);
    } else if (arg.startsWith('--json=')) {
      opts.jsonPath = path.resolve(arg.slice('--json='.length));
    } else if (arg === '--headed') {
      opts.headed = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node frontend/tests/e2e/run-e2e.mjs [options]
  --tier <1|2|3|4|all>        Tier to execute (default: all)
  --base-url <url>            Preview server URL (default: http://127.0.0.1:4173)
  --no-server                 Do not spawn dev-preview.mjs; expect running server
  --screenshots-dir <path>    Directory for Tier 4 visual evidence PNGs
  --json <path>               Write structured JSON report to path
  --headed                    Run Chromium in headed mode`);
      process.exit(0);
    } else {
      throw new Error(`Unknown CLI argument: ${arg}`);
    }
  }

  if (!['1', '2', '3', '4', 'all'].includes(opts.tier)) {
    throw new Error(`Invalid --tier "${opts.tier}". Expected 1, 2, 3, 4, or all.`);
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { chromium } = await loadPlaywright();

  let serverHandle = null;
  let browser = null;

  const cleanup = async () => {
    if (browser) {
      await browser.close().catch(() => {});
      browser = null;
    }
    if (serverHandle) {
      await serverHandle.stop().catch(() => {});
      serverHandle = null;
    }
  };

  const onSignal = async (sig) => {
    console.error(`\nReceived ${sig}; cleaning up browser and preview server...`);
    await cleanup();
    process.exit(130);
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  try {
    serverHandle = await ensureDevServer({ baseUrl: opts.baseUrl, noServer: opts.noServer });
    console.log(`E2E Target: ${serverHandle.baseUrl} (ownedServer=${serverHandle.owned})`);

    browser = await chromium.launch({ headless: !opts.headed });
    const runner = new TestSuiteRunner();
    const ctx = {
      browser,
      baseUrl: serverHandle.baseUrl,
      screenshotsDir: opts.screenshotsDir,
    };

    const runAll = opts.tier === 'all';
    if (runAll || opts.tier === '1') await runTier1Screens(runner, ctx);
    if (runAll || opts.tier === '2') await runTier2Boundaries(runner, ctx);
    if (runAll || opts.tier === '3') await runTier3Journeys(runner, ctx);
    if (runAll || opts.tier === '4') await runTier4ResponsiveA11y(runner, ctx);

    const summary = runner.summary();
    console.log(`\n=== E2E Summary: ${summary.passed}/${summary.total} passed, ${summary.failed} failed ===`);

    if (opts.jsonPath) {
      await fs.mkdir(path.dirname(opts.jsonPath), { recursive: true });
      await fs.writeFile(
        opts.jsonPath,
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            baseUrl: serverHandle.baseUrl,
            tier: opts.tier,
            ...summary,
          },
          null,
          2
        )
      );
      console.log(`JSON report written to ${opts.jsonPath}`);
    }

    process.exitCode = summary.failed === 0 ? 0 : 1;
  } finally {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    await cleanup();
  }
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
