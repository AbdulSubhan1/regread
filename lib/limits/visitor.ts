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
  return createHmac("sha256", salt).update(ip).digest("hex").slice(0, 32);
}
