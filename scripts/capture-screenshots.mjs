/**
 * Storybook Screenshot Capture — serves storybook-static and captures
 * every story as a retina-quality PNG for visual verification.
 */
import { createRequire } from 'module';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, dirname, extname } from 'path';

// Derive global node_modules from the running Node binary
// e.g. .../bin/node → .../lib/node_modules/
const globalModules = join(dirname(dirname(process.execPath)), 'lib', 'node_modules');
const require = createRequire(globalModules + '/');
const { chromium } = require('playwright');
import { mkdir } from 'fs/promises';

const STORYBOOK_DIR = join(
  import.meta.dirname,
  '../apps/desktop/storybook-static',
);
const OUT_DIR = join(import.meta.dirname, '../docs/screenshots');

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

// Stories to capture: [storyId, filename]
const STORIES = [
  // Primitives (original 10)
  ['primitives-button--all-variants', 'button-all-variants'],
  ['primitives-badge--all-variants', 'badge-all-variants'],
  ['primitives-input--all-states', 'input-all-states'],
  ['primitives-slider--default', 'slider-default'],
  ['primitives-switch--with-label', 'switch-with-label'],
  ['primitives-toggle--default', 'toggle-default'],
  ['primitives-popover--default', 'popover-default'],
  ['primitives-scrollarea--vertical', 'scrollarea-vertical'],
  ['primitives-separator--horizontal', 'separator-horizontal'],
  ['primitives-tooltip--top', 'tooltip-top'],
  // Primitives (Round 5 — 17 new)
  ['primitives-dialog--default', 'prim-dialog'],
  ['primitives-alertdialog--confirm-delete', 'prim-alertdialog'],
  ['primitives-accordion--faq', 'prim-accordion'],
  ['primitives-avatar--all-sizes', 'prim-avatar'],
  ['primitives-checkbox--with-label', 'prim-checkbox'],
  ['primitives-radiogroup--default', 'prim-radiogroup'],
  ['primitives-contextmenu--default', 'prim-contextmenu'],
  ['primitives-dropdownmenu--default', 'prim-dropdownmenu'],
  ['primitives-hovercard--user-profile', 'prim-hovercard'],
  ['primitives-tabs--default', 'prim-tabs'],
  ['primitives-card--default', 'prim-card'],
  ['primitives-skeleton--card-layout', 'prim-skeleton'],
  ['primitives-textarea--with-placeholder', 'prim-textarea'],
  ['primitives-select--language-selector', 'prim-select'],
  ['primitives-label--with-input', 'prim-label'],
  ['primitives-typography--headings', 'prim-typography'],
  ['primitives-surface--all-variants', 'prim-surface'],
  // Shell
  ['shell-iconrail--default', 'shell-iconrail'],
  ['shell-contextpanel--files-route', 'shell-contextpanel'],
  ['shell-layoutshell--default', 'shell-layoutshell'],
  // Composites
  ['composites-filenode--default', 'composite-filenode'],
  ['composites-foldernode--open', 'composite-foldernode-open'],
  ['composites-kpicard--with-trend', 'composite-kpicard'],
  ['composites-heatmapgrid--default', 'composite-heatmapgrid'],
  ['composites-settingssection--default', 'composite-settingssection'],
  ['composites-formfield--default', 'composite-formfield'],
  ['composites-searchpanel--default', 'composite-searchpanel'],
  ['composites-outlinepanel--default', 'composite-outlinepanel'],
  ['composites-projectswitcher--default', 'composite-projectswitcher'],
  ['composites-dragresizehandle--default', 'composite-dragresizehandle'],
  // Features
  ['features-editortoolbar--default', 'feature-editor-toolbar'],
  ['features-settingsmodal--default', 'feature-settings-modal'],
  ['features-editorerrorboundary--normal', 'feature-errorboundary-normal'],
  ['features-commandpalette--open', 'feature-commandpalette'],
  ['features-filetree--default', 'feature-filetree'],
  // Features (Round 4)
  ['features-aipanel--with-messages', 'feature-aipanel'],
  ['features-exportdialog--default', 'feature-exportdialog'],
  ['features-versionhistory--default', 'feature-versionhistory'],
  ['features-memorypanel--default', 'feature-memorypanel'],
  // Shell (new Round 3)
  ['shell-statusbar--default', 'shell-statusbar'],
  ['shell-rightpanel--default', 'shell-rightpanel'],
  // Pages
  ['pages-dashboardpage--default', 'page-dashboard'],
  ['pages-editorpage--default', 'page-editor'],
  ['pages-filespage--default', 'page-files'],
  ['pages-settingspage--default', 'page-settings'],
  ['pages-analyticspage--default', 'page-analytics'],
  ['pages-characterspage--default', 'page-characters'],
  ['pages-knowledgegraphpage--default', 'page-knowledgegraph'],
  ['pages-calendarpage--default', 'page-calendar'],
];

async function serve(port) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);
      let filePath = join(STORYBOOK_DIR, url.pathname);
      if (url.pathname.endsWith('/')) filePath = join(filePath, 'index.html');
      try {
        const data = await readFile(filePath);
        const ext = extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(port, () => resolve(server));
  });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const PORT = 9222;
  const server = await serve(PORT);
  console.log(`Serving storybook-static on http://localhost:${PORT}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });

  let captured = 0;
  let failed = 0;

  for (const [storyId, filename] of STORIES) {
    const url = `http://localhost:${PORT}/iframe.html?id=${storyId}&viewMode=story`;
    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      // Wait for any animations to settle
      await page.waitForTimeout(500);

      // Capture just the storybook root element if possible
      const root = page.locator('#storybook-root');
      const isVisible = await root.isVisible().catch(() => false);

      if (isVisible) {
        await root.screenshot({
          path: join(OUT_DIR, `${filename}.png`),
          omitBackground: false,
        });
      } else {
        await page.screenshot({
          path: join(OUT_DIR, `${filename}.png`),
          fullPage: false,
        });
      }

      console.log(`✓ ${filename}`);
      captured++;
    } catch (err) {
      console.error(`✗ ${filename}: ${err.message}`);
      // Still try a full page screenshot as fallback
      try {
        await page.screenshot({
          path: join(OUT_DIR, `${filename}.png`),
          fullPage: false,
        });
        console.log(`  (fallback screenshot saved)`);
        captured++;
      } catch {
        failed++;
      }
    } finally {
      await page.close();
    }
  }

  await browser.close();
  server.close();

  console.log(`\nDone: ${captured} captured, ${failed} failed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
