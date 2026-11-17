import { generateText, Output, type LanguageModel } from "ai";
import { getModel } from "@/lib/ai/model";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { ReadSchema } from "@/lib/ai/schema";
import type { RawRead } from "@/lib/profiles/types";

export type CardFile = { data: Uint8Array; mediaType: string };
export type ReadOptions = { model?: LanguageModel; signal?: AbortSignal };

/** Sends the card to the vision model. Throws when the model fails or its answer doesn't fit the shape. */
export async function readCard(file: CardFile, opts: ReadOptions = {}): Promise<RawRead> {
  const { output } = await generateText({
    model: opts.model ?? getModel(),
    system: buildSystemPrompt(),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Read this vehicle registration card." },
          { type: "file", mediaType: file.mediaType, data: file.data },
        ],
      },
    ],
    output: Output.object({ schema: ReadSchema }),
    maxRetries: 1,
    abortSignal: opts.signal,
  });
  return output;
}
