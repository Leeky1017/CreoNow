/**
 * Issue #195 — KgImpactPreview + ConfirmDialog screenshot capture.
 * Serves the built storybook-static bundle and toggles the `dark` class on
 * the preview frame so we get both light + dark variants for each fixture.
 */
import { createRequire } from "module";
import { createServer } from "http";
import { readFile, mkdir } from "fs/promises";
import { join, dirname, extname } from "path";

const globalModules = join(
  dirname(dirname(process.execPath)),
  "lib",
  "node_modules",
);
const require = createRequire(globalModules + "/");
const { chromium } = require("playwright");

const STORYBOOK_DIR = join(
  import.meta.dirname,
  "../apps/desktop/storybook-static",
);
const OUT_DIR = join(import.meta.dirname, "../docs/screenshots/issue-195");

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
};

const STORIES = [
  ["features-kg-kgimpactpreview--low", "kg-impact-low"],
  ["features-kg-kgimpactpreview--mid", "kg-impact-mid"],
  ["features-kg-kgimpactpreview--critical", "kg-impact-critical"],
  ["composites-confirmdialog--typed-confirm", "confirm-dialog-typed"],
];

const THEMES = ["light", "dark"];

async function serve(port) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, "http://localhost:" + port);
      let filePath = join(STORYBOOK_DIR, url.pathname);
      if (url.pathname.endsWith("/")) filePath = join(filePath, "index.html");
      try {
        const data = await readFile(filePath);
        const ext = extname(filePath);
        res.writeHead(200, {
          "Content-Type": MIME[ext] || "application/octet-stream",
        });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
    });
    server.listen(port, () => resolve(server));
  });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const PORT = 9223;
  const server = await serve(PORT);
  console.log("Serving storybook-static on http://localhost:" + PORT);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 720, height: 720 },
    deviceScaleFactor: 2,
  });

  let captured = 0;
  let failed = 0;

  for (const [storyId, filename] of STORIES) {
    for (const theme of THEMES) {
      const outfile = filename + "-" + theme + ".png";
      const url =
        "http://localhost:" +
        PORT +
        "/iframe.html?id=" +
        storyId +
        "&viewMode=story";
      const page = await context.newPage();

      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });

        // Force theme by toggling the `dark` class on the preview frame.
        await page.evaluate((mode) => {
          const frame = document.querySelector(".sb-preview-frame");
          if (frame) {
            frame.classList.toggle("dark", mode === "dark");
          }
        }, theme);

        // Dialog portals render at body level, not inside the preview frame,
        // so mirror the theme class onto body + html for the portal children.
        await page.evaluate((mode) => {
          document.body.classList.toggle("dark", mode === "dark");
          document.documentElement.classList.toggle("dark", mode === "dark");
        }, theme);

        await page.waitForTimeout(400);

        await page.screenshot({
          path: join(OUT_DIR, outfile),
          fullPage: false,
        });
        console.log("✓ " + outfile);
        captured++;
      } catch (err) {
        console.error("✗ " + outfile + ": " + err.message);
        failed++;
      } finally {
        await page.close();
      }
    }
  }

  await browser.close();
  server.close();

  console.log("\nDone: " + captured + " captured, " + failed + " failed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
