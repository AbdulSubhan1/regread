// Runs the real scan (model + profile checks) on every sample card and writes docs/accuracy.md.
// Run by hand: `npm run measure`. Costs 16 free-tier AI calls.
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { FIELDS, type FieldName } from "../lib/profiles/types";
import { readSampleFile } from "../lib/scan/samples-server";
import { scanCard } from "../lib/scan/scan-card";
import { SAMPLES } from "../samples/cards";
import type { Sample } from "../samples/types";

process.loadEnvFile(path.join(__dirname, "..", ".env.local"));

const GAP_MS = 5000; // stay under the free tier's requests-per-minute
const same = (a: string | null, b: string | null) =>
  (a ?? "").replace(/\s+/g, " ").trim().toUpperCase() === (b ?? "").replace(/\s+/g, " ").trim().toUpperCase();
const pct = (ok: number, all: number) => `${Math.round((ok / all) * 100)}% (${ok}/${all})`;

type Row = { sample: Sample; got: Record<FieldName, string | null> | null; country: string | null };

async function main() {
  const rows: Row[] = [];
  for (const sample of SAMPLES) {
    const file = await readSampleFile(sample.id);
    try {
      const result = await scanCard(file!);
      rows.push({
        sample,
        country: result.country,
        got: Object.fromEntries(FIELDS.map((f) => [f, result.fields[f].value])) as Record<FieldName, string | null>,
      });
      console.log(`read ${sample.id}`);
    } catch {
      rows.push({ sample, got: null, country: null });
      console.log(`failed ${sample.id}`);
    }
    await new Promise((r) => setTimeout(r, GAP_MS));
  }

  const correct = (r: Row, f: FieldName) => r.got !== null && same(r.got[f], r.sample.truth[f]);
  const group = <K extends string>(key: (r: Row) => K) => {
    const out = new Map<K, Row[]>();
    for (const r of rows) out.set(key(r), [...(out.get(key(r)) ?? []), r]);
    return out;
  };
  const fieldsRight = (rs: Row[]) => rs.reduce((n, r) => n + FIELDS.filter((f) => correct(r, f)).length, 0);
  const total = fieldsRight(rows);

  const lines = [
    "# Accuracy on the sample cards",
    "",
    `Model: \`${process.env.AI_PROVIDER ?? "google"} / ${process.env.AI_MODEL}\` · measured ${new Date().toISOString().slice(0, 10)} · ${rows.length} made-up cards, ${FIELDS.length} fields each.`,
    "",
    "A field counts as right when the value after the profile checks matches the ground truth (ignoring case and spaces). A field that is blank on the card counts as right when it comes back empty. Re-run with `npm run measure`.",
    "",
    `**Overall: ${pct(total, rows.length * FIELDS.length)} of fields right. Country detected: ${pct(rows.filter((r) => r.country === r.sample.country).length, rows.length)}.**`,
    "",
    "## By country",
    "",
    "| Country | Fields right |",
    "| --- | --- |",
    ...[...group((r) => r.sample.country)].map(
      ([c, rs]) => `| ${c} | ${pct(fieldsRight(rs), rs.length * FIELDS.length)} |`,
    ),
    "",
    "## By photo quality",
    "",
    "| Variant | Fields right |",
    "| --- | --- |",
    ...[...group((r) => r.sample.variant)].map(
      ([v, rs]) => `| ${v} | ${pct(fieldsRight(rs), rs.length * FIELDS.length)} |`,
    ),
    "",
    "## By field",
    "",
    "| Field | Right |",
    "| --- | --- |",
    ...FIELDS.map((f) => `| ${f} | ${pct(rows.filter((r) => correct(r, f)).length, rows.length)} |`),
    "",
    "## Misses",
    "",
    ...(total === rows.length * FIELDS.length
      ? ["None on this run."]
      : ["| Sample | Field | Expected | Got |", "| --- | --- | --- | --- |"]),
    ...rows.flatMap((r) =>
      FIELDS.filter((f) => !correct(r, f)).map(
        (f) =>
          `| ${r.sample.id} | ${f} | ${r.sample.truth[f] ?? "(blank)"} | ${r.got ? (r.got[f] ?? "(empty)") : "(AI failed)"} |`,
      ),
    ),
    "",
    "## What this does and doesn't show",
    "",
    "These are made-up cards rendered from HTML: sharp text, plain layouts and standard fonts, even in the blurry, tilted and screen-photo versions. Real cards are worn, laminated, photographed in bad light and laid out in ways the model hasn't seen here, so real-world accuracy will be lower. That is why every value goes through the country rules, low-confidence values are marked, and nothing is used before the visitor confirms.",
    "",
  ];
  await writeFile(path.join(__dirname, "..", "docs", "accuracy.md"), lines.join("\n"));
  console.log(`overall ${pct(total, rows.length * FIELDS.length)}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : "failed");
  process.exit(1);
});
