// Renders the made-up specimen cards to public/samples/<id>.jpg. Run with `npm run samples`.
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { SAMPLES } from "../samples/cards";

const root = path.join(__dirname, "..");
const out = path.join(root, "public", "samples");

const escape = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

async function main() {
  await mkdir(out, { recursive: true });
  const css = await readFile(path.join(root, "samples", "variants.css"), "utf8");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  for (const s of SAMPLES) {
    const template = await readFile(path.join(root, "samples", "templates", `${s.country.toLowerCase()}.html`), "utf8");
    const card = template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => escape(s.card[k] ?? ""));
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head>` +
        `<body class="variant-${s.variant}"><div id="stage">${card}</div></body></html>`,
    );
    await page.evaluate(() => document.fonts.ready);
    await page.locator("#stage").screenshot({ path: path.join(out, `${s.id}.jpg`), type: "jpeg", quality: 80 });
    console.log(`rendered ${s.id}`);
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
