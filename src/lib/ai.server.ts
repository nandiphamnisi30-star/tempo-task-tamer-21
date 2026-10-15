import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output, NoObjectGeneratedError, APICallError } from "ai";
import type { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";
const RUN_ID = "X-Lovable-AIG-Run-ID";

function createProvider() {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured yet. Please try again later.");
  let runId: string | undefined;
  return createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(RUN_ID)) headers.set(RUN_ID, runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get(RUN_ID)?.trim() || undefined;
      return res;
    },
  });
}

const providerOptions = {
  openai: {
    store: false,
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    include: ["reasoning.encrypted_content"],
  },
} as const;

function friendly(err: unknown): Error {
  if (APICallError.isInstance(err)) {
    const s = err.statusCode;
    if (s === 429) return new Error("Too many requests right now. Please wait a moment and try again.");
    if (s === 402) return new Error("AI credits have run out for this workspace. Please add credits to continue.");
    if (s === 403) return new Error("AI access is currently blocked for this workspace.");
    if (s && s >= 500) return new Error("The AI service is temporarily unavailable. Please try again shortly.");
  }
  if (err instanceof Error) return err;
  return new Error("Something went wrong with the AI request.");
}

export async function aiText(instructions: string, prompt: string): Promise<string> {
  try {
    const result = streamText({
      model: createProvider().responses(MODEL),
      instructions,
      prompt,
      providerOptions,
    });
    const text = (await result.text).trim();
    if (!text) throw new Error("The AI returned an empty response. Try adding more detail.");
    return text;
  } catch (e) {
    throw friendly(e);
  }
}

export async function aiObject<T>(schema: z.ZodType<T>, instructions: string, prompt: string): Promise<T> {
  try {
    const result = streamText({
      model: createProvider().responses(MODEL),
      instructions,
      prompt,
      output: Output.object({ schema }),
      providerOptions,
    });
    return (await result.output) as T;
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) {
      throw new Error("The AI response couldn't be read. Please try again.");
    }
    throw friendly(e);
  }
}
