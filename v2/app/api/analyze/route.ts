import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline/run";
import { CASES } from "@/eval/cases";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Dev preview: run the pipeline from an eval fixture instead of a photo.
 * Everything downstream of identification is the real thing — the same path
 * CI exercises. Disabled in production.
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not available" }, { status: 404 });
  }

  const id = req.nextUrl.searchParams.get("demo");
  if (!id) {
    return NextResponse.json({ cases: CASES.map((c) => ({ id: c.id, label: c.label, trap: c.trap })) });
  }

  const c = CASES.find((x) => x.id === id);
  if (!c) return NextResponse.json({ error: `unknown demo case "${id}"` }, { status: 404 });

  try {
    const result = await runPipeline({ identification: c.fixture });
    return NextResponse.json({ ...result, degraded: [...result.degraded, "fixture_identification"] });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("image");
    const latRaw = form.get("lat");
    const lngRaw = form.get("lng");

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "image file is required" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "image too large (max 8MB)" }, { status: 413 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "image/jpeg";

    const coords =
      latRaw && lngRaw ? ([Number(latRaw), Number(lngRaw)] as [number, number]) : undefined;

    const result = await runPipeline({
      image: { mimeType, data: buf.toString("base64") },
      coords: coords && coords.every(Number.isFinite) ? coords : undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[analyze] error", err);
    const message = err instanceof Error ? err.message : "analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
