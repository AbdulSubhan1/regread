import { createHmac } from "node:crypto";

/**
 * A visitor is a keyed hash of their IP. With a secret salt the hash can't be reversed by trying all IPv4
 * addresses, and the raw IP is never stored.
 */
export function visitorId(headers: Headers, salt = process.env.VISITOR_SALT): string {
  if (!salt) {
    if (process.env.NODE_ENV === "production") throw new Error("Set VISITOR_SALT: visitor ids need a secret salt");
    salt = "local-dev";
  }
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return createHmac("sha256", salt).update(networkOf(ip)).digest("hex").slice(0, 32);
}

/**
 * The address that counts as one visitor. An IPv6 home or phone gets a whole /64 block and can pick a new address in
 * it at will, so IPv6 counts by its first four groups.
 */
function networkOf(ip: string): string {
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return mapped[1];
  if (!ip.includes(":")) return ip;
  const [head, tail = ""] = ip.toLowerCase().split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right];
  return groups
    .slice(0, 4)
    .map((g) => g.replace(/^0+(?=.)/, ""))
    .join(":");
}
