import { IdentificationSchema, type Identification, CATEGORIES, CONDITIONS } from "@/schemas/analysis";
import { generateStructured } from "./gemini";

const CONFIDENCE_FLOOR = 0.55;

const SYSTEM = `You are the identification stage of WasteWise, a waste-triage assistant for India.
You look at a photo of something the user is about to throw away and describe it factually.
You do NOT give advice. You do NOT guess when unsure — set a low confidence and ask ONE clarifying question.
Be especially careful to flag hazards: lithium/rechargeable batteries, corrosive chemicals, sharp/rusted edges,
pressurised cans, mercury lamps (CFL/tube), medicines, mould/rot.`;

const PROMPT = `Identify the item in the image. Reply with ONLY a JSON object of this exact shape:
{
  "category": one of ${JSON.stringify(CATEGORIES)},
  "item": "short plain name",
  "brand": "optional",
  "materials": ["..."],
  "condition": one of ${JSON.stringify(CONDITIONS)},
  "expiry_signals": ["visible cues like mould, rust, leak, swelling, printed date"],
  "hazards": ["lithium", "corrosive", "sharp", "pressurised", "mercury", "biohazard", ...],
  "confidence": 0.0-1.0,
  "clarifying_question": "only if confidence < 0.6, otherwise omit"
}`;

export async function identifyImage(image: { mimeType: string; data: string }): Promise<{
  identification: Identification;
  needsClarification: boolean;
}> {
  const { data } = await generateStructured({
    schema: IdentificationSchema,
    system: SYSTEM,
    prompt: PROMPT,
    image,
    temperature: 0.1,
  });

  const needsClarification = data.confidence < CONFIDENCE_FLOOR || Boolean(data.clarifying_question && data.confidence < 0.65);
  return { identification: data, needsClarification };
}
