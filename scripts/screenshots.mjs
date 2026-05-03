import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "..", "docs", "screenshots");
await mkdir(outDir, { recursive: true });

const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";

const launchOptions = { args: ["--no-sandbox"] };
if (process.env.CHROMIUM_PATH) {
  launchOptions.executablePath = process.env.CHROMIUM_PATH;
}
const browser = await chromium.launch(launchOptions);
const context = await browser.newContext({
  viewport: { width: 1280, height: 1500 },
  deviceScaleFactor: 2,
  locale: "fr-FR",
  timezoneId: "Europe/Paris",
});
const page = await context.newPage();

async function shoot(path, file, opts = {}) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: resolve(outDir, file),
    fullPage: opts.fullPage ?? true,
    omitBackground: opts.omitBackground ?? false,
  });
  console.log(`✓ ${file}`);
}

// Manager screens (full-page, with chrome)
await shoot("/", "manager-home.png");
await shoot("/embeds", "embeds-page.png");

// Tight crops for the embed widgets
await context.close();

const widgetContext = await browser.newContext({
  viewport: { width: 480, height: 200 },
  deviceScaleFactor: 2,
  locale: "fr-FR",
  timezoneId: "Europe/Paris",
});
const widgetPage = await widgetContext.newPage();

async function shootWidget(path, file, viewport) {
  await widgetPage.setViewportSize(viewport);
  await widgetPage.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await widgetPage.waitForTimeout(400);
  await widgetPage.screenshot({
    path: resolve(outDir, file),
    fullPage: false,
    omitBackground: false,
  });
  console.log(`✓ ${file}`);
}

await shootWidget("/embed/badge", "widget-badge.png", { width: 360, height: 70 });
await shootWidget(
  "/embed/badge-holidays",
  "widget-badge-holidays.png",
  { width: 460, height: 110 },
);

await browser.close();
console.log("Done.");
