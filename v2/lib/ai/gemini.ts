import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const apiKey = process.env.GEMINI_API_KEY;

export const geminiAvailable = Boolean(apiKey);

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first !== -1 && last > first) return raw.slice(first, last + 1);
  return raw.trim();
}

/**
 * Ask Gemini for a JSON object and validate it against a Zod schema.
 * One repair retry on parse/validation failure. Optional Google Search grounding.
 */
export async function generateStructured<T>(opts: {
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  image?: { mimeType: string; data: string };
  grounding?: boolean;
  temperature?: number;
}): Promise<{ data: T; grounded: boolean }> {
  const ai = getClient();
  const parts: Part[] = [];
  if (opts.image) parts.push({ inlineData: opts.image });
  parts.push({ text: opts.prompt });

  const config: Record<string, unknown> = {
    systemInstruction: opts.system,
    temperature: opts.temperature ?? 0.2,
    responseMimeType: "application/json",
  };
  if (opts.grounding) config.tools = [{ googleSearch: {} }];

  const call = async (extra?: string) => {
    const p = extra ? [...parts, { text: extra }] : parts;
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: p }],
      config,
    });
    return res.text ?? "";
  };

  let raw = await call();
  let parsed = opts.schema.safeParse(safeJson(extractJson(raw)));

  if (!parsed.success) {
    raw = await call(
      `Your previous reply did not match the required schema (${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}). Reply again with ONLY valid JSON matching the schema.`,
    );
    parsed = opts.schema.safeParse(safeJson(extractJson(raw)));
  }

  if (!parsed.success) {
    throw new Error(`Gemini structured output failed validation: ${parsed.error.message}`);
  }

  return { data: parsed.data, grounded: Boolean(opts.grounding) };
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
