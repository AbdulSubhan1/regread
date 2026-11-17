import type { Instrumentation } from "next";

// Every uncaught server error goes to Pulse, with no code in each route. The message is cut short: it could quote a
// request, and RegRead never sends a card anywhere but the AI.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const { sendToPulse } = await import("@/lib/pulse/server");
  const message = (err instanceof Error ? `${err.name}: ${err.message}` : String(err)).slice(0, 300);
  const digest = typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : undefined;
  await sendToPulse({
    level: "error",
    message,
    path: request.path,
    context: { method: request.method, route: context.routePath, type: context.routeType, digest },
  });
};
