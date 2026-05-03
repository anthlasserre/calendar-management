import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "..", "docs", "screenshots");
await mkdir(outDir, { recursive: true });

const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const SESSION_COOKIE_NAME =
  process.env.SCREENSHOT_SESSION_COOKIE ?? "authjs.session-token";
const SESSION_TOKEN = process.env.SCREENSHOT_SESSION_TOKEN;
const COMPANY_SLUG = process.env.SCREENSHOT_COMPANY_SLUG ?? "acme-wbisd";

const launchOptions = { args: ["--no-sandbox"] };
if (process.env.CHROMIUM_PATH) {
  launchOptions.executablePath = process.env.CHROMIUM_PATH;
}
const browser = await chromium.launch(launchOptions);

const baseUrl = new URL(BASE);
const cookieDomain = baseUrl.hostname;

const context = await browser.newContext({
  viewport: { width: 1280, height: 1500 },
  deviceScaleFactor: 2,
  locale: "fr-FR",
  timezoneId: "Europe/Paris",
});

if (SESSION_TOKEN) {
  await context.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: SESSION_TOKEN,
      domain: cookieDomain,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

const page = await context.newPage();

async function shoot(path, file, opts = {}) {
  if (opts.viewport) await page.setViewportSize(opts.viewport);
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: resolve(outDir, file),
    fullPage: opts.fullPage ?? true,
  });
  console.log(`✓ ${file}`);
}

// Manager screens (require an authenticated session cookie)
if (SESSION_TOKEN) {
  await shoot("/", "manager-home.png");
  await shoot("/embeds", "embeds-page.png");
  await shoot("/settings", "settings-page.png", {
    viewport: { width: 1280, height: 700 },
    fullPage: false,
  });
} else {
  console.log("⚠ SCREENSHOT_SESSION_TOKEN absent — skipping manager screens.");
}

// Sign-in page (no auth required)
await page.context().clearCookies();
await shoot("/sign-in", "sign-in-page.png", {
  viewport: { width: 720, height: 540 },
  fullPage: false,
});

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
  });
  console.log(`✓ ${file}`);
}

await shootWidget(
  `/c/${COMPANY_SLUG}/embed/badge`,
  "widget-badge.png",
  { width: 360, height: 70 },
);
await shootWidget(
  `/c/${COMPANY_SLUG}/embed/badge-holidays`,
  "widget-badge-holidays.png",
  { width: 460, height: 110 },
);

await browser.close();
console.log("Done.");
