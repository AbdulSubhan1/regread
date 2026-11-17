import { expect, test } from "vitest";
import { pdfPageCount, sniffType } from "./file-check";

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));

test("the first bytes tell JPEG, PNG, WebP and PDF apart", () => {
  expect(sniffType(bytes([0xff, 0xd8, 0xff, 0xe0], "rest"))).toBe("image/jpeg");
  expect(sniffType(bytes([0x89], "PNG", [0x0d, 0x0a, 0x1a, 0x0a], "rest"))).toBe("image/png");
  expect(sniffType(bytes("RIFF", [1, 2, 3, 4], "WEBPVP8 "))).toBe("image/webp");
  expect(sniffType(bytes("%PDF-1.7\n"))).toBe("application/pdf");
});

test("anything else, or a file too short to tell, is unknown", () => {
  expect(sniffType(bytes("<html><script>"))).toBeNull();
  expect(sniffType(bytes("RIFF", [1, 2, 3, 4], "WAVEfmt "))).toBeNull();
  expect(sniffType(bytes([0xff, 0xd8]))).toBeNull();
  expect(sniffType(new Uint8Array())).toBeNull();
});

const pdf = (pages: number, count = pages) =>
  bytes(
    "%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    `2 0 obj << /Type /Pages /Kids [] /Count ${count} >> endobj\n`,
    ...Array.from({ length: pages }, (_, i) => `${i + 3} 0 obj << /Type/Page /Parent 2 0 R >> endobj\n`),
  );

test("a PDF's pages are counted from its page objects, not its /Pages tree node", () => {
  expect(pdfPageCount(pdf(1))).toBe(1);
  expect(pdfPageCount(pdf(3))).toBe(3);
});

test("a /Count larger than the page objects found wins, so hidden pages still count", () => {
  expect(pdfPageCount(pdf(1, 40))).toBe(40);
});
