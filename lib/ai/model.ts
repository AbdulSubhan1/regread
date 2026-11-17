import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

type Env = Record<string, string | undefined>;

// One place decides the AI. Switch provider or model with AI_PROVIDER and AI_MODEL; no code change.
// Adding a provider is one line here plus its @ai-sdk package.
const PROVIDERS: Record<string, (env: Env) => (modelId: string) => LanguageModel> = {
  google: (env) => createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY }),
};

export function getModel(env: Env = process.env): LanguageModel {
  const name = env.AI_PROVIDER ?? "google";
  const provider = PROVIDERS[name];
  if (!provider) throw new Error(`Unknown AI_PROVIDER "${name}". Use one of: ${Object.keys(PROVIDERS).join(", ")}`);
  if (!env.AI_MODEL) throw new Error("Set AI_MODEL to a model id for the chosen AI_PROVIDER");
  return provider(env)(env.AI_MODEL);
}
